import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

/** 각 외부 의존성의 실제 상태를 개별적으로 진단한다. */
export async function GET() {
  const report: Record<string, any> = {};

  // ── 1) 환경변수 존재 여부 (값은 절대 노출하지 않는다) ──
  report.env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://") ?? false,
    REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  // ── 2) Supabase: 테이블별로 "에러"와 "빈 결과"를 명확히 구분한다 ──
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const tables = ["guild_settings", "automod_logs"]; // 완장 프로젝트 실제 테이블명에 맞게 수정
  const dbReport: Record<string, any> = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        // 테이블 없음 / RLS 거부 / 권한 오류가 여기서 잡힙니다.
        dbReport[table] = { status: "ERROR", code: error.code, message: error.message };
      } else {
        dbReport[table] = { status: "OK", rows: count ?? 0 };
      }
    } catch (e: any) {
      dbReport[table] = { status: "THROWN", message: e?.message };
    }
  }
  report.supabase = dbReport;

  // ── 3) Redis: 실제 왕복 테스트 ──
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    await redis.set("health:ping", Date.now().toString(), { ex: 30 });
    const pong = await redis.get("health:ping");
    const keys = await redis.keys("guild:*"); // 봇이 캐싱한 설정 키가 실제로 존재하는지 확인

    report.redis = { 
      status: "OK", 
      roundtrip: !!pong, 
      cachedGuildKeys: keys.length 
    };
  } catch (e: any) {
    report.redis = { status: "ERROR", message: e?.message };
  }

  return NextResponse.json(report, { status: 200 });
}