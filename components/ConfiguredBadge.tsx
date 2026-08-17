'use client';

import { useT } from '@/lib/i18n/LanguageContext';
import Badge from '@/components/ui/Badge';

// 🛡️ anonymous-reports와 voice 설정 페이지가 토씨 하나 안 다르게 복붙해서 쓰던 "설정됨/설정 안 됨"
// 배지를 하나로 뽑았다 - className, 조건부 로직, 문구(common.statusConfigured/statusNotConfigured)
// 전부 여기 하나에만 있으면 된다. Badge의 success/warning 시맨틱과 의미가 정확히 일치해서 그 위에
// 얇게 감싼다 - configured=success(초록), !configured=warning(호박).
export default function ConfiguredBadge({ configured }: { configured: boolean }) {
  const t = useT();
  return (
    <Badge variant={configured ? 'success' : 'warning'} className="shrink-0 whitespace-nowrap">
      {configured ? t('common.statusConfigured') : t('common.statusNotConfigured')}
    </Badge>
  );
}
