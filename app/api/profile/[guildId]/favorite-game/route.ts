import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLogin, requireGuildMembership } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 이 유저의 현재 즐겨찾기 게임 + 이 서버에서 고를 수 있는 프리셋 목록을 반환한다.
 * 봇 웹훅 없이 대시보드가 직접 처리한다 - Discord 부작용(메시지 편집 등)이 없는 순수 개인
 * 설정 저장이라 party.py의 다른 웹훅들과 달리 위임할 이유가 없다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const [{ data: prefRow, error: prefError }, { data: presetRows, error: presetError }] = await Promise.all([
    supabase.from('user_party_preferences').select('favorite_game_name').eq('guild_id', guildId).eq('user_id', userId).maybeSingle(),
    supabase.from('party_game_presets').select('game_name').eq('guild_id', guildId).order('created_at', { ascending: true }),
  ]);

  if (prefError) {
    console.error('[PARTY_FAVORITE][ERROR]', prefError);
    return NextResponse.json({ status: 'error', message: prefError.message }, { status: 500 });
  }
  if (presetError) {
    console.error('[PARTY_FAVORITE][ERROR]', presetError);
    return NextResponse.json({ status: 'error', message: presetError.message }, { status: 500 });
  }

  return NextResponse.json({
    status: 'success',
    favorite_game_name: prefRow?.favorite_game_name || null,
    presets: (presetRows || []).map((p) => p.game_name),
  });
}

/**
 * POST: { game_name } - 이 길드의 실제 프리셋 목록에 있는 값만 저장 가능(자유 텍스트 아님).
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const gameName = body?.game_name;
  if (!gameName || typeof gameName !== 'string') {
    return NextResponse.json({ status: 'error', message: 'game_name is required.' }, { status: 400 });
  }

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data: preset, error: presetError } = await supabase
    .from('party_game_presets').select('game_name').eq('guild_id', guildId).eq('game_name', gameName).maybeSingle();
  if (presetError) {
    console.error('[PARTY_FAVORITE][ERROR]', presetError);
    return NextResponse.json({ status: 'error', message: presetError.message }, { status: 500 });
  }
  if (!preset) {
    return NextResponse.json({ status: 'error', message: 'That game is not a saved preset in this server.' }, { status: 400 });
  }

  const { error } = await supabase.from('user_party_preferences').upsert({
    guild_id: guildId, user_id: userId, favorite_game_name: gameName, updated_at: new Date().toISOString(),
  }, { onConflict: 'guild_id,user_id' });

  if (error) {
    console.error('[PARTY_FAVORITE][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', favorite_game_name: gameName });
}

/**
 * DELETE: 즐겨찾기 해제.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { error } = await supabase.from('user_party_preferences').delete().eq('guild_id', guildId).eq('user_id', userId);
  if (error) {
    console.error('[PARTY_FAVORITE][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success' });
}
