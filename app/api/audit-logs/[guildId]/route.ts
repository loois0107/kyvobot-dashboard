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

/**
 * GET: 이 길드의 최근 automod 조치 로그를 반환한다. 실제 automod_logs 테이블 컬럼은
 * guild_id/user_id/action/reason/created_at뿐이다 - user_name/moderator_name 같은 컬럼은
 * 존재한 적이 없고(예전 페이지가 보여주던 이름들은 전부 가짜 플레이스홀더였다), automod는
 * 항상 봇이 자동으로 수행하므로 "조치한 사람" 개념 자체가 없다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase
    .from('automod_logs')
    .select('id, user_id, action, reason, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    console.error('[AUDIT_LOGS][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', logs: data || [] });
}
