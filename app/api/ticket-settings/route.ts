import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guild_id = searchParams.get('guild_id');

  const blocked = await requireGuildAdmin(guild_id);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from('guild_ticket_settings')
      .select('*')
      .eq('guild_id', guild_id)
      .maybeSingle();

    if (error) {
      console.error("🚨 [TICKET GET ERROR]:", error); // 💡 추적 로그
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("🚨 [TICKET GET EXCEPTION]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guild_id, setup_title, setup_desc, welcome_title, welcome_desc, system_prompt } = body;

    const blocked = await requireGuildAdmin(guild_id);
    if (blocked) return blocked;

    const supabase = connectSupabase();
    if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

    const { data, error } = await supabase
      .from('guild_ticket_settings')
      .upsert({ guild_id, setup_title, setup_desc, welcome_title, welcome_desc, system_prompt })
      .select();

    if (error) {
      console.error("🚨 [TICKET POST ERROR]:", error); // 💡 추적 로그
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("🚨 [TICKET POST EXCEPTION]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
