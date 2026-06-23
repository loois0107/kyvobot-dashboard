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

    // 디스코드 봇 라이브러리들이 사용하는 거의 모든 로그 테이블 이름 후보군
    const candidates = [
      "audit_logs", 
      "audit_log", 
      "logs", 
      "Audit_logs", 
      "mod_logs", 
      "moderation_logs", 
      "bot_logs", 
      "action_logs", 
      "server_logs",
      "sanctions"
    ];
    
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

    // 모든 후보 이름이 실패했을 때 화면에 시도한 이름들을 리포트
    if (!successTable && error) {
      return NextResponse.json([
        {
          id: "debug-err-3",
          action_type: "BAN",
          user_name: "테이블 탐색 실패",
          user_id: "NOT_FOUND",
          moderator_name: "Supabase",
          reason: `시도한 이름들: [${candidates.join(", ")}]. 이 중에 일치하는 테이블이 DB에 없습니다.`,
          created_at: new Date().toISOString()
        }
      ]);
    }

    const formattedData = (data || []).map((log: any) => ({
      id: log.id || Math.random().toString(),
      action_type: log.action_type || log.action || "LOG",
      user_name: log.user_name || log.username || log.target_name || log.target_username || "Unknown User",
      user_id: log.user_id || log.target_id || "0000",
      moderator_name: log.moderator_name || log.moderator_username || log.admin_name || "System",
      reason: log.reason || "No reason provided",
      created_at: log.created_at || log.timestamp || new Date().toISOString(),
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json([{ id: "err", action_type: "FAIL", user_name: "크래시", user_id: "SERVER", moderator_name: "NodeJS", reason: error.message, created_at: new Date().toISOString() }]);
  }
}
