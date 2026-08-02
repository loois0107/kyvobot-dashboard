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

/**
 * 리더보드에 필요한 user_id들(neededUserIds)만 골라 실제 닉네임/아바타로 채운다.
 * 개별 GET /guilds/{id}/members/{userId}를 유저 수만큼 호출하면 최악의 경우(리더보드 최대 100명)
 * 100번의 왕복이 필요해 느리고 레이트리밋 위험도 있다 - 대신 GET /guilds/{id}/members?limit=1000
 * 벌크 조회로 페이지를 넘기면서, 필요한 ID가 전부 채워지거나 서버 멤버 목록이 끝나면 즉시 멈춘다.
 * 서버를 나간 유저나(멤버 목록에 아예 없음) 페이지네이션 상한을 넘어서는 대형 서버의 나머지
 * 유저는 매칭이 안 되므로, 호출부의 Operator-XXXX 폴백이 계속 그 역할을 한다.
 */
async function fetchMemberInfoMap(
  guildId: string,
  neededUserIds: Set<string>
): Promise<Map<string, { username: string; avatar_url: string | null }>> {
  const result = new Map<string, { username: string; avatar_url: string | null }>();
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || neededUserIds.size === 0) return result;

  let after = "0";
  for (let page = 0; page < MAX_MEMBER_PAGES && result.size < neededUserIds.size; page++) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=${MEMBER_PAGE_LIMIT}&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` }, next: { revalidate: 30 } }
    );
    if (!res.ok) {
      console.error("[LEADERBOARD][ERROR] Member list fetch failed:", res.status);
      break;
    }
    const members: DiscordMember[] = await res.json();
    if (members.length === 0) break;

    for (const member of members) {
      const userId = member.user?.id;
      if (!userId || !neededUserIds.has(userId)) continue;
      const username = member.nick || member.user?.global_name || member.user?.username || null;
      if (!username) continue;
      result.set(userId, { username, avatar_url: buildAvatarUrl(guildId, userId, member) });
    }

    if (members.length < MEMBER_PAGE_LIMIT) break; // last page
    after = members[members.length - 1].user!.id;
  }

  return result;
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
    const memberInfoMap = await fetchMemberInfoMap(guildId, neededUserIds);

    const users = (data || []).map((user: any) => ({
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
