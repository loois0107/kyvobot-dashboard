// client_id=1508034647152398436는 실제 봇의 Discord Application/User ID (Discord API
// GET /users/@me로 실측 확인함 - AUTH_DISCORD_ID와 동일값). NEXT_PUBLIC_BOT_INVITE_URL이
// 환경변수로 설정돼 있으면 그쪽을 우선하고, 없을 때만 이 값으로 폴백한다.
// Shared by the landing page's "add bot" CTA and the dashboard's bot-not-invited notice so both
// always point at the same link.
export const BOT_INVITE_URL =
  process.env.NEXT_PUBLIC_BOT_INVITE_URL ||
  'https://discord.com/oauth2/authorize?client_id=1508034647152398436&permissions=8&scope=bot%20applications.commands';
