import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/botGuilds';

export const dynamic = 'force-dynamic';

/**
 * GET: 봇이 실제로 초대되어 있는 전체 서버 목록(id+name)을 반환한다. requireOwner로 개발자
 * 본인만 통과 - 다른 서버 관리자에게는 절대 노출되면 안 되는, 길드 무관 전역 정보다.
 */
export async function GET() {
  const ownerResult = await requireOwner();
  if (ownerResult instanceof NextResponse) return ownerResult;

  const guilds = await fetchBotGuilds();
  if (guilds === null) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch the bot guild list from Discord.' }, { status: 502 });
  }

  return NextResponse.json({ status: 'success', guilds });
}
