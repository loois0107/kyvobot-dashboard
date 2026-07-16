import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // clientId/clientSecret은 AUTH_DISCORD_ID / AUTH_DISCORD_SECRET 에서 자동 주입됨
    Discord({
      // 유저의 길드 목록을 읽으려면 guilds 스코프가 반드시 필요하다
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    /** 디스코드 access_token을 JWT에 심어둔다 (길드 권한 조회에 사용). */
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    /** JWT의 access_token을 세션으로 노출한다. */
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  trustHost: true,
  // secret은 AUTH_SECRET 에서 자동으로 읽힘 — 하드코딩 금지
});