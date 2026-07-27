import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // clientId/clientSecret은 AUTH_DISCORD_ID / AUTH_DISCORD_SECRET 에서 자동 주입됨
    Discord({
      // 유저의 길드 목록을 읽으려면 guilds 스코프가 반드시 필요하다
      authorization: { params: { scope: "identify guilds" } },
      // 🛡️ [다국어] next-auth 기본 profile() 매퍼가 id/name/email/image만 남기고 locale을
      // 버려서, 대시보드 초기 언어 추정(Discord 계정 locale 기반)에 쓸 수 있도록 직접 넘겨준다.
      // 원본 매퍼 로직(아바타 URL 계산)은 그대로 유지 - node_modules/@auth/core Discord provider 참고.
      profile(profile) {
        const defaultAvatarNumber =
          profile.discriminator === "0"
            ? Number(BigInt(profile.id) >> BigInt(22)) % 6
            : parseInt(profile.discriminator) % 5;
        const image = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith("a_") ? "gif" : "png"}`
          : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        return {
          id: profile.id,
          name: profile.global_name ?? profile.username,
          email: profile.email,
          image,
          locale: profile.locale as string | undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    /** 디스코드 access_token/유저ID/locale을 JWT에 심어둔다 (길드 권한 조회, 개인 대시보드 신원 확인,
     * 다국어 초기값 추정에 사용). profile은 최초 로그인 시점에만 넘어오므로 반드시 여기서
     * token에 저장해둬야 이후 요청에서도 남아있다. */
    async jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (profile?.id) token.discordId = profile.id as string;
      if ((profile as any)?.locale) token.discordLocale = (profile as any).locale as string;
      return token;
    },
    /** JWT의 access_token/유저ID/discordLocale을 세션으로 노출한다. */
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      if (token.discordId) (session.user as any).id = token.discordId as string;
      if (token.discordLocale) (session.user as any).discordLocale = token.discordLocale as string;
      return session;
    },
  },
  trustHost: true,
  // secret은 AUTH_SECRET 에서 자동으로 읽힘 — 하드코딩 금지
});