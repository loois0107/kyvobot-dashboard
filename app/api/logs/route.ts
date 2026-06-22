import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ status: "error", message: "Missing keys" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // * 기호를 쓰면 컬럼명이 달라도 에러(500)가 절대 안 나고 다 가져옴
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ status: "supabase_error", details: error.message }, { status: 500 });
    }

    // DB에 들어있을 법한 모든 컬럼명 변형을 유연하게 체크해서 매핑 (없으면 Unknown 처리)
    const formattedData = (data || []).map((log: any) => ({
      id: log.id,
      action_type: log.action_type || "UNKNOWN",
      user_name: log.user_name || log.username || log.target_name || log.target_username || "Unknown User",
      user_id: log.user_id || log.target_id || "0000",
      moderator_name: log.moderator_name || log.moderator_username || log.admin_name || "System",
      reason: log.reason || "No reason provided",
      created_at: log.created_at,
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json({ status: "crash", details: error.message }, { status: 500 });
  }
}
