'use client';

import { useT } from '@/lib/i18n/LanguageContext';

// 🛡️ anonymous-reports와 voice 설정 페이지가 토씨 하나 안 다르게 복붙해서 쓰던 "설정됨/설정 안 됨"
// 배지를 하나로 뽑았다 - className, 조건부 로직, 문구(common.statusConfigured/statusNotConfigured)
// 전부 여기 하나에만 있으면 된다. twitchPage의 4단계 폴링 상태(healthy/delayed/stalled/pending)는
// 이것과 의미가 다른 별개 개념이라 포함하지 않는다 - 억지로 합치면 오히려 부정확해진다.
export default function ConfiguredBadge({ configured }: { configured: boolean }) {
  const t = useT();
  return (
    <span
      className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
        configured
          ? 'bg-green-950/40 text-green-400 border border-green-500/30'
          : 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
      }`}
    >
      {configured ? t('common.statusConfigured') : t('common.statusNotConfigured')}
    </span>
  );
}
