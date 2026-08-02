import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth";
import { fetchMemberInfoMap } from "@/lib/discordMembers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Supabase environment variables are missing on host" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id")?.trim();

  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id matrix token" },
      { status: 400 }
    );
  }

  // 🛡️ Security Isolation: Verify Administrator Permission (same gate as /api/stats, /api/guilds)
  const isAdmin = await verifyGuildAdmin(guildId);
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized. You do not have permission to manage this server." },
      { status: 403 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🛡️ users가 (user_id, guild_id) 복합키 구조로 마이그레이션되면서 서버별 필터가 가능해졌다.
    // username/avatar_url은 실제 컬럼이 아니어서(42703로 확인됨) select에서 제거 - 실제 닉네임/
    // 아바타는 아래에서 Discord 멤버 목록으로 채우고, 서버를 나갔거나 못 찾은 유저만
    // Operator-XXXX 폴백으로 떨어진다.
    const { data, error } = await supabase
      .from("users")
      .select("user_id, xp, level, points")
      .eq("guild_id", guildId)
      .order("xp", { ascending: false })
      .limit(100);

    if (error) throw error;

    const neededUserIds = new Set((data || []).map((user: any) => user.user_id));
    const { map: memberInfoMap, verified } = await fetchMemberInfoMap(guildId, neededUserIds);

    // 🛡️ verified일 때만 "멤버 목록에 없음 = 서버를 나감"으로 믿고 제외한다(users 테이블 자체는
    // 안 건드림 - 조회 결과만 필터링). 조회를 다 못 믿을 상황(verified=false)이면 fail-open으로
    // 전원 유지 - filteredData가 곧 (data || [])와 동일해진다.
    const filteredData = verified
      ? (data || []).filter((user: any) => memberInfoMap.has(user.user_id))
      : (data || []);

    const users = filteredData.map((user: any) => ({
      user_id: user.user_id,
      username: memberInfoMap.get(user.user_id)?.username || `Operator-${user.user_id.slice(-4)}`,
      avatar_url: memberInfoMap.get(user.user_id)?.avatar_url || "",
      points: user.points || 0,
      level: user.level || 1,
      xp: user.xp || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[LEADERBOARD API ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Database query execution failure" },
      { status: 500 }
    );
  }
}
