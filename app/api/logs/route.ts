import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ status: "error", message: "Missing network credentials" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pulling latest 50 security infractions mapped from the flat schema database
    const { data, error } = await supabase
      .from("audit_logs") // 만약 수파베이스 테이블명이 다르면 이 부분만 수정
      .select("id, action_type, user_name, user_id, moderator_name, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("[AUDIT LOG API ERROR]", error);
    return NextResponse.json({ status: "error", message: "Failed parsing security framework blocks" }, { status: 500 });
  }
}
