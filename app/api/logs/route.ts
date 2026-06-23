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

    // 사진에 나온 진짜 테이블 후보 2개 순회 (캐시 오류 및 이름 매핑 동시 해결)
    const targets = ["audit_logs", "automod_logs"];
    let data = null;
    let error = null;
    let usedTable = "";

    for (const table of targets) {
      const res = await supabase.from(table).select("*").limit(50);
      if (!res.error) {
        data = res.data;
        usedTable = table;
        break;
      }
      error = res.error;
    }

    // 만약 둘 다 시스템 주소 인식 에러(Invalid path)가 나면 마지막 에러 카드 출력
    if (!usedTable && error) {
      return NextResponse.json([
        {
          id: "debug-err-final",
          action_type: "BAN",
          user_name: "인프라 주소 바인딩 실패",
          user_id: "404_NOT_FOUND",
          moderator_name: "Supabase",
          reason: `진짜 원인 👉 Supabase API 엔진이 아직 테이블을 인식하지 못함: ${error.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    }

    // 어떤 테이블이 걸려들든 화면에 맞게 안전하게 변환
    const formattedData = (data || []).map((log: any) => ({
      id: log.id || Math.random().toString(),
      action_type: log.action_type || log.action || "LOG",
      user_name: log.user_name || log.username || log.target_name || log.target_username || "Unknown Operator",
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
