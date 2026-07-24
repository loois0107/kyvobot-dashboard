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

const DEFAULT_CARD = {
  card_color: '#5865F2',
  card_bg_color: '#1E1F22',
  overlay_opacity: 0.6,
  background_url: '',
};

/**
 * GET: 서버 기본값(guild_settings.leveling_settings)과 이 유저의 개인 오버라이드
 * (user_card_overrides)를 둘 다 돌려준다 - 프론트는 "무엇이 서버 기본값이고 무엇을 내가
 * 바꿨는지" 구분해서 보여줄 수 있다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  const { data: settingsRow, error: settingsError } = await supabase
    .from('guild_settings')
    .select('settings')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (settingsError) {
    console.error('[PROFILE_CARD][ERROR]', settingsError);
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const levelingSettings = settingsRow?.settings?.leveling_settings || {};
  const guildDefaults = {
    card_color: levelingSettings.card_color || DEFAULT_CARD.card_color,
    card_bg_color: levelingSettings.card_bg_color || DEFAULT_CARD.card_bg_color,
    overlay_opacity: levelingSettings.overlay_opacity ?? DEFAULT_CARD.overlay_opacity,
    background_url: levelingSettings.background_url || DEFAULT_CARD.background_url,
  };

  const { data: overrideRow, error: overrideError } = await supabase
    .from('user_card_overrides')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (overrideError) {
    console.error('[PROFILE_CARD][ERROR]', overrideError);
    return NextResponse.json({ error: overrideError.message }, { status: 500 });
  }

  return NextResponse.json({
    guild_defaults: guildDefaults,
    user_override: overrideRow
      ? {
          card_color: overrideRow.card_color,
          card_bg_color: overrideRow.card_bg_color,
          overlay_opacity: overrideRow.overlay_opacity,
          background_url: overrideRow.background_url,
        }
      : null,
  });
}

/**
 * POST: 이 유저의 오버라이드를 통째로 upsert한다. user_id는 요청 바디에서 절대 받지 않고
 * 오직 세션에서만 가져온다 - 다른 유저의 user_id를 보내도 반영될 자리가 애초에 없다.
 * 필드를 null/빈 문자열로 보내면 "그 필드는 서버 기본값을 쓰겠다"는 뜻으로 저장한다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  try {
    const body = await request.json();
    const { card_color, card_bg_color, overlay_opacity, background_url } = body;

    const { error } = await supabase.from('user_card_overrides').upsert(
      {
        guild_id: guildId,
        user_id: userId,
        card_color: card_color || null,
        card_bg_color: card_bg_color || null,
        overlay_opacity: overlay_opacity === '' || overlay_opacity === undefined ? null : Number(overlay_opacity),
        background_url: background_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guild_id,user_id' }
    );

    if (error) {
      console.error('[PROFILE_CARD][ERROR]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PROFILE_CARD][ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
