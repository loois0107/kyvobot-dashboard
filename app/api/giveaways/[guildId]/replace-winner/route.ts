import { NextResponse } from 'next/server';
import { requireLogin, requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const REASON_MESSAGES: Record<string, string> = {
  not_concluded: 'This giveaway is not concluded yet.',
  not_a_winner: 'That user is not currently a recorded winner of this giveaway.',
  no_remaining_entrants: 'No other entrants are left to replace this winner with.',
  already_replaced: 'This winner was already replaced (possibly by another admin just now).',
  giveaway_not_found: 'That giveaway no longer exists.',
  error: 'A database error occurred while processing this replacement.',
};

/**
 * POST: { giveaway_id, original_winner_id, reason } - 발표된 당첨자 한 명을 다른 응모자로
 * 교체한다. 봇의 내부 웹훅(cogs/giveaway.py의 _replace_winner)에 위임 - 포인트 회수/지급,
 * 역할 지급, 공지 채널 정정 메시지, 감사 기록까지 전부 봇 쪽에서 원자적으로 처리된다.
 * 실제 처리 관리자(admin_id)는 세션에서만 가져온다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const loginResult = await requireLogin();
  if (loginResult instanceof NextResponse) return loginResult;
  const { userId } = loginResult;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const giveawayId = body?.giveaway_id;
  const originalWinnerId = body?.original_winner_id;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (!giveawayId || !originalWinnerId) {
    return NextResponse.json({ status: 'error', message: 'giveaway_id and original_winner_id are required.' }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ status: 'error', message: 'A reason is required for the audit log.' }, { status: 400 });
  }

  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ status: 'error', message: 'Server configuration error (missing bot integration settings).' }, { status: 500 });
  }

  let replaceRes: Response;
  try {
    replaceRes = await fetch(`${baseUrl}/internal/giveaway/replace-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({
        guild_id: guildId, giveaway_id: giveawayId, original_winner_id: originalWinnerId,
        admin_id: userId, reason,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[GIVEAWAY][ERROR] Replace-winner webhook call failed:', err);
    return NextResponse.json({ status: 'error', message: 'Could not reach the bot to process this replacement. Is it online?' }, { status: 502 });
  }

  let replaceBody: any = null;
  try {
    replaceBody = await replaceRes.json();
  } catch {
    // no body
  }

  if (!replaceRes.ok) {
    const message = REASON_MESSAGES[replaceBody?.status] || `The bot rejected this request (${replaceRes.status}).`;
    return NextResponse.json({ status: 'error', message, reason: replaceBody?.status }, { status: replaceRes.status === 403 ? 502 : replaceRes.status });
  }

  return NextResponse.json({
    status: 'success',
    new_winner_id: replaceBody.new_winner_id,
    prize_type: replaceBody.prize_type,
    role_note: replaceBody.role_note,
    payout_ok: replaceBody.payout_ok,
  });
}
