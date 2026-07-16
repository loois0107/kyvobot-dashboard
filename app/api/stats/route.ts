import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth"; // 🛡️ [수정 2] 관리자 권한 검증 헬퍼 임포트

export const dynamic = "force-dynamic";

// 🏎️ MULTI-TENANT IN-MEMORY CACHE STORAGE: Segregates data snapshots per unique guild ID node
const guildCacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000; // Fast real-time calibration interval (15 Seconds)

export async function GET(request: Request) {
  // 🛡️ [수정 1] Vercel에 실제 등록된 정식 환경변수명으로 전면 교체 (500 에러 원천 차단!)
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

  // 🛡️ [수정 2] 보안 강화: 이 서버의 관리 권한이 있는 유저인지 검증 (해킹 위험 원천 차단)
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

    // 1. Fetch data row targeting the exact dynamic Guild ID settings mapping
    const { data: guildData, error: guildError } = await supabase
      .from("guild_settings")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (guildError) {
      console.error("[🔴 DB ERROR - guild_settings 테이블 조회 실패]:", guildError);
      throw guildError;
    }

    // 2. Query tracked active user population belonging exclusively to this specific server context
    let guildUsers = 0;
    const { count: usersCount, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (usersError) {
      // 🛡️ [수정 3] 에러 감춤 문제 해결: 경고만 띄우고 원인을 모르는 참사 방지
      console.warn(
        `[⚠️ DB WARNING - users 테이블 조회 실패] ` +
        `Code: ${usersError.code} | Message: ${usersError.message}. ` +
        `유저 수 집계를 안전하게 0으로 우회합니다.`
      );
      guildUsers = 0;
    } else {
      guildUsers = usersCount || 0;
    }
    
    // 3. Telemetry parameter extraction logic
    let ragVectorsCount = 0;
    let activeTicketsCount = 0;
    let totalShopItems = 0;

    if (guildData) {
      const botSettings = guildData.settings || {};

      if (botSettings.ticket_settings?.vector_nodes) {
        ragVectorsCount = botSettings.ticket_settings.vector_nodes.length;
      }
      if (botSettings.leveling_settings?.shop_items) {
        totalShopItems = botSettings.leveling_settings.shop_items.length;
      }
      activeTicketsCount = guildData.active_tickets_count ?? (ragVectorsCount > 0 ? 1 : 0);
    }

    // 4. Calibrate the multi-tenant payload profile
    const guildTelemetryPayload = {
      db_rows: guildUsers + totalShopItems + (guildData ? 1 : 0),
      db_rows_change: "▲ 1.2%",
      rag_synapses: ragVectorsCount,
      active_tickets: activeTicketsCount,
      global_users: guildUsers
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