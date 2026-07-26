import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { computeOnboardingState } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 이 서버의 온보딩 체크리스트 상태를 반환한다.
 *
 * guild_settings 행이 아예 없으면 - 승인된 규칙대로 "진짜 신규 서버"이므로 즉시
 * { onboarding_started: true } 마커를 남긴다. 이 마커가 없으면, 체크리스트 1번 항목만 저장해도
 * (그 저장 자체가 행을 만들어버리므로) "행 존재 = 신규 아님" 규칙에 걸려 배너가 너무 일찍
 * 사라진다 - 마커는 "이 서버는 온보딩 대상으로 확정됐다"를 별도로 기억해두는 용도.
 * 이미 예전부터 설정을 갖고 있던 기존 서버는 이 마커가 없으므로 절대 배너가 뜨지 않는다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data: row, error } = await supabase.from('guild_settings').select('settings').eq('guild_id', guildId).maybeSingle();
  if (error) {
    console.error('[ONBOARDING][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  let settings: Record<string, any> | null = row?.settings || null;

  if (!row) {
    settings = { onboarding_started: true };
    const { error: claimError } = await supabase
      .from('guild_settings')
      .upsert({ guild_id: guildId, settings }, { onConflict: 'guild_id' });
    if (claimError) {
      console.error('[ONBOARDING][ERROR] Failed to claim onboarding start marker:', claimError);
    }
  }

  const { count: presetsCount, error: presetsError } = await supabase
    .from('party_game_presets').select('game_name', { count: 'exact', head: true }).eq('guild_id', guildId);
  if (presetsError) {
    console.error('[ONBOARDING][ERROR]', presetsError);
  }

  const { showBanner, items } = computeOnboardingState(settings, presetsCount || 0);
  return NextResponse.json({ status: 'success', show_banner: showBanner, items });
}

/**
 * POST: { action: 'dismiss' } - 배너를 닫는다. 새 컬럼 없이 기존 settings JSON에 마커만 남긴다 -
 * 이미 없던 행이었다면 이 저장으로 행이 생기고, "행 존재 = 신규 아님" 규칙이 그대로 이어서
 * 재방문 시에도 배너를 계속 숨긴 채로 둔다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }
  if (body?.action !== 'dismiss') {
    return NextResponse.json({ status: 'error', message: "Only { action: 'dismiss' } is supported." }, { status: 400 });
  }

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data: currentData, error: fetchError } = await supabase
    .from('guild_settings').select('settings').eq('guild_id', guildId).maybeSingle();
  if (fetchError) {
    console.error('[ONBOARDING][ERROR]', fetchError);
    return NextResponse.json({ status: 'error', message: fetchError.message }, { status: 500 });
  }

  const updatedSettings = { ...(currentData?.settings || {}), onboarding_dismissed: true };
  const { error } = await supabase.from('guild_settings').upsert({ guild_id: guildId, settings: updatedSettings }, { onConflict: 'guild_id' });
  if (error) {
    console.error('[ONBOARDING][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success' });
}
