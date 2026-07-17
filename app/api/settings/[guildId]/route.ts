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
] as const;

/** Extracts only whitelisted fields from the request body to prevent Mass Assignment attacks. */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) clean[field] = body[field];
  }
  return clean;
}

// 🌐 [클로드 제안 반영] 설정 데이터를 안전하게 읽어오는 GET 핸들러 엔진 장착
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;

  try {
    // 0) 디스코드 스노우플레이크 포맷 검증
    if (!/^\d{17,20}$/.test(guildId)) {
      return NextResponse.json({ error: "Invalid server ID." }, { status: 400 });
    }

    // 1) 🔐 Auth.js 세션 기반 최고 관리자 권한 검증
    if (!(await verifyGuildAdmin(guildId))) {
      return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 403 });
    }

    // 2) Supabase에서 원본 설정 데이터 추출
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("guild_settings")
      .select("*")
      .eq("guild_id", guildId)
      .maybe_single();

    if (error) {
      console.error("[SETTINGS][GET][ERROR] Supabase fetch failed:", error);
      return NextResponse.json({ error: "Failed to fetch settings matrix." }, { status: 500 });
    }

    // 3) 규격에 맞게 매핑하여 프론트엔드로 반환 ({ ok: true, settings: data })
    return NextResponse.json({ ok: true, settings: data || { language: 'en' } });
  } catch (err) {
    console.error("[SETTINGS][GET][FATAL] Unexpected infrastructure crash:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// 💾 기존에 검증 완료된 POST 핸들러 (유지)
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
      console.warn(`[SETTINGS][WARN] Unauthorized access blocked: guild=${guildId}`);
      return NextResponse.json(
        { error: "Unauthorized. You do not have permission to manage this server." },
        { status: 403 }
      );
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