import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { validateKnowledgeContent } from '@/lib/ticketKnowledge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * 임베딩 생성(OpenAI 호출)은 항상 봇에게 위임한다 - /ticket-admin add-knowledge와 정확히 같은
 * 함수(_add_knowledge)를 타므로 대시보드로 넣든 커맨드로 넣든 로직이 절대 갈라지지 않는다.
 * 실패 사유별로 다른 메시지를 돌려준다(never 뭉뚱그림).
 */
async function addKnowledgeViaBot(guildId: string, content: string): Promise<{ ok: true; id: number | null } | { ok: false; status: number; message: string }> {
  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return { ok: false, status: 500, message: 'Server configuration error (missing bot integration settings).' };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/internal/ticket-knowledge/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({ guild_id: guildId, content }),
      signal: AbortSignal.timeout(15000), // 임베딩 생성 왕복까지 포함하므로 다른 내부 웹훅보다 여유를 둠
    });
  } catch (err) {
    console.error('[TICKET_KNOWLEDGE][ERROR] Add-knowledge webhook call failed:', err);
    return { ok: false, status: 502, message: 'Could not reach the bot to generate the embedding. Is it online?' };
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const reasonMap: Record<string, string> = {
      empty_content: 'Cannot save an empty knowledge block.',
      content_too_long: `That's too long - the bot rejected it (max ${body?.max_length ?? '?'} characters).`,
      embedding_failed: 'OpenAI failed to generate an embedding for this text.',
      db_error: 'The bot generated the embedding but failed to save it.',
    };
    const message = reasonMap[body?.status] || `The bot rejected this request (${res.status}).`;
    return { ok: false, status: res.status === 403 ? 502 : 400, message };
  }

  return { ok: true, id: body?.id ?? null };
}

// 📡 GET: Fetch all existing knowledge blocks for a specific guild instance
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guild_id');

  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from('guild_knowledge')
      .select('id, content')
      .eq('guild_id', guildId);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🚀 POST: 임베딩 생성은 봇에게 위임하고, 성공하면 그 결과(id)만 돌려준다.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guild_id, content } = body;

    const validation = validateKnowledgeContent(content);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const blocked = await requireGuildAdmin(guild_id);
    if (blocked) return blocked;

    const result = await addKnowledgeViaBot(guild_id, validation.trimmed!);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: [{ id: result.id, content: validation.trimmed }] });
  } catch (err: any) {
    console.error('[KNOWLEDGE INJECTION CRASH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✏️ PUT: 수정 = 새 임베딩으로 다시 생성 후, 성공하면 옛 행을 지운다(순서 중요 - 봇/OpenAI 호출이
// 실패해도 기존 내용이 그대로 남아있게 하기 위해 "새 것부터 만들고 나서 지운다").
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, guild_id, content } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing targeted unique database node identifier.' }, { status: 400 });
    }

    const validation = validateKnowledgeContent(content);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const blocked = await requireGuildAdmin(guild_id);
    if (blocked) return blocked;

    const result = await addKnowledgeViaBot(guild_id, validation.trimmed!);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

    // 🛡️ id만으로 지우면 guild_id가 달라도 통과되므로, DELETE 라우트와 동일하게 두 조건을 함께 건다.
    const { error } = await supabase.from('guild_knowledge').delete().eq('id', id).eq('guild_id', guild_id);
    if (error) {
      // 새 행은 이미 만들어졌는데 옛 행 삭제만 실패한 상태 - 유저에게 명확히 알려서 수동 정리하게 한다.
      console.error('[TICKET_KNOWLEDGE][ERROR] New entry created but old entry delete failed:', error);
      return NextResponse.json({
        error: `Updated content was saved as a new entry, but the old one (id ${id}) could not be removed: ${error.message}. Please delete it manually.`,
        success: true,
        data: [{ id: result.id, content: validation.trimmed }],
      }, { status: 207 });
    }

    return NextResponse.json({ success: true, data: [{ id: result.id, content: validation.trimmed }] });
  } catch (err: any) {
    console.error('[KNOWLEDGE UPDATE CRASH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🗑️ DELETE: Purge a stale knowledge context chunk by its secure index row ID
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const guildId = searchParams.get('guild_id');

  if (!id) {
    return NextResponse.json({ error: 'Missing targeted unique database node identifier.' }, { status: 400 });
  }

  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  try {
    // 🛡️ id만으로 지우면 guild_id가 달라도 삭제가 통과되어 버리므로, 두 조건을 함께 걸어
    // 이 길드가 소유한 행이 아닌 경우 매치 자체가 안 되게 막는다.
    const { error } = await supabase
      .from('guild_knowledge')
      .delete()
      .eq('id', id)
      .eq('guild_id', guildId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
