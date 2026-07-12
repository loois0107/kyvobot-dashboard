import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  // Accepts all common naming variations for Supabase infrastructure keys
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Strict database credentials not found in any environment variable aliases" },
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
    console.error("[LEADERBOARD API ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Database query execution failure" },
      { status: 500 }
    );
  }
}
