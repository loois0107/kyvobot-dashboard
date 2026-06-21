import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  // Ensure strict exact match with system environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Environment variables missing inside runtime context" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

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
