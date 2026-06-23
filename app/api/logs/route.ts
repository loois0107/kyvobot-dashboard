import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json([{ id: "err", action_type: "FAIL", user_name: "키 누락", user_id: "SYSTEM", moderator_name: "시스템", reason: "환경 변수가 없습니다.", created_at: new Date().toISOString() }]);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1차 시도: 복수형 테이블 호출
    let { data, error } = await supabase.from("audit_logs").select("*").limit(50);

    // 만약 주소 에러가 나면 2차 시도: 단수형 테이블 호출
    if (error && error.message.includes("Invalid path")) {
      const retry = await supabase.from("audit_log").select("*").limit(50);
      data = retry.data;
      error = retry.error;
    }

    // 여전히 에러가 있다면 화면에 에러 카드 출력
    if (error) {
      return NextResponse.json([
        {
          id: "debug-err",
          action_type: "BAN",
          user_name: "수파베이스 연결 실패",
          user_id: "DATABASE",
          moderator_name: "Supabase",
          reason: `진짜 원인 👉 ${error.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    }

    const formattedData = (data || []).map((log: any) => ({
      id: log.id || Math.random().toString(),
      action_type: log.action_type || "LOG",
      user_name: log.user_name || log.username || log.target_name || log.target_username || "Unknown User",
      user_id: log.user_id || log.target_id || "0000",
      moderator_name: log.moderator_name || log.moderator_username || log.admin_name || "System",
      reason: log.reason || "No reason provided",
      created_at: log.created_at || new Date().toISOString(),
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json([{ id: "err", action_type: "FAIL", user_name: "크래시", user_id: "SERVER", moderator_name: "NodeJS", reason: error.message, created_at: new Date().toISOString() }]);
  }
}
