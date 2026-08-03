import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireLogin, requireGuildMembership } from "@/lib/auth";
import { fetchMemberInfoMap } from "@/lib/discordMembers";

export const dynamic = "force-dynamic";

/**
 * GET: /api/leaderboard와 동일한 랭킹 데이터를 반환하지만, 관리자 권한(verifyGuildAdmin)이
 * 아니라 일반 멤버십(requireGuildMembership)만 요구한다 - 개인 대시보드의 리더보드 탭은
 * 서버의 아무 멤버나(관리자가 아니어도) 자기 순위를 볼 수 있어야 한다. 쿼리/집계 로직은
 * fetchMemberInfoMap 포함 완전히 동일 - 봇 토큰 기반이라 호출자의 권한과 무관하다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Supabase environment variables are missing on host" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🛡️ /api/leaderboard와 동일하게 level 우선, xp는 세부 순위용 - level만으로는 방금
    // 레벨업해서 xp가 낮은 고레벨 유저가 역전당하는 문제가 있었다(leveling.py의 new_xp 리셋 방식).
    const { data, error } = await supabase
      .from("users")
      .select("user_id, xp, level, points")
      .eq("guild_id", guildId)
      .order("level", { ascending: false })
      .order("xp", { ascending: false })
      .limit(100);

    if (error) throw error;

    const neededUserIds = new Set((data || []).map((user: any) => user.user_id));
    const { map: memberInfoMap, verified } = await fetchMemberInfoMap(guildId, neededUserIds);

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
    console.error("[PROFILE_LEADERBOARD API ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Database query execution failure" },
      { status: 500 }
    );
  }
}
