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

/** Whitelist of columns allowed to be updated in the database. Adjust according to the actual guild_settings schema. */
const ALLOWED_FIELDS = [
  "automod_enabled",
  "spam_limit",
  "spam_interval",
  "log_channel_id",
  "banned_words",
  "language", // ⚡ [중요] 대시보드에서 언어 설정을 저장할 수 있도록 화이트리스트에 추가
] as const;

/** Extracts only whitelisted fields from the request body to prevent Mass Assignment attacks. */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) clean[field] = body[field];
  }
  return clean;
}

// RouteContext is a global helper type, so no import is required.
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/settings/[guildId]">
) {
  const { guildId } = await ctx.params; // Next 16: params is a Promise

  try {
    // 0) Validate Discord Snowflake format
    if (!/^\d{17,20}$/.test(guildId)) {
      return NextResponse.json({ error: "Invalid server ID." }, { status: 400 });
    }

    // 1) 🔐 Permission Verification (Fail-Closed)
    if (!(await verifyGuildAdmin(guildId))) {
      console.warn(`[SETTINGS][WARN] Unauthorized access blocked: guild=${guildId}`);
      return NextResponse.json(
        { error: "Unauthorized. You do not have permission to manage this server." },
        { status: 403 }
      );
    }

    // 2) Sanitize Input
    const settings = sanitizeBody(await req.json());
    if (Object.keys(settings).length === 0) {
      return NextResponse.json({ error: "No valid settings to update." }, { status: 400 });
    }

    // 3) Update Supabase first (Source of Truth)
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("guild_settings")
      .upsert({ guild_id: guildId, ...settings }, { onConflict: "guild_id" });

    if (error) {
      console.error("[SETTINGS][ERROR] Supabase upsert failed:", error);
      return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
    }

    // 4) Purge cache AFTER DB commit (reversing the order risks caching stale data)
    await invalidateGuildSettings(guildId);

    return NextResponse.json({ ok: true, message: "Settings successfully updated." });
  } catch (err) {
    console.error("[SETTINGS][ERROR] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}