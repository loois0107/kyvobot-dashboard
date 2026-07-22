import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireGuildAdmin } from "@/lib/auth";
import { invalidateGuildSettings } from "@/lib/redis";

export const dynamic = "force-dynamic";

/** Creates a server-only Supabase client on demand to prevent build-time crashes. */
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[SUPABASE][ERROR] Missing Supabase Environment Variables on Server!");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// ══════════════════════════════════════════════════════════
//  GET — Join to Create 트리거 채널 설정 조회
// ══════════════════════════════════════════════════════════
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;

  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  try {
    const supabase = getSupabaseClient();
    // 🛡️ voice_settings는 최상위 컬럼이 아니라 welcome/leveling/economy와 동일하게
    // settings JSONB 안에 중첩된다 - 봇의 KyvoBaseCog.get_guild_settings()가 읽는 경로와
    // 물리적으로 같은 위치여야 저장 위치 불일치 버그가 재발하지 않는다.
    const { data, error } = await supabase
      .from("guild_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (error) {
      console.error("[VOICE-SETTINGS][GET][ERROR]", error);
      return NextResponse.json({ error: "Failed to fetch voice settings." }, { status: 500 });
    }

    const voiceSettings = data?.settings?.voice_settings || {};
    return NextResponse.json({
      ok: true,
      voice_settings: {
        trigger_channel_id: voiceSettings.trigger_channel_id ?? null,
      },
    });
  } catch (err) {
    console.error("[VOICE-SETTINGS][GET][FATAL]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════
//  POST — 트리거 채널 설정 저장 (settings JSONB 병합, 다른 모듈 설정은 보존)
// ══════════════════════════════════════════════════════════
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;

  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const triggerChannelId: string | null =
      typeof body.trigger_channel_id === "string" && body.trigger_channel_id.trim()
        ? body.trigger_channel_id.trim()
        : null;

    if (triggerChannelId !== null && !/^\d{17,20}$/.test(triggerChannelId)) {
      return NextResponse.json({ error: "Invalid channel ID format." }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 🛡️ [데이터 파괴 방지] 다른 모듈(welcome/leveling/economy 등)의 settings를 지우지 않기 위해
    // 기존 값을 먼저 긁어와서 voice_settings 키 하나만 덮어쓴다.
    const { data: currentData } = await supabase
      .from("guild_settings")
      .select("settings")
      .eq("guild_id", guildId)
      .maybeSingle();

    const currentSettings = currentData?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      voice_settings: { trigger_channel_id: triggerChannelId },
    };

    const { error } = await supabase
      .from("guild_settings")
      .upsert({ guild_id: guildId, settings: updatedSettings }, { onConflict: "guild_id" });

    if (error) {
      console.error("[VOICE-SETTINGS][POST][ERROR]", error);
      return NextResponse.json({ error: "Failed to save voice settings." }, { status: 500 });
    }

    // 🛡️ 저장 성공 후 봇의 Redis Cache-Aside 캐시를 무효화해야 TTL(최대 5분)을 기다리지 않고 바로 반영된다.
    await invalidateGuildSettings(guildId);

    return NextResponse.json({ ok: true, message: "Voice settings saved." });
  } catch (err) {
    console.error("[VOICE-SETTINGS][POST][FATAL]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
