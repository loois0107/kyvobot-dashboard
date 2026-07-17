import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth";

/** 요청 시점에만 서버 전용 Supabase 클라이언트를 생성한다 (빌드 타임 크래시 방지). */
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[SUPABASE][ERROR] Missing Supabase Environment Variables on Server!");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/** guildId 형식 + 관리자 권한을 함께 검증한다. 통과 못 하면 에러 응답을 반환한다. */
async function guard(guildId: string): Promise<NextResponse | null> {
  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ ok: false, message: "Invalid server ID." }, { status: 400 });
  }
  if (!(await verifyGuildAdmin(guildId))) {
    return NextResponse.json({ ok: false, message: "Permission denied." }, { status: 403 });
  }
  return null;
}

// ══════════════════════════════════════════════════════════
//  GET — 이 서버의 모든 커스텀 명령어를 { command_name: response_text } 객체로 반환
// ══════════════════════════════════════════════════════════
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;
  const blocked = await guard(guildId);
  if (blocked) return blocked;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("custom_commands")
      .select("command_name, response_text")
      .eq("guild_id", guildId);

    if (error) {
      console.error("[COMMANDS][ERROR] 조회 실패:", error);
      return NextResponse.json({ ok: false, message: "Failed to load commands." }, { status: 500 });
    }

    // 행 배열 → 프론트가 다루기 쉬운 객체로 변환
    const commands: Record<string, string> = {};
    for (const row of data ?? []) {
      commands[row.command_name] = row.response_text;
    }

    return NextResponse.json({ ok: true, commands });
  } catch (err) {
    console.error("[COMMANDS][ERROR] GET 예외:", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════
//  POST — 명령어 하나를 추가/수정 (복합 PK 기반 upsert)
// ══════════════════════════════════════════════════════════
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;
  const blocked = await guard(guildId);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const commandName = (body.command_name ?? "").toString().trim();
    const responseText = (body.response_text ?? "").toString();

    if (!commandName) {
      return NextResponse.json({ ok: false, message: "Command name is required." }, { status: 400 });
    }

    if (commandName.length > 100 || responseText.length > 2000) {
      return NextResponse.json({ ok: false, message: "Command name or response too long." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("custom_commands")
      .upsert(
        { guild_id: guildId, command_name: commandName, response_text: responseText },
        { onConflict: "guild_id,command_name" } // 복합 PK 기반 안전 덮어쓰기
      );

    if (error) {
      console.error("[COMMANDS][ERROR] upsert 실패:", error);
      return NextResponse.json({ ok: false, message: "Failed to save command." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Command saved." });
  } catch (err) {
    console.error("[COMMANDS][ERROR] POST 예외:", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════
//  DELETE — 명령어 하나를 삭제
// ══════════════════════════════════════════════════════════
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await ctx.params;
  const blocked = await guard(guildId);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const commandName = (body.command_name ?? "").toString().trim();

    if (!commandName) {
      return NextResponse.json({ ok: false, message: "Command name is required." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("custom_commands")
      .delete()
      .eq("guild_id", guildId)
      .eq("command_name", commandName);

    if (error) {
      console.error("[COMMANDS][ERROR] 삭제 실패:", error);
      return NextResponse.json({ ok: false, message: "Failed to delete command." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Command deleted." });
  } catch (err) {
    console.error("[COMMANDS][ERROR] DELETE 예외:", err);
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}