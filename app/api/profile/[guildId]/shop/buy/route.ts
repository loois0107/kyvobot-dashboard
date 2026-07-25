import { NextResponse } from 'next/server';
import { requireLogin, requireGuildMembership } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const REASON_MESSAGES: Record<string, string> = {
  locked: 'A purchase is already being processed for your account. Please wait a moment and try again.',
  item_not_found: 'That item no longer exists in the shop.',
  item_misconfigured: "This item is misconfigured (invalid price) and can't be purchased right now.",
  save_failed: 'Purchase could not be saved due to a database error. No points were deducted.',
};

/**
 * POST: { item_name } 을 받아 봇의 내부 웹훅(cogs/economy.py의 _process_purchase)에 위임한다.
 * 실제 포인트 차감/인벤토리 지급 로직은 여기서 절대 직접 하지 않는다 - /shop buy 커맨드와 완전히
 * 동일한 코드 경로를 타야 검증 로직과 active_transactions 동시성 락을 그대로 공유할 수 있다.
 * user_id는 세션에서만 가져오고, 요청 바디로는 절대 받지 않는다(IDOR 방지).
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

  const itemName = body?.item_name;
  if (!itemName || typeof itemName !== 'string') {
    return NextResponse.json({ status: 'error', message: 'item_name is required.' }, { status: 400 });
  }

  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ status: 'error', message: 'Server configuration error (missing bot integration settings).' }, { status: 500 });
  }

  let buyRes: Response;
  try {
    buyRes = await fetch(`${baseUrl}/internal/economy/shop-buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({ guild_id: guildId, user_id: userId, item_name: itemName }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[SHOP][ERROR] Purchase webhook call failed:', err);
    return NextResponse.json({ status: 'error', message: 'Could not reach the bot to process this purchase. Is it online?' }, { status: 502 });
  }

  let buyBody: any = null;
  try {
    buyBody = await buyRes.json();
  } catch {
    // no body
  }

  if (!buyRes.ok) {
    if (buyRes.status === 400 && buyBody?.status === 'insufficient_points') {
      return NextResponse.json({
        status: 'error',
        message: `You need ${buyBody.required_points.toLocaleString()} ${buyBody.currency_name}, but only have ${buyBody.current_points.toLocaleString()}.`,
        reason: 'insufficient_points',
        current_points: buyBody.current_points,
        required_points: buyBody.required_points,
      }, { status: 400 });
    }
    const message = REASON_MESSAGES[buyBody?.status] || `The bot rejected this purchase (${buyRes.status}).`;
    return NextResponse.json({ status: 'error', message, reason: buyBody?.status }, { status: buyRes.status === 403 ? 502 : buyRes.status });
  }

  return NextResponse.json({
    status: 'success',
    item_name: buyBody.item_name,
    price: buyBody.price,
    currency_name: buyBody.currency_name,
    remaining_points: buyBody.remaining_points,
  });
}
