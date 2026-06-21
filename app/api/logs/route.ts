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

    const { data, error } = await supabase
      .from("audit_logs") // 1. 만약 수파베이스 테이블 이름이 다르면 이 부분이 범인!
      .select("id, action_type, user_name, user_id, moderator_name, reason, created_at") // 2. 여기 적힌 컬럼명 중 하나가 다르면 범인!
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // 폰으로 바로 디버깅할 수 있게 수파베이스가 뱉은 진짜 에러를 리턴
      return NextResponse.json({ status: "supabase_error", details: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ status: "crash", details: error.message }, { status: 500 });
  }
}
