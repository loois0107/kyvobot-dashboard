import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '@/lib/i18n';

// 🛡️ [스크린샷 다국어 폴백] 서버 컴포넌트에서만 호출된다(fs 접근) - 요청 시점에 실제 파일이
// public/images/features/에 존재하는지 확인한 뒤 최종 경로를 정해서 내려주므로, 브라우저는
// 항상 "존재가 확인된" 경로만 받는다(깨진 이미지가 뜰 수 없음). 우선순위: 요청 언어 버전 ->
// 반대 언어 버전(둘 다 있을 필요는 없음, 하나만 캡처돼도 그걸로 양쪽 언어를 커버) -> 둘 다
// 없으면 undefined(호출부가 "Coming Soon" 플레이스홀더 등으로 처리).
const existsCache = new Map<string, boolean>();

function fileExists(publicRelativePath: string): boolean {
  const cached = existsCache.get(publicRelativePath);
  if (cached !== undefined) return cached;
  const fullPath = path.join(process.cwd(), 'public', publicRelativePath);
  const exists = fs.existsSync(fullPath);
  existsCache.set(publicRelativePath, exists);
  return exists;
}

/**
 * baseName(예: 'party-recruit')과 현재 lang을 받아 /images/features/{baseName}-{lang}.png를
 * 우선 찾고, 없으면 다른 언어 버전으로 폴백한다. 둘 다 없으면 undefined.
 */
export function resolveLocalizedImage(baseName: string, lang: Lang): string | undefined {
  const otherLang: Lang = lang === 'ko' ? 'en' : 'ko';
  for (const candidate of [lang, otherLang]) {
    const relPath = `images/features/${baseName}-${candidate}.png`;
    if (fileExists(relPath)) {
      return `/${relPath}`;
    }
  }
  return undefined;
}
