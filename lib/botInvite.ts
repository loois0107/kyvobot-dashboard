// TODO: set NEXT_PUBLIC_BOT_INVITE_URL in the environment to the real bot invite link
// (client_id + permissions bitfield) - this fallback is a placeholder only.
// Shared by the landing page's "add bot" CTA and the dashboard's bot-not-invited notice so both
// always point at the same link.
export const BOT_INVITE_URL =
  process.env.NEXT_PUBLIC_BOT_INVITE_URL ||
  'https://discord.com/oauth2/authorize?client_id=REPLACE_WITH_REAL_CLIENT_ID&permissions=8&scope=bot%20applications.commands';
