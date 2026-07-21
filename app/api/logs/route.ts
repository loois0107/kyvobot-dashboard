import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireGuildAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");

  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

    // 🛡️ guild_id로 격리 - 이전엔 이 필터가 없어서 모든 길드의 automod 로그가 뒤섞여 노출됐음.
    const { data, error } = await supabase
      .from("automod_logs")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json([
        {
          id: "debug-project-check",
          action_type: "BAN",
          user_name: "프로젝트 ID 검증 필요",
          user_id: "CHECK_ID",
          moderator_name: "Supabase",
          reason: `대시보드가 접속한 ID 👉 [ ${projectRef} ] 👈 에러내용: ${error.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    }

    const formattedData = (data || []).map((log: any) => {
      const action = log.action || "AUTOMOD";
      const userName = log.user_name || `Target Citizen`;
      const userId = log.user_id || "0000";
      const reason = log.reason || "No protective breakdown reason specified.";
      const modName = log.moderator_name || "Kyvo AutoMod";
      const createdAt = log.created_at || new Date().toISOString();

      // 시간 예쁘게 포맷팅 (HH:MM:SS) - timeZone을 안 박으면 서버 프로세스의 시스템 타임존(보통 UTC)을
      // 그대로 쓰기 때문에, 'ko-KR' 로케일이어도 실제로는 KST가 아닌 시각이 찍히고 있었다.
      const timeString = new Date(createdAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });

      // 터미널 화면에 출력될 메시지 조립
      const terminalMessage = `[${modName}] ${userName}(${userId}) ➔ 명령 실행: ${action} // 사유: ${reason}`;

      // 🟡 [A AUTOMOD COLOR MATRIX FIX]: 뒤에 _10M이나 _ONLY 같은 접미사가 붙어도 제재 액션 키워드가 포함되어 있다면 WARN 처리
      let logType = "INFO";
      const upperAction = action.toUpperCase();
      if (
        upperAction.includes("BAN") ||
        upperAction.includes("TIMEOUT") ||
        upperAction.includes("KICK") ||
        upperAction.includes("DELETE")
      ) {
        logType = "WARN";
      }

      return {
        id: log.id?.toString() || Math.random().toString(),
        action_type: action,
        user_name: userName,
        user_id: userId,
        moderator_name: modName,
        reason: reason,
        created_at: createdAt,

        timestamp: timeString,
        type: logType,
        message: terminalMessage
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json([{ id: "err", action_type: "FAIL", user_name: "크래시", user_id: "SERVER", moderator_name: "NodeJS", reason: error.message, created_at: new Date().toISOString() }]);
  }
}
