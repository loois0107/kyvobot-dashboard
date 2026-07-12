import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return createClient('https://placeholder.supabase.co', 'placeholder-service-role-key-bypass');
  }
  return createClient(url, key);
}

// 📡 GET: Fetch all existing knowledge blocks for a specific guild instance
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guild_id');

  if (!guildId) {
    return NextResponse.json({ error: 'Missing target guild_id selection.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
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

    if (!guild_id || !content) {
      return NextResponse.json({ error: 'Missing required operational matrix parameters.' }, { status: 400 });
    }

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

  if (!id) {
    return NextResponse.json({ error: 'Missing targeted unique database node identifier.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('guild_knowledge')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
