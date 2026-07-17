import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidateGuildSettings } from "@/lib/redis";
import { verifyGuildAdmin } from "@/lib/auth";

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

/** Whitelist of columns allowed to be updated in the database. */
const ALLOWED_FIELDS = [
  "automod_enabled",
  "spam_limit",
  "spam_interval",
  "log_channel_id",
  "banned_words",
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

    if (!(await verifyGuildAdmin(guildId))) {
      return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 403 });
    }

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

    if (!(await verifyGuildAdmin(guildId))) {
      return NextResponse.json({ error: "Unauthorized. Permission denied." }, { status: 403 });
    }

    const settings = sanitizeBody(await req.json());
    if (Object.keys(settings).length === 0) {
      return NextResponse.json({ error: "No valid settings to update." }, { status: 400 });
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