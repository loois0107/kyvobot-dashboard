import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ [CRITICAL] URL OR KEY IS NULL IN SERVER");
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guild_id = searchParams.get('guild_id');

  const blocked = await requireGuildAdmin(guild_id);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  try {
    // ✨ [구조 교정] 존재하지 않는 단독 컬럼 대신 'settings' JSON 주머니를 통째로 조회합니다.
    const { data, error } = await supabase
      .from('guild_settings')
      .select('settings')
      .eq('guild_id', guild_id)
      .maybeSingle();

    if (error) {
      console.error("🚨 [SUPABASE ENGINE ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ✨ [데이터 안전 파싱] 주머니 안에 든 설정을 안전하게 꺼내고, 없으면 기본 디폴트값을 쥐어줍니다.
    const botSettings = data?.settings || {};
    const payload = {
      leveling_settings: botSettings.leveling_settings || { xp_rate: 1.0, blacklisted_channels: [], role_rewards: {} },
      economy_settings: botSettings.economy_settings || { currency_name: 'Points', min_bet: 10, shop_items: [] }
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("🚨 [RUNTIME EXCEPTION]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guild_id, leveling_settings, economy_settings } = body;

    const blocked = await requireGuildAdmin(guild_id);
    if (blocked) return blocked;

    const supabase = connectSupabase();
    if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

    // ✨ [데이터 파괴 방지] 다른 모듈(안티누크, 티켓 등)의 설정을 지우지 않기 위해 기존 settings 데이터를 먼저 긁어옵니다.
    const { data: currentData } = await supabase
      .from('guild_settings')
      .select('settings')
      .eq('guild_id', guild_id)
      .maybeSingle();

    const currentSettings = currentData?.settings || {};

    // 기존 데이터 뼈대 위에 대시보드에서 새로 수정한 레벨/경제 설정만 쏙 덮어씌웁니다.
    const updatedSettings = {
      ...currentSettings,
      leveling_settings: leveling_settings || currentSettings.leveling_settings || { xp_rate: 1.0, blacklisted_channels: [], role_rewards: {} },
      economy_settings: economy_settings || currentSettings.economy_settings || { currency_name: 'Points', min_bet: 10, shop_items: [] }
    };

    // ✨ [구조 교정] 올바른 컬럼 매트릭스 명칭인 'settings' 에 병합된 데이터를 안전하게 인젝션합니다.
    const { data, error } = await supabase
      .from('guild_settings')
      .upsert({ guild_id, settings: updatedSettings })
      .select();

    if (error) {
      console.error("🚨 [SUPABASE INJECTION ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("🚨 [POST RUNTIME EXCEPTION]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
