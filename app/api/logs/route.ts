import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

  // 현재 백엔드가 사용 중인 수파베이스 프로젝트 주소 추출
  let projectRef = "URL_NOT_FOUND";
  try {
    if (supabaseUrl) {
      const match = supabaseUrl.match(/https:\/\/(.*?)\.supabase/);
      if (match) projectRef = match[1];
    }
  } catch (e) {}

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json([{ id: "err", action_type: "FAIL", user_name: "키 누락", user_id: "SYSTEM", moderator_name: "시스템", reason: "환경 변수가 없습니다.", created_at: new Date().toISOString() }]);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from("audit_logs").select("*").limit(5);

    if (error) {
      // 💡 핵심: 에러가 나면 현재 연결된 주소(프로젝트 ID)를 대시보드 화면에 보여줌
      return NextResponse.json([
        {
          id: "debug-project-check",
          action_type: "BAN",
          user_name: "프로젝트 ID 검증 필요",
          user_id: "CHECK_ID",
          moderator_name: "Supabase",
          reason: `대시보드가 접속한 ID 👉 [ ${projectRef} ] 👈 현재 인터넷 주소창의 project/ 뒤에 있는 글자와 똑같은지 확인해 봐!`,
          created_at: new Date().toISOString()
        }
      ]);
    }

    const formattedData = (data || []).map((log: any) => ({
      id: log.id || Math.random().toString(),
      action_type: log.action_type || "LOG",
      user_name: log.user_name || log.username || "User",
      user_id: log.user_id || "0000",
      moderator_name: log.moderator_name || "System",
      reason: log.reason || "No reason",
      created_at: log.created_at || new Date().toISOString(),
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json([{ id: "err", action_type: "FAIL", user_name: "크래시", user_id: "SERVER", moderator_name: "NodeJS", reason: error.message, created_at: new Date().toISOString() }]);
  }
}
