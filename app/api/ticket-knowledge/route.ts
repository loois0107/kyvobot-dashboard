import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
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

// 🚀 POST: Convert custom text rules into OpenAI vector floats via native fetch
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guild_id, content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Missing required operational matrix parameters.' }, { status: 400 });
    }

    const blocked = await requireGuildAdmin(guild_id);
    if (blocked) return blocked;

    // 🔑 안전하게 환경변수 방식으로 원상복구 (하드코딩된 진짜 sk- 키 삭제 완료)
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({
        error: `Missing OPENAI_API_KEY configuration on host environment.`
      }, { status: 500 });
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      throw new Error(`OpenAI API pipeline communication failed: ${errorText}`);
    }

    const openAiData = await openAiResponse.json();
    const embedding = openAiData.data?.[0]?.embedding;

    if (!embedding) {
      throw new Error('Failed to extract valid embedding vectors from response matrix.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

    const { data, error } = await supabase
      .from('guild_knowledge')
      .insert([{ guild_id, content, embedding }])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[KNOWLEDGE INJECTION CRASH]', err);
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
