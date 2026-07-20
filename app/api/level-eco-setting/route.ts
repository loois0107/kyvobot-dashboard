import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { invalidateGuildSettings } from '@/lib/redis';

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
    // ✨ [구조 교정] 존재하지 않는 단독 컬럼 대신 'settings' JSON 주머니 + 최상위 welcome_settings 컬럼을 함께 조회합니다.
    const { data, error } = await supabase
      .from('guild_settings')
      .select('settings, welcome_settings')
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
      economy_settings: botSettings.economy_settings || { currency_name: 'Points', min_bet: 10, shop_items: [] },
      // 🛡️ goodbye_*는 봇(welcome.py)이 settings JSON 내부에서 읽으므로 여기서도 같은 위치에서 꺼낸다.
      goodbye_enabled: botSettings.goodbye_enabled ?? false,
      goodbye_channel_id: botSettings.goodbye_channel_id ?? null,
      // 🛡️ welcome_settings는 봇이 최상위 컬럼으로 직접 select하는 값이라 settings JSON과 분리해서 그대로 내려준다.
      welcome_settings: data?.welcome_settings || {},
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
    const {
      guild_id,
      leveling_settings,
      economy_settings,
      goodbye_enabled,
      goodbye_channel_id,
      welcome_settings,
    } = body;

    const blocked = await requireGuildAdmin(guild_id);
    if (blocked) return blocked;

    const supabase = connectSupabase();
    if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

    // ✨ [데이터 파괴 방지] 다른 모듈(안티누크, 티켓 등)의 설정을 지우지 않기 위해 기존 settings + welcome_settings를 먼저 긁어옵니다.
    const { data: currentData } = await supabase
      .from('guild_settings')
      .select('settings, welcome_settings')
      .eq('guild_id', guild_id)
      .maybeSingle();

    const currentSettings = currentData?.settings || {};

    // 🛡️ settings JSON 내부 병합 - leveling/economy/goodbye가 서로의 값을 안 지우도록 기존 값을 spread한 뒤
    // 이번 요청에 실제로 실려온 필드만 덮어쓴다. goodbye_enabled는 boolean이라 `||`로 하면 false를 못 보내므로
    // undefined 여부로 판별한다 (leveling/economy_settings는 객체라 `||`로도 안전).
    const updatedSettings = {
      ...currentSettings,
      leveling_settings: leveling_settings || currentSettings.leveling_settings || { xp_rate: 1.0, blacklisted_channels: [], role_rewards: {} },
      economy_settings: economy_settings || currentSettings.economy_settings || { currency_name: 'Points', min_bet: 10, shop_items: [] },
      goodbye_enabled: goodbye_enabled !== undefined ? Boolean(goodbye_enabled) : (currentSettings.goodbye_enabled ?? false),
      goodbye_channel_id: goodbye_channel_id !== undefined ? goodbye_channel_id : (currentSettings.goodbye_channel_id ?? null),
    };

    // 🛡️ welcome_settings는 settings JSON과 별개인 최상위 컬럼 (봇의 welcome.py가 select("welcome_settings")로 직접 읽음).
    // 이번 요청이 안 보냈으면 기존 값을 그대로 유지해서, 레벨/이코노미 페이지가 저장할 때 웰컴 카드 설정을 안 날린다.
    const updatedWelcomeSettings = welcome_settings !== undefined ? welcome_settings : (currentData?.welcome_settings ?? {});

    // ✨ [구조 교정] 올바른 컬럼 매트릭스 명칭인 'settings'와 'welcome_settings' 각각에 병합된 데이터를 안전하게 인젝션합니다.
    const { data, error } = await supabase
      .from('guild_settings')
      .upsert({ guild_id, settings: updatedSettings, welcome_settings: updatedWelcomeSettings })
      .select();

    if (error) {
      console.error("🚨 [SUPABASE INJECTION ERROR]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🛡️ 저장 성공 후 봇의 Redis Cache-Aside 캐시를 무효화해야, TTL(최대 5분)을 기다리지 않고 바로 반영된다.
    await invalidateGuildSettings(String(guild_id));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("🚨 [POST RUNTIME EXCEPTION]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
