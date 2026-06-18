/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/stats',
        destination: 'https://kyvobot.onrender.com/api/stats',
      },
      {
        source: '/api/logs',
        destination: 'https://kyvobot.onrender.com/api/logs',
      },
      {
        source: '/api/settings',
        destination: 'https://kyvobot.onrender.com/api/settings',
      },
      {
        source: '/api/leaderboard',
        destination: 'https://kyvobot.onrender.com/api/leaderboard',
      },
      {
        source: '/api/settings/update',
        destination: 'https://kyvobot.onrender.com/api/settings/update',
      },
    ];
  },
};

export default nextConfig;
