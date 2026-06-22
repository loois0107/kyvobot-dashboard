import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json([
      {
        id: "debug-err-1",
        action_type: "FAIL",
        user_name: "환경 변수 누락",
        user_id: "SYSTEM",
        moderator_name: "시스템",
        reason: "대시보드 서버에 Supabase 연결 키가 설정되지 않았습니다.",
        created_at: new Date().toISOString()
      }
    ]);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 에러 유발 가능성을 줄이기 위해 전체 선택 후 정렬 없이 50개만 호출 시도
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .limit(50);

    // 💡 핵심 치트키: DB 에러가 나면 500을 뱉지 않고, 에러 내용을 로그 카드 형태로 위장해서 전달
    if (error) {
      return NextResponse.json([
        {
          id: "debug-err-2",
          action_type: "BAN", // 빨간색 배지 유도
          user_name: "수파베이스 쿼리 실패",
          user_id: "DATABASE",
          moderator_name: "Supabase",
          reason: `진짜 에러 원인 👉 ${error.message}`,
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
    return NextResponse.json([
      {
        id: "debug-err-3",
        action_type: "FAIL",
        user_name: "런타임 크래시",
        user_id: "SERVER",
        moderator_name: "NodeJS",
        reason: `코드 실행 중 예외 발생: ${error.message}`,
        created_at: new Date().toISOString()
      }
    ]);
  }
}
