export interface ThumbnailValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * card_thumbnail_url이 실제로 접근 가능한 이미지인지 저장 시점에 HEAD 요청으로 확인한다.
 * 렌더링 시점(party.py의 _build_card_embed)에서도 별도로 형식 검사 + 전송 실패 시 재시도 안전망이
 * 있으므로, 여기서 거르지 못한 케이스(예: 저장 후 URL이 죽는 경우)도 카드 자체를 깨뜨리지 않는다.
 */
export async function validateThumbnailUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<ThumbnailValidationResult> {
  const trimmed = url.trim();
  if (!trimmed) return { valid: true };

  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: 'card_thumbnail_url must start with http:// or https://.' };
  }

  try {
    const res = await fetchImpl(trimmed, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return { valid: false, error: `card_thumbnail_url returned status ${res.status}. Please check the link.` };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return { valid: false, error: `card_thumbnail_url doesn't look like an image (content-type: ${contentType || 'unknown'}).` };
    }
    return { valid: true };
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { valid: false, error: 'card_thumbnail_url took too long to respond. Please check the link.' };
    }
    return { valid: false, error: 'Failed to reach card_thumbnail_url. Please check the link.' };
  }
}
