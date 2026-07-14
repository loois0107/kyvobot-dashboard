import { auth } from "@/auth"; // Auth.js v5의 루트 auth.ts에서 export한 헬퍼

const MANAGE_GUILD = BigInt(0x20); // 디스코드 "서버 관리" 권한 비트

/**
 * 세션 유저가 해당 길드의 관리자인지 검증한다.
 * 검증 중 어떤 예외가 나도 false를 반환한다 (Fail-Closed).
 */
export async function verifyGuildAdmin(guildId: string): Promise<boolean> {
  try {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) return false;

    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 }, // 디스코드 레이트 리밋 방어
    });
    if (!res.ok) {
      console.error("[AUTH][ERROR] 디스코드 길드 조회 실패:", res.status);
      return false;
    }

    const guilds: Array<{ id: string; owner: boolean; permissions: string }> = await res.json();
    const target = guilds.find((g) => g.id === guildId);
    if (!target) return false;

    return target.owner || (BigInt(target.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch (err) {
    console.error("[AUTH][ERROR] 권한 검증 중 예외:", err);
    return false;
  }
}