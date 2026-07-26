import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { validatePartyGamePreset, checkPresetCountCap, checkDuplicateName } from '@/lib/partyPresets';
import { validateThumbnailUrl } from '@/lib/partyThumbnail';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 이 길드의 게임 프리셋 목록을 반환한다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase.from('party_game_presets').select('*').eq('guild_id', guildId).order('created_at', { ascending: true });
  if (error) {
    console.error('[PARTY_PRESETS][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', presets: data || [] });
}

/**
 * POST: 프리셋을 추가하거나(game_name이 새로우면) 수정한다(기존 game_name이면 덮어씀).
 * party_tier_roles와 동일하게 (guild_id, game_name) upsert - 새 프리셋일 때만 개수 상한을 검사한다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const validation = validatePartyGamePreset(body);
  if (!validation.valid) {
    return NextResponse.json({ status: 'error', message: validation.errors!.join(' ') }, { status: 400 });
  }
  const preset = validation.preset!;

  const thumbnailCheck = await validateThumbnailUrl(preset.card_thumbnail_url);
  if (!thumbnailCheck.valid) {
    return NextResponse.json({ status: 'error', message: thumbnailCheck.error }, { status: 400 });
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('party_game_presets').select('game_name').eq('guild_id', guildId);
  if (fetchError) {
    console.error('[PARTY_PRESETS][ERROR]', fetchError);
    return NextResponse.json({ status: 'error', message: fetchError.message }, { status: 500 });
  }

  const existingNames = (existingRows || []).map((r) => r.game_name);
  const isNewPreset = !existingNames.includes(preset.game_name);
  const capCheck = checkPresetCountCap(existingNames.length, isNewPreset);
  if (!capCheck.ok) {
    return NextResponse.json({ status: 'error', message: capCheck.error }, { status: 400 });
  }

  // 🛡️ "조용히 범위 밖 값을 허용하지 않는다" 원칙 - 대소문자만 다른 프리셋이 경고 없이 따로
  // 만들어지던 문제. 정확히 같은 이름(자기 자신 수정)은 통과시키고, 대소문자만 다른 새 이름만 거부한다.
  const duplicateCheck = checkDuplicateName(existingNames, preset.game_name);
  if (!duplicateCheck.ok) {
    return NextResponse.json({ status: 'error', message: duplicateCheck.error }, { status: 400 });
  }

  const { error: upsertError } = await supabase
    .from('party_game_presets')
    .upsert({ guild_id: guildId, ...preset }, { onConflict: 'guild_id,game_name' });
  if (upsertError) {
    console.error('[PARTY_PRESETS][ERROR]', upsertError);
    return NextResponse.json({ status: 'error', message: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success', preset });
}

/**
 * DELETE: ?game_name=... 으로 지정된 프리셋 하나를 지운다.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const gameName = url.searchParams.get('game_name');
  if (!gameName) {
    return NextResponse.json({ status: 'error', message: 'game_name query parameter is required.' }, { status: 400 });
  }

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { error } = await supabase.from('party_game_presets').delete().eq('guild_id', guildId).eq('game_name', gameName);
  if (error) {
    console.error('[PARTY_PRESETS][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success' });
}
