/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🛡️ [연동 & AI 지원 그룹 파일럿] twitch/ticket-settings를 integrations/ 밑으로 옮기면서
  // 옛 URL을 깨뜨리지 않기 위한 리다이렉트 - 북마크나 아직 못 찾은 외부 링크가 있어도 새
  // 경로로 안전하게 넘어간다. 나머지 3개 그룹도 같은 방식으로 옮길 때 이 목록에 추가하면 된다.
  async redirects() {
    return [
      {
        source: '/dashboard/:guildId/twitch',
        destination: '/dashboard/:guildId/integrations/twitch',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/ticket-settings',
        destination: '/dashboard/:guildId/integrations/ticket-settings',
        permanent: false,
      },
      // 🛡️ [파티 & 게임 그룹] 연동 & AI 지원과 동일한 정책(permanent: false).
      {
        source: '/dashboard/:guildId/party-settings',
        destination: '/dashboard/:guildId/party/party-settings',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/party-stats',
        destination: '/dashboard/:guildId/party/party-stats',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/party-presets',
        destination: '/dashboard/:guildId/party/party-presets',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/tier-roles',
        destination: '/dashboard/:guildId/party/tier-roles',
        permanent: false,
      },
      // 🛡️ [경제 & 참여도 그룹] 동일 정책(permanent: false).
      {
        source: '/dashboard/:guildId/leveling',
        destination: '/dashboard/:guildId/economy/leveling',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/leaderboard',
        destination: '/dashboard/:guildId/economy/leaderboard',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/giveaways',
        destination: '/dashboard/:guildId/economy/giveaways',
        permanent: false,
      },
      // 🛡️ [커뮤니티 관리 그룹] 동일 정책(permanent: false).
      {
        source: '/dashboard/:guildId/automod',
        destination: '/dashboard/:guildId/community/automod',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/welcome',
        destination: '/dashboard/:guildId/community/welcome',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/voice',
        destination: '/dashboard/:guildId/community/voice',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/anonymous-reports',
        destination: '/dashboard/:guildId/community/anonymous-reports',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/reaction-roles',
        destination: '/dashboard/:guildId/community/reaction-roles',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/settings',
        destination: '/dashboard/:guildId/community/settings',
        permanent: false,
      },
      {
        source: '/dashboard/:guildId/audit-logs',
        destination: '/dashboard/:guildId/community/audit-logs',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;