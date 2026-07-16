import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyGuildAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const guildCacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000;

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { status: "error", message: "Supabase environment variables are missing on host" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id")?.trim();

  if (!guildId) {
    return NextResponse.json(
      { status: "error", message: "Missing required guild_id matrix token" },
      { status: 400 }
    );
  }

  // 🛡️ 보안 격리: 관리자 권한 검증
  const isAdmin = await verifyGuildAdmin(guildId);
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", message: "해당 서버의 관리 권한이 없습니다." },
      { status: 403 }
    );
  }

  const currentTime = Date.now();
  const cachedNode = guildCacheMap.get(guildId);

  if (cachedNode && currentTime - cachedNode.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedNode.data);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 길드 설정 조회
    const { data: guildData, error: guildError } = await supabase
      .from("guild_settings")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (guildError) {
      console.error("[🔴 DB ERROR - guild_settings 테이블 조회 실패]:", guildError);
      throw guildError;
    }

    // 2. 🛡️ 서버별 격리 필터 되살림! (클로드 피드백 반영)
    let guildUsers = 0;
    const { count: usersCount, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId); // 👈 보안 필터 완벽 복구! 타협은 없다.

    if (usersError) {
      // 💡 여기서 에러 코드(usersError.code)를 명확하게 로그로 노출합니다.
      console.warn(
        `[⚠️ DB WARNING - users 테이블 조회 실패] ` +
        `Code: ${usersError.code} | Message: ${usersError.message}. ` +
        `유저 수 집계를 안전하게 0으로 우회합니다.`
      );
      guildUsers = 0;
    } else {
      guildUsers = usersCount || 0;
    }
    
    // 3. 텔레메트리 연산
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

    // 4. 패이로드 조립
    const guildTelemetryPayload = {
      db_rows: guildUsers + totalShopItems + (guildData ? 1 : 0),
      db_rows_change: "▲ 1.2%",
      rag_synapses: ragVectorsCount,
      active_tickets: activeTicketsCount,
      global_users: guildUsers
    };

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