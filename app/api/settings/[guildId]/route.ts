import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidateGuildSettings } from "@/lib/redis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용 키. 절대 클라이언트 노출 금지
);

export async function POST(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const { guildId } = params;

  try {
    const body = await req.json();

    // 1) 원본(Source of Truth)인 Supabase를 먼저 갱신한다
    const { error } = await supabase
      .from("guild_settings")
      .upsert({ guild_id: guildId, ...body }, { onConflict: "guild_id" });

    if (error) {
      console.error("[SETTINGS][ERROR] Supabase upsert 실패:", error);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    // 2) DB 커밋이 끝난 뒤에 캐시를 삭제한다 (순서 역전 시 옛 값이 다시 캐싱됨)
    await invalidateGuildSettings(guildId);

    return NextResponse.json({ ok: true, message: "설정이 즉시 반영되었습니다." });
  } catch (err) {
    console.error("[SETTINGS][ERROR] 알 수 없는 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
