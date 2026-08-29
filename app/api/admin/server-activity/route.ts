import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOwner } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/botGuilds';

export const dynamic = 'force-dynamic';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// 🛡️ [계산 가능한 지표만] party_participants는 자체 guild_id/타임스탬프가 없어 recruitment_id로
// 조인해야 하고 그마저도 "참가 시각"이 아니라 "그 모집의 생성 시각"이라 신뢰할 수 없다.
// 커스텀 명령어는 정의(guild_settings.settings.custom_commands)만 있고 실행 이력 자체가
// 없어서 애초에 집계 불가. 레벨링(users.updated_at)은 앱 코드가 이 컬럼을 직접 쓰는 곳이 없어
// DB 트리거로 자동 갱신되는지 확인 전이라 - 확인 전까지는 넣지 않는다(불확실한 신호를 "활성"
// 판정에 섞으면 오히려 신뢰를 깎아먹는다). 그래서 이 3개 테이블만 쓴다.
const ACTIVITY_TABLES = ['automod_logs', 'party_recruitments', 'inquiries'] as const;

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

interface GuildActivity {
  id: string;
  name: string;
  active7d: boolean;
  active30d: boolean;
  lastActiveAt: string | null;
}

/**
 * GET: 봇이 초대된 전체 서버 각각에 대해 "최근 7일/30일 내 활동 있음" 여부를 계산한다.
 *
 * 🛡️ [서버별 반복 쿼리 금지] 서버 수만큼 테이블별로 쿼리를 반복하면 서버가 늘어날수록 쿼리
 * 수도 같이 늘어난다 - 대신 테이블마다 `guild_id IN (전체 서버 id 목록)` 조건으로 딱 1번씩만
 * 조회(총 3번, 서버 개수와 무관하게 고정)하고, 그 결과를 메모리에서 guild_id별로 묶어
 * 7일/30일 컷오프와 비교한다. 30일 컷오프보다 최근인 행만 가져오면 그 결과 안에서 7일 컷오프
 * 비교도 그대로 되므로(7일 활성이면 30일 활성의 부분집합) 컷오프별로 따로 쿼리할 필요가 없다.
 */
export async function GET() {
  const ownerResult = await requireOwner();
  if (ownerResult instanceof NextResponse) return ownerResult;

  const guilds = await fetchBotGuilds();
  if (guilds === null) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch the bot guild list from Discord.' }, { status: 502 });
  }
  if (guilds.length === 0) {
    return NextResponse.json({ status: 'success', servers: [] });
  }

  const supabase = connectSupabase();
  if (!supabase) {
    return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });
  }

  const guildIds = guilds.map((g) => g.id);
  const cutoff30Iso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const results = await Promise.all(
    ACTIVITY_TABLES.map((table) =>
      supabase.from(table).select('guild_id, created_at').in('guild_id', guildIds).gte('created_at', cutoff30Iso)
    )
  );

  for (const [i, res] of results.entries()) {
    if (res.error) {
      console.error(`[SERVER_ACTIVITY][ERROR] Query failed for table ${ACTIVITY_TABLES[i]}:`, res.error);
      return NextResponse.json({ status: 'error', message: res.error.message }, { status: 500 });
    }
  }

  // guild_id -> 이 서버에서 관측된 모든 활동 timestamp(문자열, ISO) 목록
  const timestampsByGuild = new Map<string, string[]>();
  for (const res of results) {
    for (const row of res.data ?? []) {
      const list = timestampsByGuild.get(row.guild_id) ?? [];
      list.push(row.created_at);
      timestampsByGuild.set(row.guild_id, list);
    }
  }

  const cutoff7Ms = Date.now() - SEVEN_DAYS_MS;

  const servers: GuildActivity[] = guilds.map((g) => {
    const timestamps = timestampsByGuild.get(g.id) ?? [];
    const active30d = timestamps.length > 0;
    const active7d = timestamps.some((ts) => new Date(ts).getTime() >= cutoff7Ms);
    const lastActiveAt = timestamps.length > 0
      ? timestamps.reduce((latest, ts) => (ts > latest ? ts : latest))
      : null;
    return { id: g.id, name: g.name, active7d, active30d, lastActiveAt };
  });

  return NextResponse.json({ status: 'success', servers });
}
