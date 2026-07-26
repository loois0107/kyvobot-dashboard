import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidateGuildSettings } from "@/lib/redis";
import { requireGuildAdministrator } from "@/lib/auth";
import { validateCustomCommands } from "@/lib/customCommandsSettings";

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

/**
 * Whitelist of columns allowed to be updated in the database.
 * 🛡️ automod_enabled/spam_limit/spam_interval/log_channel_id/banned_words는 이전에 guild_settings의
 * 실제 컬럼으로 존재하는 줄 알고 여기 올라와 있었지만, 직접 조회로 그런 컬럼이 없는 걸 확인했다
 * (welcome_settings/moderator_id 때와 같은 패턴). 이 필드들을 보내는 UI가 아직 없어서 지금까지는
 * 조용히 무해했지만, 실제 컬럼이 생기기 전까지는 화이트리스트에 다시 올리지 말 것.
 */
const ALLOWED_FIELDS = [
  "language",
  "custom_commands", // Redis 캐시 무임승차를 위해 커스텀 명령어 객체 필드 유지
] as const;

/** Extracts only whitelisted fields from the request body to prevent Mass Assignment attacks. */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) clean[field] = body[field];
  }
  return clean;
}

// ══════════════════════════════════════════════════════════
//  GET — 로딩 시 언어 및 커스텀 명령어 통합 패키지 다운로드
// ══════════════════════════════════════════════════════════
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;

  try {
    if (!/^\d{17,20}$/.test(guildId)) {
      return NextResponse.json({ error: "Invalid server ID." }, { status: 400 });
    }

    // 🛡️ 봇의 /cc_add·/cc_delete는 has_permissions(administrator=True)를 요구한다 - 서버 관리
    // 권한만 있고 관리자 권한은 없는 유저가 슬래시 커맨드로는 매크로를 못 만드는데 대시보드로는
    // 만들 수 있는 구멍을 막기 위해 이 라우트도 동일한 기준(requireGuildAdministrator)을 쓴다.
    const blocked = await requireGuildAdministrator(guildId);
    if (blocked) return blocked;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("guild_settings")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle(); // ⚡ [클로드 지적 반영] .maybe_single() 오타를 .maybeSingle()로 완벽 수정!

    if (error) {
      console.error("[SETTINGS][GET][ERROR] Supabase fetch failed:", error);
      return NextResponse.json({ error: "Failed to fetch settings matrix." }, { status: 500 });
    }

    const safeData = data || { language: 'en', custom_commands: {} };

    return NextResponse.json({ ok: true, settings: safeData });
  } catch (err) {
    console.error("[SETTINGS][GET][FATAL] Unexpected infrastructure crash:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════
//  POST — 언어 설정 및 명령어 객체를 안전하게 Upsert 후 Redis 캐시 폭파
// ══════════════════════════════════════════════════════════
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;

  try {
    if (!/^\d{17,20}$/.test(guildId)) {
      return NextResponse.json({ error: "Invalid server ID." }, { status: 400 });
    }

    const blocked = await requireGuildAdministrator(guildId);
    if (blocked) return blocked;

    const settings = sanitizeBody(await req.json());
    if (Object.keys(settings).length === 0) {
      return NextResponse.json({ error: "No valid settings to update." }, { status: 400 });
    }

    // 🛡️ "조용히 범위 밖 값을 허용하지 않는다" 원칙 - 매크로 개수/트리거 길이/응답 길이(디스코드
    // 2,000자 제한) 전부 지금까지 검증이 없었다. custom_commands가 이번 요청에 실려온 경우에만 검사한다.
    if ("custom_commands" in settings) {
      const validation = validateCustomCommands(settings.custom_commands as Record<string, unknown>);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.errors!.join(' ') }, { status: 400 });
      }
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("guild_settings")
      .upsert({ guild_id: guildId, ...settings }, { onConflict: "guild_id" });

    if (error) {
      console.error("[SETTINGS][ERROR] Supabase upsert failed:", error);
      return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
    }

    await invalidateGuildSettings(guildId);

    return NextResponse.json({ ok: true, message: "Settings successfully updated." });
  } catch (err) {
    console.error("[SETTINGS][ERROR] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}