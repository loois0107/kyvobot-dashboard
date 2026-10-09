// DOR(서드파티 LoL 킬 클립 자동 녹화 프로그램) 연동용 로컬 컴패니언 앱(dor-companion/,
// PyInstaller --onefile --noconsole로 빌드된 단일 .exe) 다운로드 링크.
// NEXT_PUBLIC_DOR_COMPANION_DOWNLOAD_URL이 설정돼 있으면 그쪽을 우선하고, 없을 때만 이
// 값으로 폴백한다 - BOT_INVITE_URL(lib/botInvite.ts)과 동일한 패턴.
// 폴백으로 넣은 Supabase Storage 공개 URL은 실제 파일이 아직 업로드되기 전의 자리표시자다 -
// 파일이 올라가면 이 상수 값이나 환경변수만 바꾸면 된다.
export const DOR_COMPANION_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DOR_COMPANION_DOWNLOAD_URL ||
  'https://lxdxadcwqgborwismlgv.supabase.co/storage/v1/object/public/dor-companion-releases/DorCompanion.exe';
