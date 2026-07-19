import { NextResponse } from "next/server";
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

/**
 * 길드 스코프 API 라우트용 공통 가드. guild_id 존재 여부와 verifyGuildAdmin 결과를
 * 한 번에 검증해서, 통과 못 하면 그대로 반환할 수 있는 NextResponse를 돌려준다.
 * 통과하면 null이므로 `if (blocked) return blocked;` 한 줄로 라우트 앞단에 꽂으면 된다.
 *
 * 이 가드가 빠진 라우트가 하나씩 나오는 문제(레벨/이코노미, 티켓 설정, 티켓 지식베이스 등에서
 * 실제로 발생) 때문에 만들어졌다 - 길드 데이터를 다루는 라우트는 예외 없이 이걸 거쳐야 한다.
 */
export async function requireGuildAdmin(guildId: string | null | undefined): Promise<NextResponse | null> {
  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id parameter" },
      { status: 400 }
    );
  }

  const isAdmin = await verifyGuildAdmin(guildId);
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized. You do not have permission to manage this server." },
      { status: 403 }
    );
  }

  return null;
}