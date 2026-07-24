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

/**
 * 개인 대시보드용 가드. verifyGuildAdmin과 달리 "관리자인가"가 아니라 "로그인한 사람이
 * 누구인가"만 묻는다. 세션의 유저 ID를 반환하고, 이 ID 외의 다른 user_id는 라우트 어디서도
 * 절대 요청 바디/쿼리에서 받지 않는 것이 핵심 - IDOR을 검사가 아니라 구조적으로 차단한다.
 */
export async function requireLogin(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ status: "error", message: "Login required." }, { status: 401 });
  }
  return { userId };
}

/**
 * 세션 유저가 해당 길드의 "멤버"인지만 검증한다 (관리자 권한 불필요) - verifyGuildAdmin과
 * 같은 디스코드 API를 재사용하되 권한 비트 체크를 뺀 버전. 개인 대시보드에서 URL의 guildId를
 * 임의로 바꿔서 무관한 서버에 접근/오버라이드 행을 만드는 걸 막는 용도.
 */
export async function verifyGuildMembership(guildId: string): Promise<boolean> {
  try {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) return false;

    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error("[AUTH][ERROR] 디스코드 길드 조회 실패:", res.status);
      return false;
    }

    const guilds: Array<{ id: string }> = await res.json();
    return guilds.some((g) => g.id === guildId);
  } catch (err) {
    console.error("[AUTH][ERROR] 멤버십 검증 중 예외:", err);
    return false;
  }
}

export async function requireGuildMembership(guildId: string | null | undefined): Promise<NextResponse | null> {
  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id parameter" },
      { status: 400 }
    );
  }

  const isMember = await verifyGuildMembership(guildId);
  if (!isMember) {
    return NextResponse.json(
      { status: "error", message: "You are not a member of this server." },
      { status: 403 }
    );
  }

  return null;
}

const ADMINISTRATOR = BigInt(0x8); // 디스코드 "관리자" 권한 비트 - MANAGE_GUILD(0x20)보다 엄격하다

/**
 * verifyGuildAdmin은 MANAGE_GUILD(서버 관리) 권한만 보는데, /tier_role_set 슬래시 커맨드는
 * `has_permissions(administrator=True)`로 더 엄격한 ADMINISTRATOR 권한을 요구한다. 이 라우트를
 * 그대로 requireGuildAdmin으로 가드하면 "서버 관리는 있지만 관리자는 아닌" 유저가 커맨드로는
 * 막히는 걸 대시보드로는 통과하는 구멍이 생긴다 - 커맨드와 동일한 기준을 강제하기 위해 별도로 둔다.
 */
export async function verifyGuildAdministrator(guildId: string): Promise<boolean> {
  try {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) return false;

    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error("[AUTH][ERROR] 디스코드 길드 조회 실패:", res.status);
      return false;
    }

    const guilds: Array<{ id: string; owner: boolean; permissions: string }> = await res.json();
    const target = guilds.find((g) => g.id === guildId);
    if (!target) return false;

    return target.owner || (BigInt(target.permissions) & ADMINISTRATOR) === ADMINISTRATOR;
  } catch (err) {
    console.error("[AUTH][ERROR] administrator 권한 검증 중 예외:", err);
    return false;
  }
}

export async function requireGuildAdministrator(guildId: string | null | undefined): Promise<NextResponse | null> {
  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id parameter" },
      { status: 400 }
    );
  }

  const isAdministrator = await verifyGuildAdministrator(guildId);
  if (!isAdministrator) {
    return NextResponse.json(
      { status: "error", message: "This action requires the Administrator permission (Manage Server alone isn't enough)." },
      { status: 403 }
    );
  }

  return null;
}