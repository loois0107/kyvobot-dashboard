'use client';

import { useState } from 'react';
import type { ManagedGuild } from '@/components/GuildsContext';

type ServerSelectProps = {
  guilds: ManagedGuild[];
  currentGuildId: string | undefined;
  onChange: (guildId: string) => void;
};

function GuildIcon({ guild, className }: { guild: ManagedGuild; className: string }) {
  return guild.icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt="" className={`${className} rounded-full shrink-0`} />
  ) : (
    <div className={`${className} rounded-full bg-bg-elevated flex items-center justify-center font-bold text-text-secondary shrink-0`}>
      {guild.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// 🛡️ [서버 선택 드롭다운] 네이티브 <select>는 <option> 안에 이미지를 넣을 수 없어서(모든 브라우저
// 공통 HTML 제약) 아이콘을 넣으려면 커스텀 드롭다운이 필수였다 - AccountMenu.tsx/LanguageToggle.tsx와
// 동일한 "클릭 토글 + 전체화면 투명 백드롭(바깥 클릭 감지) + absolute 패널" 패턴을 그대로 재사용한다.
// 아이콘/이니셜 폴백 로직은 profile/page.tsx의 서버 목록과 동일 - 그쪽은 icon을 이미 흘려보내던
// /api/profile/guilds를 썼고, 이 컴포넌트가 쓰는 /api/guilds는 이번에 icon 필드를 추가로 살렸다.
export default function ServerSelect({ guilds, currentGuildId, onChange }: ServerSelectProps) {
  const [open, setOpen] = useState(false);
  const current = guilds.find((g) => g.id === currentGuildId) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 bg-bg-elevated hover:bg-bg-elevated/70 rounded-lg px-3 py-2.5 border border-border-default focus:outline-none focus:border-brand cursor-pointer transition-colors"
      >
        {current ? (
          <GuildIcon guild={current} className="w-9 h-9 text-sm" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-bg-surface shrink-0" />
        )}
        <span className="flex-1 text-left text-sm font-bold text-text-primary truncate">
          {current?.name ?? '...'}
        </span>
        <span className="text-text-muted text-xs shrink-0">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-full max-h-80 overflow-y-auto bg-bg-surface border border-border-default rounded-xl shadow-2xl z-20">
            {guilds.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => { onChange(g.id); setOpen(false); }}
                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 transition-colors ${
                  g.id === currentGuildId ? 'bg-brand/15' : 'hover:bg-bg-elevated'
                }`}
              >
                <GuildIcon guild={g} className="w-9 h-9 text-sm" />
                <span className={`text-sm font-bold truncate ${g.id === currentGuildId ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {g.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
