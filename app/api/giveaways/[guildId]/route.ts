import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

// reaction-roles/[guildId]/route.ts와 동일한 패턴 - 각 라우트가 자기 완결적이도록 복제한다.
async function fetchGuildRoles(guildId: string): Promise<Array<{ id: string; name: string }> | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}

interface WinnerInfo {
  user_id: string;
  username: string | null;
  in_server: boolean;
}

// 길드 멤버 엔드포인트로 조회한다(단순 유저 조회가 아니라) - 404면 "이 서버를 나갔다"는 뜻이라,
// 재추첨 사유(자격 문제/서버 이탈)를 관리자가 바로 판단할 수 있게 해준다.
async function fetchWinnerInfo(guildId: string, userId: string): Promise<WinnerInfo> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return { user_id: userId, username: null, in_server: false };
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return { user_id: userId, username: null, in_server: false };
    const data = await res.json();
    const username = data.user?.global_name || data.user?.username || data.nick || null;
    return { user_id: userId, username, in_server: true };
  } catch {
    return { user_id: userId, username: null, in_server: false };
  }
}

/**
 * GET: 이미 마감되고(status='concluded') 당첨자가 있는 추첨 목록을 반환한다 - 재추첨 UI 전용.
 * 진행 중인 추첨은 여기서 다루지 않는다(조기 마감은 /giveaway end 명령어 전용).
 * 당첨자는 이미 채널에 공개 발표된 정보라 익명 제보와 달리 user_id 노출에 제약이 없다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase
    .from('giveaways')
    .select('id, prize, prize_type, prize_amount, prize_role_id, winners, concluded_at')
    .eq('guild_id', guildId)
    .eq('status', 'concluded')
    .order('concluded_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GIVEAWAY][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  // 컬럼 타입(jsonb array)에 상관없이 안전하게 걸러내기 위해 DB 필터 대신 여기서 빈 배열을 뺀다.
  const rows = (data || []).filter((row) => Array.isArray(row.winners) && row.winners.length > 0);
  const roles = await fetchGuildRoles(guildId);
  const roleById = new Map((roles || []).map((r) => [r.id, r.name]));

  const giveaways = await Promise.all(
    rows.map(async (row) => {
      const winnerIds: string[] = Array.isArray(row.winners) ? row.winners : [];
      const winners = await Promise.all(winnerIds.map((uid) => fetchWinnerInfo(guildId, uid)));
      return {
        id: row.id,
        prize: row.prize,
        prize_type: row.prize_type,
        prize_amount: row.prize_amount,
        prize_role_id: row.prize_role_id,
        prize_role_name: row.prize_role_id ? roleById.get(row.prize_role_id) || null : null,
        concluded_at: row.concluded_at,
        winners,
      };
    })
  );

  return NextResponse.json({ status: 'success', giveaways });
}
