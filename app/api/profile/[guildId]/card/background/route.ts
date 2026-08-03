import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLogin, requireGuildMembership } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BUCKET = 'rank-card-backgrounds';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * POST: 이 유저 본인의 랭크카드 배경 이미지를 업로드한다. 브라우저가 Supabase Storage에
 * 직접 붙는 게 아니라 이 라우트가 서비스 롤 키로 대신 업로드한다 - RLS 정책을 따로 만들
 * 필요가 없다(서비스 롤은 RLS를 우회함). 버킷 자체에도 file_size_limit/allowed_mime_types가
 * 걸려있지만, Storage까지 왕복하기 전에 여기서 먼저 걸러내는 게 더 빠르고 에러 메시지도
 * 명확하다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ error: 'ENV_KEY_MISSING' }, { status: 500 });

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch (err) {
    console.error('[PROFILE_CARD_BACKGROUND][ERROR] formData parse failed', err);
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No file was provided.' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type. Only JPG, PNG, GIF, and WEBP are allowed.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File is too large. The maximum size is 5MB.' }, { status: 400 });
  }

  const prefix = `${guildId}/${userId}`;
  const path = `${prefix}/background.${ext}`;

  // 🛡️ 이전에 다른 확장자로 업로드한 파일이 있으면(예: png -> jpg로 교체) upsert만으론
  // 안 지워진다(경로가 달라짐) - 매번 업로드 전에 이 유저의 기존 파일을 전부 지우고 새로
  // 올려서 스토리지에 고아 파일이 쌓이지 않게 한다.
  const { data: existing } = await supabase.storage.from(BUCKET).list(prefix);
  if (existing && existing.length > 0) {
    await supabase.storage.from(BUCKET).remove(existing.map((f) => `${prefix}/${f.name}`));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    console.error('[PROFILE_CARD_BACKGROUND][ERROR]', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // 🛡️ 같은 경로(upsert)로 덮어쓰기 때문에 캐시 버스팅 쿼리스트링을 안 붙이면 브라우저/CDN이
  // 이전 이미지를 계속 보여줄 수 있다 - 매 업로드마다 값이 바뀌는 타임스탬프를 붙인다.
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  return NextResponse.json({ url });
}
