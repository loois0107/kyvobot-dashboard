import { NextResponse } from 'next/server';
import { requireLogin, requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_ACTIONS = ['approve', 'reject', 'block'];

const REASON_MESSAGES: Record<string, string> = {
  already_resolved: 'This report was already resolved (possibly by someone else just now).',
  report_not_found: 'That report no longer exists.',
  invalid_action: 'Invalid action.',
  db_error: 'A database error occurred while processing this report.',
};

/**
 * POST: { report_id, action } - 승인/거절/차단을 봇의 내부 웹훅(cogs/anonymous_reports.py의
 * _finalize_report)에 위임한다. 여기서 DB를 직접 건드리지 않는 이유: (1) 상태 변경 로직을
 * TS로 복제하지 않기 위함, (2) 디스코드 관리자 큐 메시지의 버튼 제거는 봇만 할 수 있음.
 * user_id(제보자)는 요청/응답 어디에도 없다 - 봇이 내부적으로만 조회해서 차단 처리에 쓴다.
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

  const reportId = body?.report_id;
  const action = body?.action;
  if (!reportId || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ status: 'error', message: 'report_id and a valid action (approve/reject/block) are required.' }, { status: 400 });
  }

  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ status: 'error', message: 'Server configuration error (missing bot integration settings).' }, { status: 500 });
  }

  let decideRes: Response;
  try {
    decideRes = await fetch(`${baseUrl}/internal/anonymous-reports/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({ guild_id: guildId, report_id: reportId, action, admin_id: userId }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[ANON_REPORT][ERROR] Decide webhook call failed:', err);
    return NextResponse.json({ status: 'error', message: 'Could not reach the bot to process this decision. Is it online?' }, { status: 502 });
  }

  let decideBody: any = null;
  try {
    decideBody = await decideRes.json();
  } catch {
    // no body
  }

  if (!decideRes.ok) {
    const message = REASON_MESSAGES[decideBody?.status] || `The bot rejected this request (${decideRes.status}).`;
    return NextResponse.json({ status: 'error', message, reason: decideBody?.status }, { status: decideRes.status === 403 ? 502 : decideRes.status });
  }

  return NextResponse.json({ status: 'success', report_id: decideBody.report_id, action: decideBody.action });
}
