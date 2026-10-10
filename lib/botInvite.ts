// client_id=1508034647152398436는 실제 봇의 Discord Application/User ID (Discord API
// GET /users/@me로 실측 확인함 - AUTH_DISCORD_ID와 동일값). NEXT_PUBLIC_BOT_INVITE_URL이
// 환경변수로 설정돼 있으면 그쪽을 우선하고, 없을 때만 이 값으로 폴백한다.
// Shared by the landing page's "add bot" CTA and the dashboard's bot-not-invited notice so both
// always point at the same link.
//
// 🛡️ [permissions=8(Administrator) -> 1099797359824로 축소] 레포 전체의 discord.Permissions
// 체크 + 실제 API 호출(message.delete/timeout, create_text_channel/create_voice_channel,
// add_roles/remove_roles, move_to, add_reaction, channel.history 등)을 전부 훑어서 실제로
// 필요한 개별 권한만 골랐다 - discord.py의 discord.Permissions(...).value로 계산한 값이라
// 비트 하나하나를 손으로 센 게 아니다. 아래 14개, 누락되면 해당 기능이 신규 서버에서 조용히
// 안 먹으니 권한을 새로 추가하는 코드를 쓸 때 여기도 같이 늘려야 한다.
//   view_channel(1024) send_messages(2048) manage_messages(8192) embed_links(16384)
//   attach_files(32768) read_message_history(65536) mention_everyone(131072)
//   use_external_emojis(262144) move_members(16777216) manage_roles(268435456)
//   manage_channels(16) add_reactions(64) view_audit_log(128) moderate_members(1099511627776)
export const BOT_INVITE_URL =
  process.env.NEXT_PUBLIC_BOT_INVITE_URL ||
  'https://discord.com/oauth2/authorize?client_id=1508034647152398436&permissions=1099797359824&scope=bot%20applications.commands';
