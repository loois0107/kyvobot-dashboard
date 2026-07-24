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
    /** 디스코드 access_token/유저ID를 JWT에 심어둔다 (길드 권한 조회, 개인 대시보드 신원 확인에 사용).
     * profile은 최초 로그인 시점에만 넘어오므로 반드시 여기서 token에 저장해둬야 이후 요청에서도 남아있다. */
    async jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (profile?.id) token.discordId = profile.id as string;
      return token;
    },
    /** JWT의 access_token/유저ID를 세션으로 노출한다. */
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      if (token.discordId) (session.user as any).id = token.discordId as string;
      return session;
    },
  },
  trustHost: true,
  // secret은 AUTH_SECRET 에서 자동으로 읽힘 — 하드코딩 금지
});