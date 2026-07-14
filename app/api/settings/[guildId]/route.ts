import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidateGuildSettings } from "@/lib/redis";
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

/** DB 반영을 허용할 컬럼 화이트리스트. 실제 guild_settings 스키마에 맞춰 수정하세요. */
const ALLOWED_FIELDS = [
  "automod_enabled",
  "spam_limit",
  "spam_interval",
  "log_channel_id",
  "banned_words",
] as const;

/** body에서 허용된 키만 추출한다 (Mass Assignment 방어). */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) clean[field] = body[field];
  }
  return clean;
}

// RouteContext는 전역 헬퍼라 import 불필요. 경로 문자열이 실제 라우트와 다르면 빌드 시 타입 에러.
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/settings/[guildId]">
) {
  const { guildId } = await ctx.params; // Next 16: params는 Promise

  try {
    // 0) 디스코드 스노우플레이크 형식 검증
    if (!/^\d{17,20}$/.test(guildId)) {
      return NextResponse.json({ error: "잘못된 서버 ID입니다." }, { status: 400 });
    }

    // 1) 🔐 권한 검증 (Fail-Closed)
    if (!(await verifyGuildAdmin(guildId))) {
      console.warn(`[SETTINGS][WARN] 무단 접근 차단: guild=${guildId}`);
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 2) 입력값 정제
    const settings = sanitizeBody(await req.json());
    if (Object.keys(settings).length === 0) {
      return NextResponse.json({ error: "변경할 설정이 없습니다." }, { status: 400 });
    }

    // 3) 원본(Source of Truth)인 Supabase 먼저 갱신
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("guild_settings")
      .upsert({ guild_id: guildId, ...settings }, { onConflict: "guild_id" });

    if (error) {
      console.error("[SETTINGS][ERROR] Supabase upsert 실패:", error);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    // 4) DB 커밋 후 캐시 삭제 (순서 역전 시 옛 값이 다시 캐싱됨)
    await invalidateGuildSettings(guildId);

    return NextResponse.json({ ok: true, message: "설정이 즉시 반영되었습니다." });
  } catch (err) {
    console.error("[SETTINGS][ERROR] 알 수 없는 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}