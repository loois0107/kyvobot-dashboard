export interface BotGuild {
  id: string;
  name: string;
}

/**
 * 봇이 실제로 초대되어 있는 전체 서버 목록을 가져온다. app/api/guilds/[guildId]/bot-status의
 * "GET /users/@me/guilds를 봇 토큰으로 호출" 패턴을 그대로 재사용하되, 특정 guildId 하나의
 * 포함 여부만 boolean으로 좁히지 않고 전체 목록(id+name)을 그대로 돌려준다 - 관리자 콘솔의
 * 서버 목록 라우트와 실사용 현황 라우트가 이 함수 하나를 공유한다.
 *
 * 🛡️ 봇이 200개 서버를 넘기면 after 파라미터로 페이지네이션해야 정확해진다(bot-status
 * route.ts의 기존 TODO와 동일한 한계) - 지금은 그보다 훨씬 적어서 보류.
 */
export async function fetchBotGuilds(): Promise<BotGuild[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;

  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error('[BOT_GUILDS][ERROR] Discord bot guild list fetch failed:', res.status);
    return null;
  }

  const guilds: BotGuild[] = await res.json();
  return guilds.map((g) => ({ id: g.id, name: g.name }));
}
