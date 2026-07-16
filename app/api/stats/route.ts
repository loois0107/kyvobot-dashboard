import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 🏎️ MULTI-TENANT IN-MEMORY CACHE STORAGE: Segregates data snapshots per unique guild ID node
const guildCacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000; // Fast real-time calibration interval (15 Seconds)

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Supabase environment variables are missing on host" },
      { status: 500 }
    );
  }

  // 📡 TARGET EXTRACTION: Intercept the dynamic query parameter string token
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id")?.trim();

  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id matrix token" },
      { status: 400 }
    );
  }

  // 🛡️ 보안 격리: 관리자 권한 검증 (타협 불가능한 1순위 방어벽)
  const isAdmin = await verifyGuildAdmin(guildId);
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", message: "해당 서버의 관리 권한이 없습니다." },
      { status: 403 }
    );
  }

  const currentTime = Date.now();
  const cachedNode = guildCacheMap.get(guildId);

  // 🛡️ ISOLATED TTL PROTECTION: Return isolated server memory instantly if cache hit persists
  if (cachedNode && currentTime - cachedNode.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedNode.data);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 길드 기본 설정 조회 (서버 존재 검증용)
    const { data: guildData, error: guildError } = await supabase
      .from("guild_settings")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (guildError) {
      console.error("[🔴 DB ERROR - guild_settings 테이블 조회 실패]:", guildError);
      throw guildError;
    }

    // 2. 🛡️ 서버별 automod 로그 총 건수 집계 (격리 완벽 보장)
    let automodLogCount = 0;
    const { count: logCount, error: logError } = await supabase
      .from("automod_logs")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (logError) {
      console.warn(
        `[⚠️ DB WARNING - automod_logs 조회 실패] ` +
        `Code: ${logError.code} | Message: ${logError.message}. ` +
        `로그 카운트를 0으로 우회합니다.`
      );
      automodLogCount = 0;
    } else {
      automodLogCount = logCount || 0;
    }

    // 3. 🛡️ [RAG Vectors 다이렉트 카운트] guild_knowledge 테이블 직접 집계!
    let ragVectorsCount = 0;
    const { count: ragCount, error: ragError } = await supabase
      .from("guild_knowledge")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (ragError) {
      console.warn(
        `[⚠️ DB WARNING - guild_knowledge 조회 실패] ` +
        `Code: ${ragError.code} | Message: ${ragError.message}. ` +
        `RAG 개수를 0으로 안전하게 우회합니다.`
      );
      ragVectorsCount = 0;
    } else {
      ragVectorsCount = ragCount || 0;
    }

    // 4. 🛡️ [Active Tickets 다이렉트 카운트] guild_ticket_settings 테이블 직접 집계! (거짓 양성 완전 제거)
    let activeTicketsCount = 0;
    const { count: ticketCount, error: ticketError } = await supabase
      .from("guild_ticket_settings")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (ticketError) {
      console.warn(
        `[⚠️ DB WARNING - guild_ticket_settings 조회 실패] ` +
        `Code: ${ticketError.code} | Message: ${ticketError.message}. ` +
        `티켓 개수를 0으로 안전하게 우회합니다.`
      );
      activeTicketsCount = 0;
    } else {
      activeTicketsCount = ticketCount || 0;
    }

    // 5. 🛡️ [Custom Commands 직접 집계] Database Rows 카드 대체 지표!
    let customCommandCount = 0;
    const { count: cmdCount, error: cmdError } = await supabase
      .from("custom_commands")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (cmdError) {
      console.warn(
        `[⚠️ DB WARNING - custom_commands 조회 실패] ` +
        `Code: ${cmdError.code} | Message: ${cmdError.message}. ` +
        `커맨드 수를 0으로 우회합니다.`
      );
      customCommandCount = 0;
    } else {
      customCommandCount = cmdCount || 0;
    }

    // 6. 페이로드 조립 - 각 지표가 서로 겹치지 않는 완전 독립형 카운트 (가짜 증감률 코드 완전 삭제!)
    const guildTelemetryPayload = {
      custom_commands: customCommandCount,
      rag_synapses: ragVectorsCount,
      active_tickets: activeTicketsCount,
      automod_logs: automodLogCount,
    };

    // 🏎️ CACHE COMPARTMENTALIZATION: Store snapshot inside isolation segment mapping
    guildCacheMap.set(guildId, {
      data: guildTelemetryPayload,
      timestamp: currentTime
    });

    return NextResponse.json(guildTelemetryPayload);
  } catch (error: any) {
    console.error(`[METRICS MULTI-TENANT ERROR] Failure on node ${guildId}:`, error);
    return NextResponse.json(
      { status: "error", message: "Failed isolating tenant matrix statistics" },
      { status: 500 }
    );
  }
}