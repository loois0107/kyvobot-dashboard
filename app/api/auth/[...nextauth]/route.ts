import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// 👇 여기다가 진단용 로그를 한 줄 추가합니다!
console.log("🔥 현재 로드된 디스코드 ID:", process.env.DISCORD_CLIENT_ID);

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };