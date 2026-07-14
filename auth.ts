import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // 유저의 길드 목록을 읽으려면 guilds 스코프가 반드시 필요하다
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    /** 디스코드 access_token을 JWT에 심어둔다 (세션에서 길드 조회 시 사용). */
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    /** JWT의 access_token을 세션 객체로 노출한다. */
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  trustHost: true, // Render/Vercel 등 프록시 뒤에서 호스트 검증 통과용
});