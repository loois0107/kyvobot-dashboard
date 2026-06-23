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

    // [검증] 리더보드에서 성공했던 users 테이블이 여기서도 연결되는지 확인
    const testUsers = await supabase.from("users").select("count", { count: 'exact', head: true });
    if (testUsers.error) {
      return NextResponse.json([
        {
          id: "debug-err-1",
          action_type: "BAN",
          user_name: "연결망 확인 실패",
          user_id: "CONNECTION",
          moderator_name: "Supabase",
          reason: `기본 users 테이블도 접속 불가: ${testUsers.error.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    }

    // [탐색] 가능한 모든 테이블 이름 후보 순회 테스트
    const candidates = ["audit_logs", "audit_log", "logs", "Audit_logs"];
    let data = null;
    let error = null;
    let successTable = "";

    for (const table of candidates) {
      const res = await supabase.from(table).select("*").limit(50);
      if (!res.error) {
        data = res.data;
        successTable = table;
        break;
      }
      error = res.error;
    }

    // 모든 후보가 실패했을 때
    if (!successTable && error) {
      return NextResponse.json([
        {
          id: "debug-err-2",
          action_type: "BAN",
          user_name: "이름 매핑 실패",
          user_id: "DATABASE",
          moderator_name: "Supabase",
          reason: `모든 후보 이름 주소 인식 실패. 마지막 에러: ${error.message}`,
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
