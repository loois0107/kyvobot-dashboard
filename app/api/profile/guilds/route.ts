import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

/**
 * 봇이 "지금" 실제로 속한 길드ID 집합을 디스코드에서 직접 가져온다. guild_settings 행
 * 존재 여부로는 판단하지 않는다 - 그 테이블은 "봇이 과거에 한 번이라도 이 길드에서
 * get_guild_settings를 호출한 적이 있다"만 증명할 뿐, 나중에 봇이 추방/탈퇴해도 행이
 * 자동으로 지워지지 않아서 "예전엔 있었지만 지금은 없는 서버"와 "애초에 없었던 서버"를
 * 구분하지 못한다 (실제로 guild_settings에 3개월 넘게 방치된 정크 유사 행이 있었음).
 * 봇 계정 자체의 길드 목록(Bot 토큰, /users/@me/guilds)이 유일하게 신뢰 가능한 "지금 상태" 소스다.
 */
async function fetchBotGuildIds(): Promise<Set<string> | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error('[PROFILE_GUILDS][ERROR] DISCORD_BOT_TOKEN environment variable is not set');
    return null;
  }

  const ids = new Set<string>();
  let after: string | undefined;

  // 디스코드는 페이지당 최대 200개만 주므로, 봇이 200개 넘는 서버에 있어도 전부 모을 때까지 순회한다.
  // page 상한(20 = 최대 4000개)은 무한루프 방지용 안전장치일 뿐, 실사용에서 걸릴 일은 없다.
  for (let page = 0; page < 20; page++) {
    const url = new URL('https://discord.com/api/v10/users/@me/guilds');
    url.searchParams.set('limit', '200');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 60 }, // 유저 무관 - 봇 계정 하나 기준이라 전역으로 캐싱해도 안전
    });
    if (!res.ok) {
      console.error('[PROFILE_GUILDS][ERROR] 봇 길드 목록 조회 실패:', res.status);
      return null;
    }

    const pageData: { id: string }[] = await res.json();
    for (const g of pageData) ids.add(g.id);
    if (pageData.length < 200) break;
    after = pageData[pageData.length - 1].id;
  }

  return ids;
}

/**
 * 개인 대시보드용 길드 선택 목록. /api/guilds(관리자 전용, MANAGE_GUILD 필터)와 달리
 * 관리자 권한은 요구하지 않고 "멤버인 서버"만 필터한다. 거기에 "봇이 지금 실제로 있는
 * 서버"로 한 번 더 좁힌다 - 실시간 디스코드 API 기준(위 fetchBotGuildIds 참고).
 */
export async function GET() {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;

  const session = await auth();
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ status: 'error', message: 'Login required.' }, { status: 401 });
  }

  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error('[PROFILE_GUILDS][ERROR] 디스코드 길드 조회 실패:', res.status);
    return NextResponse.json({ status: 'error', message: 'Failed to load Discord guild list' }, { status: 502 });
  }

  const guilds: DiscordGuild[] = await res.json();
  if (guilds.length === 0) return NextResponse.json([]);

  const botGuildIds = await fetchBotGuildIds();
  if (botGuildIds === null) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to verify which servers Kyvo is currently in.' },
      { status: 502 }
    );
  }

  const eligible = guilds
    .filter((g) => botGuildIds.has(g.id))
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));

  return NextResponse.json(eligible);
}
