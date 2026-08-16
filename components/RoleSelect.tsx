'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/LanguageContext';

type Role = { id: string; name: string; color: number };
type LoadStatus = 'loading' | 'loaded' | 'error';

type RoleSelectProps = {
  guildId: string;
  value: string;
  onChange: (roleId: string) => void;
  className?: string;
};

// Shared role picker mirroring ChannelSelect - fetches this guild's assignable roles (managed
// roles and @everyone already excluded server-side) from /api/guilds/{guildId}/roles and renders
// them as a <select>. Falls back to the old text input if the role list can't be loaded, so a
// bot-token/API outage doesn't block admins from still typing an ID by hand.
export default function RoleSelect({ guildId, value, onChange, className = '' }: RoleSelectProps) {
  const t = useT();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');

  useEffect(() => {
    if (!guildId) return;
    let cancelled = false;
    setLoadStatus('loading');
    fetch(`/api/guilds/${guildId}/roles`)
      .then((res) => {
        if (!res.ok) throw new Error(`roles fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('unexpected roles response shape');
        setRoles(data);
        setLoadStatus('loaded');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[ROLE_SELECT] Failed to load role list:', err);
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const baseClassName = `w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand ${className}`;

  if (loadStatus === 'error') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder={t('common.egPlaceholderId')}
        className={baseClassName}
      />
    );
  }

  // The saved role may no longer exist in the freshly-fetched list (deleted role, etc.) - surface
  // it as its own option instead of silently falling back to "no selection" and losing the
  // reference the moment the admin saves again.
  const selectedMissingFromList = value && loadStatus === 'loaded' && !roles.some((r) => r.id === value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loadStatus === 'loading'}
      className={`${baseClassName} disabled:opacity-50 cursor-pointer`}
    >
      <option value="">{loadStatus === 'loading' ? t('common.loadingRoles') : t('common.selectRole')}</option>
      {selectedMissingFromList && <option value={value}>{t('common.unknownRole', { id: value })}</option>}
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
