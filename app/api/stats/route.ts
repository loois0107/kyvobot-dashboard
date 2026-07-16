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

  // 🛡️ Security Isolation: Verify Administrator Permission (Non-negotiable primary defense line)
  const isAdmin = await verifyGuildAdmin(guildId);
  if (!isAdmin) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized. You do not have permission to manage this server." },
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

    // 1. Fetch basic guild settings (To verify server existence)
    const { data: guildData, error: guildError } = await supabase
      .from("guild_settings")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (guildError) {
      console.error("[🔴 DB ERROR - Failed to query guild_settings table]:", guildError);
      throw guildError;
    }

    // 2. 🛡️ Aggregate total automod logs per server (Guarantees absolute isolation)
    let automodLogCount = 0;
    const { count: logCount, error: logError } = await supabase
      .from("automod_logs")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (logError) {
      console.warn(
        `[⚠️ DB WARNING - Failed to query automod_logs] ` +
        `Code: ${logError.code} | Message: ${logError.message}. ` +
        `Falling back log count to 0.`
      );
      automodLogCount = 0;
    } else {
      automodLogCount = logCount || 0;
    }

    // 3. 🛡️ [RAG Vectors Direct Count] Directly aggregate from guild_knowledge table!
    let ragVectorsCount = 0;
    const { count: ragCount, error: ragError } = await supabase
      .from("guild_knowledge")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (ragError) {
      console.warn(
        `[⚠️ DB WARNING - Failed to query guild_knowledge] ` +
        `Code: ${ragError.code} | Message: ${ragError.message}. ` +
        `Safely falling back RAG count to 0.`
      );
      ragVectorsCount = 0;
    } else {
      ragVectorsCount = ragCount || 0;
    }

    // 4. 🛡️ [Active Tickets Direct Count] Directly aggregate from guild_ticket_settings table! (Eliminates false positives)
    let activeTicketsCount = 0;
    const { count: ticketCount, error: ticketError } = await supabase
      .from("guild_ticket_settings")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (ticketError) {
      console.warn(
        `[⚠️ DB WARNING - Failed to query guild_ticket_settings] ` +
        `Code: ${ticketError.code} | Message: ${ticketError.message}. ` +
        `Safely falling back ticket count to 0.`
      );
      activeTicketsCount = 0;
    } else {
      activeTicketsCount = ticketCount || 0;
    }

    // 5. 🛡️ [Custom Commands Direct Count] Database Rows Card Alternative Metric!
    let customCommandCount = 0;
    const { count: cmdCount, error: cmdError } = await supabase
      .from("custom_commands")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", guildId);

    if (cmdError) {
      console.warn(
        `[⚠️ DB WARNING - Failed to query custom_commands] ` +
        `Code: ${cmdError.code} | Message: ${cmdError.message}. ` +
        `Falling back custom command count to 0.`
      );
      customCommandCount = 0;
    } else {
      customCommandCount = cmdCount || 0;
    }

    // 6. Assemble Payload - Fully independent counters per metric (Fake growth rate codes completely removed!)
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