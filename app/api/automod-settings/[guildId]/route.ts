import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { invalidateGuildSettings } from '@/lib/redis';
import { validateAutomodSettings, DEFAULT_AUTOMOD_SETTINGS } from '@/lib/automodSettings';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 현재 automod_settings를 반환한다 (없으면 기본값 - 기존 하드코딩 동작과 동일).
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase.from('guild_settings').select('settings').eq('guild_id', guildId).maybeSingle();
  if (error) {
    console.error('[AUTOMOD_SETTINGS][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  const automodSettings = data?.settings?.automod_settings || {};
  return NextResponse.json({
    status: 'success',
    automod_settings: { ...DEFAULT_AUTOMOD_SETTINGS, ...automodSettings },
  });
}

/**
 * POST: automod_settings를 검증 후 저장한다. 범위를 벗어나면 저장 자체를 거부한다
 * (party_settings와 동일한 정신 - 조용히 clamp하지 않는다).
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

  const validation = validateAutomodSettings(body);
  if (!validation.valid) {
    return NextResponse.json({ status: 'error', message: validation.errors!.join(' ') }, { status: 400 });
  }

  // 🛡️ 다른 모듈(party_settings/voice_settings 등)의 설정을 지우지 않기 위해 기존 settings를 먼저 긁어온다.
  const { data: currentData, error: fetchError } = await supabase
    .from('guild_settings')
    .select('settings')
    .eq('guild_id', guildId)
    .maybeSingle();
  if (fetchError) {
    console.error('[AUTOMOD_SETTINGS][ERROR]', fetchError);
    return NextResponse.json({ status: 'error', message: fetchError.message }, { status: 500 });
  }

  const currentSettings = currentData?.settings || {};
  const updatedSettings = { ...currentSettings, automod_settings: validation.settings };

  const { error: upsertError } = await supabase.from('guild_settings').upsert({ guild_id: guildId, settings: updatedSettings });
  if (upsertError) {
    console.error('[AUTOMOD_SETTINGS][ERROR]', upsertError);
    return NextResponse.json({ status: 'error', message: upsertError.message }, { status: 500 });
  }

  await invalidateGuildSettings(String(guildId));

  return NextResponse.json({ status: 'success', automod_settings: validation.settings });
}
