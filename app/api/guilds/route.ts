import { NextResponse } from "next/server";
import { auth } from "@/auth";

const MANAGE_GUILD = BigInt(0x20);

interface DiscordGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

export async function GET() {
  const session = await auth();
  const accessToken = (session as any)?.accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("[GUILDS][ERROR] 디스코드 길드 조회 실패:", res.status);
    return NextResponse.json(
      { status: "error", message: "Failed to load Discord guild list" },
      { status: 502 }
    );
  }

  const guilds: DiscordGuild[] = await res.json();
  const managed = guilds
    .filter((g) => g.owner || (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD)
    .map((g) => ({ id: g.id, name: g.name }));

  return NextResponse.json(managed);
}
