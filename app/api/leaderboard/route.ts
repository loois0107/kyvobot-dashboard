import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface DiscordMember {
  user?: { id: string; username?: string; global_name?: string; avatar?: string | null };
  nick?: string | null;
  avatar?: string | null; // per-guild member avatar, distinct from the user's global avatar
}

function buildAvatarUrl(guildId: string, userId: string, member: DiscordMember): string | null {
  if (member.avatar) return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${member.avatar}.png`;
  if (member.user?.avatar) return `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png`;
  return null;
}

const MEMBER_PAGE_LIMIT = 1000;
const MAX_MEMBER_PAGES = 10; // 최대 10,000명까지 - 이보다 큰 서버는 남은 유저에 대해 Operator-XXXX 폴백 유지

interface MemberInfoResult {
  map: Map<string, { username: string; avatar_url: string | null }>;
  // 🛡️ true일 때만 "이 서버 멤버 목록을 정말로 끝까지(또는 필요한 ID 전부를) 확인했다"는 뜻이라,
  // 호출부가 "맵에 없음 = 서버를 나감"으로 믿고 걸러내도 안전하다. 조회가 실패했거나 대형 서버라
  // 페이지네이션 상한(MAX_MEMBER_PAGES)에 걸려 끝까지 못 봤을 땐 false - 이 경우 "못 찾음"이
  // "진짜로 나감"인지 "그냥 아직 못 봄"인지 구분이 안 되므로, 호출부는 걸러내지 말고 전부
  // 보여줘야 한다(fail-open). 리더보드의 핵심 기능이 부가 기능(나간 사람 숨기기)의 실패 때문에
  // 통째로 비어버리면 안 되기 때문.
  verified: boolean;
}

/**
 * 리더보드에 필요한 user_id들(neededUserIds)만 골라 실제 닉네임/아바타로 채운다.
 * 개별 GET /guilds/{id}/members/{userId}를 유저 수만큼 호출하면 최악의 경우(리더보드 최대 100명)
 * 100번의 왕복이 필요해 느리고 레이트리밋 위험도 있다 - 대신 GET /guilds/{id}/members?limit=1000
 * 벌크 조회로 페이지를 넘기면서, 필요한 ID가 전부 채워지거나 서버 멤버 목록이 끝나면 즉시 멈춘다.
 */
async function fetchMemberInfoMap(guildId: string, neededUserIds: Set<string>): Promise<MemberInfoResult> {
  const result = new Map<string, { username: string; avatar_url: string | null }>();
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return { map: result, verified: false }; // 조회 시도조차 못 함 - 아무것도 확정할 수 없다
  if (neededUserIds.size === 0) return { map: result, verified: true }; // 확인할 대상이 없으니 공허하게 완료

  let after = "0";
  let verified = false;
  for (let page = 0; page < MAX_MEMBER_PAGES; page++) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=${MEMBER_PAGE_LIMIT}&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` }, next: { revalidate: 30 } }
    );
    if (!res.ok) {
      console.error("[LEADERBOARD][ERROR] Member list fetch failed:", res.status);
      break; // verified=false로 남음 - 이번 조회는 신뢰할 수 없다
    }
    const members: DiscordMember[] = await res.json();
    if (members.length === 0) {
      verified = true; // 서버 멤버 목록의 진짜 끝에 도달
      break;
    }

    for (const member of members) {
      const userId = member.user?.id;
      if (!userId || !neededUserIds.has(userId)) continue;
      const username = member.nick || member.user?.global_name || member.user?.username || null;
      if (!username) continue;
      result.set(userId, { username, avatar_url: buildAvatarUrl(guildId, userId, member) });
    }

    if (result.size >= neededUserIds.size) {
      verified = true; // 필요한 ID를 전부 찾았으니 더 볼 필요 없음
      break;
    }
    if (members.length < MEMBER_PAGE_LIMIT) {
      verified = true; // 이 페이지가 진짜 마지막 페이지였음
      break;
    }
    after = members[members.length - 1].user!.id;
    // 루프가 MAX_MEMBER_PAGES 상한에 걸려 자연 종료되면 verified는 false로 남는다 - 대형 서버라
    // 끝까지 못 봤다는 뜻.
  }

  return { map: result, verified };
}

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
