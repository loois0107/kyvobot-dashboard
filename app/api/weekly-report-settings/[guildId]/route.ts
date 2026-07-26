import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { invalidateGuildSettings } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const DEFAULT_WEEKLY_REPORT_SETTINGS = { enabled: false, channel_id: '' };

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 현재 weekly_report_settings를 반환한다 (없으면 기본값).
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase.from('guild_settings').select('settings').eq('guild_id', guildId).maybeSingle();
  if (error) {
    console.error('[WEEKLY_REPORT_SETTINGS][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  const reportSettings = data?.settings?.weekly_report_settings || {};
  return NextResponse.json({
    status: 'success',
    weekly_report_settings: { ...DEFAULT_WEEKLY_REPORT_SETTINGS, ...reportSettings },
  });
}

/**
 * POST: enabled/channel_id를 검증 후 저장한다. last_sent_at은 봇이 발송 성공 시에만 기록하는
 * 내부 상태라 여기서는 절대 건드리지 않는다 (덮어쓰면 중복 발송/영구 미발송으로 이어질 수 있음).
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

  const enabled = Boolean(body.enabled);
  const channelId = typeof body.channel_id === 'string' ? body.channel_id.trim() : '';

  if (enabled && !channelId) {
    return NextResponse.json({ status: 'error', message: 'A channel ID is required when weekly reports are enabled.' }, { status: 400 });
  }
  if (channelId && !/^\d+$/.test(channelId)) {
    return NextResponse.json({ status: 'error', message: 'Channel ID must be a numeric Discord ID.' }, { status: 400 });
  }

  const { data: currentData, error: fetchError } = await supabase
    .from('guild_settings')
    .select('settings')
    .eq('guild_id', guildId)
    .maybeSingle();
  if (fetchError) {
    console.error('[WEEKLY_REPORT_SETTINGS][ERROR]', fetchError);
    return NextResponse.json({ status: 'error', message: fetchError.message }, { status: 500 });
  }

  const currentSettings = currentData?.settings || {};
  const existingReportSettings = currentSettings.weekly_report_settings || {};
  const updatedReportSettings = { ...existingReportSettings, enabled, channel_id: channelId };
  const updatedSettings = { ...currentSettings, weekly_report_settings: updatedReportSettings };

  const { error: upsertError } = await supabase.from('guild_settings').upsert({ guild_id: guildId, settings: updatedSettings });
  if (upsertError) {
    console.error('[WEEKLY_REPORT_SETTINGS][ERROR]', upsertError);
    return NextResponse.json({ status: 'error', message: upsertError.message }, { status: 500 });
  }

  await invalidateGuildSettings(String(guildId));

  return NextResponse.json({ status: 'success', weekly_report_settings: updatedReportSettings });
}
