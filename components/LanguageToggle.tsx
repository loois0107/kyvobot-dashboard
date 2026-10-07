'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

const LANGUAGE_OPTIONS = [
  { code: 'ko' as const, label: 'KO' },
  { code: 'en' as const, label: 'EN' },
];

// 🛡️ [드롭다운 -> 세그먼트 컨트롤] 예전엔 AccountMenu와 동일한 "클릭하면 패널이 펼쳐지는"
// 드롭다운이었는데, "클릭해보지 않아도 어떤 언어가 있는지 한눈에 보이면 좋겠다"는 피드백으로
// 바뀌었다 - 옵션이 2개뿐이라 드롭다운으로 숨길 이유가 없다는 판단. KO/EN 둘 다 항상 보이는
// 알약 안에서, 선택된 쪽만 배경을 올려 하이라이트하고(bg-bg-surface, 헤더 자체 배경인
// bg-bg-elevated보다 밝아서 "눌린 버튼" 느낌) 클릭 한 번으로 바로 전환한다(open state/바깥
// 클릭 감지 전부 불필요해짐). 국기 이모지는 빼고 "KO"/"EN" 두 글자만 쓴다 - 세그먼트가
// 좁아서 국기+텍스트를 같이 넣으면 비좁고, 이미 둘 다 상시 노출이라 국기로 변별력을 더할
// 필요도 없다.
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 bg-bg-elevated rounded-full p-1">
      {LANGUAGE_OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLang(o.code)}
          aria-pressed={o.code === lang}
          className={`rounded-full px-3 py-1 text-xs font-black tracking-wider transition-colors ${
            o.code === lang
              ? 'bg-bg-surface text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
