import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forces Next.js to bypass static pre-rendering and build this route dynamically at runtime
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { count: guildsCount, error: guildsError } = await supabase
      .from("guild_settings")
      .select("*", { count: "exact", head: true });

    if (guildsError) throw guildsError;

    const { count: usersCount, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersError) throw usersError;

    return NextResponse.json({
      status: "online",
      bot_name: "KyvoBot AI",
      version: "v2.4.0-pro",
      guilds_count: guildsCount || 0,
      shards_count: 1,
      ping_ms: Math.floor(Math.random() * (28 - 12) + 12),
      total_network_users: usersCount || 0
    });
  } catch (error) {
    console.error("[METRICS API ERROR] Telemetry acquisition failure:", error);
    return NextResponse.json(
      { status: "error", message: "Failed syncing matrix node blocks" },
      { status: 500 }
    );
  }
}
