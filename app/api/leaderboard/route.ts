import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Supabase environment variables are missing on host" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id")?.trim();

  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id matrix token" },
      { status: 400 }
    );
  }

  // 🛡️ Security Isolation: Verify Administrator Permission (same gate as /api/stats, /api/guilds)
  const isAdmin = await verifyGuildAdmin(guildId);
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized. You do not have permission to manage this server." },
      { status: 403 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // NOTE: the `users` table has no guild_id column, so this is one global leaderboard
    // shared across every guild - it cannot be scoped per-server. Surfaced to the user
    // as "Global Leaderboard" rather than pretending it's tied to the current guild.
    const { data, error } = await supabase
      .from("users")
      .select("user_id, username, avatar_url, xp, level, points")
      .order("xp", { ascending: false })
      .limit(100);

    if (error) throw error;

    const users = (data || []).map((user: any) => ({
      user_id: user.user_id,
      username: user.username || `Operator-${user.user_id.slice(-4)}`,
      avatar_url: user.avatar_url || "",
      points: user.points || 0,
      level: user.level || 1,
      xp: user.xp || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[LEADERBOARD API ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Database query execution failure" },
      { status: 500 }
    );
  }
}
