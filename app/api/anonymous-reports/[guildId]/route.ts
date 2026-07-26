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
 * GET: 대기 중(status='pending')인 익명 제보 목록을 반환한다.
 * 🛡️ [익명성 보장] user_id는 SELECT 절 자체에서 뺀다 - '*'를 쓰지 않는 이유가 바로 이것이다.
 * resolved_by(처리한 관리자)는 익명이 아니므로 포함해도 되지만, pending 행에서는 항상 null이라
 * 의미가 없어 응답에서 자체적으로 제외했다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase
    .from('anonymous_reports')
    .select('id, content, status, created_at')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ANON_REPORT][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', reports: data || [] });
}
