import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLogin, requireGuildMembership } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 로그인한 유저 본인의 포인트 잔액 + 이 서버의 상점 아이템 목록을 반환한다.
 * 읽기 전용이라 봇 웹훅을 거치지 않고 대시보드가 직접 읽는다 - 실제 포인트 차감(구매)만
 * buy/route.ts를 통해 봇에 위임한다. user_id는 세션에서만 가져온다(party-history와 동일한
 * IDOR 방지 패턴).
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const [userRes, settingsRes] = await Promise.all([
    supabase.from('users').select('points, inventory').eq('user_id', userId).eq('guild_id', guildId).maybeSingle(),
    supabase.from('guild_settings').select('settings').eq('guild_id', guildId).maybeSingle(),
  ]);

  if (userRes.error) {
    console.error('[SHOP][ERROR]', userRes.error);
    return NextResponse.json({ status: 'error', message: userRes.error.message }, { status: 500 });
  }
  if (settingsRes.error) {
    console.error('[SHOP][ERROR]', settingsRes.error);
    return NextResponse.json({ status: 'error', message: settingsRes.error.message }, { status: 500 });
  }

  const economySettings = settingsRes.data?.settings?.economy_settings || { currency_name: 'Points', shop_items: [] };

  // 🛡️ [방어적 읽기] cogs/economy.py의 shop_view와 동일한 정신 - 필드명이 안 맞는 항목이 섞여
  // 있어도 목록 전체가 죽지 않게 한다. name이 없는 항목은 클릭해도 buy가 item_not_found로
  // 거부하므로 여기서 완전히 걸러내지 않고 표시만 안전하게 한다.
  const rawShopItems = Array.isArray(economySettings.shop_items) ? economySettings.shop_items : [];
  const shopItems = rawShopItems
    .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
    .map((item: any) => ({
      name: item.name,
      price: typeof item.price === 'number' ? item.price : null,
      description: typeof item.description === 'string' ? item.description : '',
    }));

  return NextResponse.json({
    status: 'success',
    points: userRes.data?.points ?? 0,
    currency_name: economySettings.currency_name || 'Points',
    inventory: Array.isArray(userRes.data?.inventory) ? userRes.data.inventory : [],
    shop_items: shopItems,
  });
}
