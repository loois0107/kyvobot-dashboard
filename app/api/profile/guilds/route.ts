import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { requireLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

/**
 * 개인 대시보드용 길드 선택 목록. /api/guilds(관리자 전용, MANAGE_GUILD 필터)와 달리
 * 관리자 권한은 요구하지 않고 "멤버인 서버"만 필터한다. 다만 봇이 한 번도 안 쓰인 서버까지
 * 보여주는 건 의미가 없으므로(guild_settings 행이 없으면 봇이 그 서버에 실제로 존재한 적이
 * 없다는 뜻) guild_settings에 행이 있는 서버로 한 번 더 좁힌다. 이건 보안 목적이 아니라
 * (그건 API 라우트의 requireGuildMembership이 담당) UX상 무의미한 선택지를 안 보여주기 위함.
 */
export async function GET() {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;

  const session = await auth();
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ status: 'error', message: 'Login required.' }, { status: 401 });
  }

  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error('[PROFILE_GUILDS][ERROR] 디스코드 길드 조회 실패:', res.status);
    return NextResponse.json({ status: 'error', message: 'Failed to load Discord guild list' }, { status: 502 });
  }

  const guilds: DiscordGuild[] = await res.json();
  if (guilds.length === 0) return NextResponse.json([]);

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  const { data, error } = await supabase
    .from('guild_settings')
    .select('guild_id')
    .in('guild_id', guilds.map((g) => g.id));

  if (error) {
    console.error('[PROFILE_GUILDS][ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const botPresentIds = new Set((data || []).map((row) => row.guild_id));
  const eligible = guilds
    .filter((g) => botPresentIds.has(g.id))
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));

  return NextResponse.json(eligible);
}
