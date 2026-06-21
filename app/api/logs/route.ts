import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ status: "error", message: "Missing keys" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // user_name:username -> DB의 username 컬럼을 user_name 이라는 키로 변경해서 가져옴
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action_type, user_name:username, user_id, moderator_name, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ status: "supabase_error", details: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ status: "crash", details: error.message }, { status: 500 });
  }
}
