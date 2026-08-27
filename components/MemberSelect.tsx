'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n/LanguageContext';

type Member = { id: string; display_name: string; username: string };

type MemberSelectProps = {
  guildId: string;
  value: string;
  onChange: (memberId: string, displayName?: string) => void;
  className?: string;
};

// Search-based member picker - unlike ChannelSelect/RoleSelect this can't just fetch "the full
// list" once, since a guild can have tens of thousands of members. Debounces keystrokes into
// /api/guilds/{guildId}/members?q=, backed by Discord's member-search endpoint (prefix match on
// username/nickname). Once a result is picked, the input shows that member's display name while
// `value` holds their ID - clearing the input (or the parent resetting `value` to '') clears both.
export default function MemberSelect({ guildId, value, onChange, className = '' }: MemberSelectProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [results, setResults] = useState<Member[]>([]);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parent cleared the selection (e.g. form reset after a successful submit) - mirror that locally.
  useEffect(() => {
    if (!value && (selectedLabel !== null || query !== '')) {
      setSelectedLabel(null);
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open || !guildId || query.trim().length === 0) {
      setResults([]);
      setLoadStatus('idle');
      return;
    }
    let cancelled = false;
    setLoadStatus('loading');
    const handle = setTimeout(() => {
      fetch(`/api/guilds/${guildId}/members?q=${encodeURIComponent(query.trim())}`)
        .then((res) => {
          if (!res.ok) throw new Error(`members search failed: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (cancelled) return;
          if (!Array.isArray(data)) throw new Error('unexpected members response shape');
          setResults(data);
          setLoadStatus('loaded');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('[MEMBER_SELECT] Failed to search members:', err);
          setLoadStatus('error');
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [guildId, query, open]);

  // Click outside closes the dropdown without discarding whatever's already selected.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(member: Member) {
    onChange(member.id, member.display_name);
    setSelectedLabel(member.display_name);
    setQuery(member.display_name);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    if (value) onChange(''); // typing again invalidates the previous pick until a new one is made
  }

  const baseClassName = `w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand ${className}`;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={t('common.searchMembersPlaceholder')}
        className={baseClassName}
      />
      {open && query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-bg-surface border border-border-default rounded-lg shadow-lg">
          {loadStatus === 'loading' && (
            <div className="p-2.5 text-sm text-text-muted">{t('common.loadingMembers')}</div>
          )}
          {loadStatus === 'loaded' && results.length === 0 && (
            <div className="p-2.5 text-sm text-text-muted">{t('common.noResultsFound')}</div>
          )}
          {loadStatus === 'error' && (
            <div className="p-2.5 text-sm text-danger">{t('common.noResultsFound')}</div>
          )}
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m)}
              className="w-full text-left p-2.5 text-sm text-text-primary hover:bg-bg-elevated cursor-pointer"
            >
              {m.display_name}
              {m.display_name !== m.username && <span className="text-text-muted"> (@{m.username})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
