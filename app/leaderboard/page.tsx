import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Environment variables are missing" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch top 100 users ordered by high-stakes XP points matching flat schema columns
    const { data, error } = await supabase
      .from("users")
      .select("user_id, xp, level, points")
      .order("xp", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Sanitize matrix logs and provide fallbacks if optional fields are absent
    const formattedData = (data || []).map((user: any) => ({
      user_id: user.user_id,
      username: user.username || `Operator-${user.user_id.slice(-4)}`,
      avatar_url: user.avatar_url || "",
      points: user.points || 0,
      level: user.level || 1,
      xp: user.xp || 0,
    }));

    return NextResponse.json({
      status: "success",
      data: formattedData,
    });
  } catch (error) {
    console.error("[LEADERBOARD API ERROR] Standings matrix synchronization fault:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to compile database leaderboard rows" },
      { status: 500 }
    );
  }
}
