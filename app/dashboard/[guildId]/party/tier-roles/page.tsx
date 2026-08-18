'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const TIER_CHOICES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];

interface RoleOption {
  id: string;
  name: string;
  color: number;
}

interface BlockedItem {
  tier: string | null;
  role_name: string | null;
  reason: string;
}

interface NeedsConfirmationItem {
  tier: string;
  role_id: string;
  role_name: string;
  dangerous_permissions: string[];
}

// 로딩/에러/데이터 세 상태를 명확히 분리한다 - "빈 폼"과 "불러오기 실패"가 화면에서
// 절대 같은 모양으로 보이면 안 된다 (둘 다 똑같이 '아무 매핑도 없음'처럼 보이면
// 유저가 진짜로 전부 해제된 건지 그냥 로딩이 실패한 건지 구분할 수 없다).
type LoadStatus = 'loading' | 'loaded' | 'error';

export default function TierRolesSettings() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [savedSelections, setSavedSelections] = useState<Record<string, string>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [blockedItems, setBlockedItems] = useState<BlockedItem[]>([]);
  const [needsConfirmation, setNeedsConfirmation] = useState<NeedsConfirmationItem[]>([]);

  const isDirty = TIER_CHOICES.some((tier) => (selections[tier] || '') !== (savedSelections[tier] || ''));

  useEffect(() => {
    if (!guildId) return;
    loadData();
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const loadData = async () => {
    setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/tier-roles/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setRoles(data.roles || []);
      const next: Record<string, string> = {};
      for (const tier of TIER_CHOICES) {
        next[tier] = data.mappings?.[tier]?.role_id || '';
      }
      setSelections(next);
      setSavedSelections(next);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('tierRolesPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const handleDiscard = () => {
    if (!isDirty) return;
    if (window.confirm(t('tierRolesPage.discardConfirm'))) {
      setSelections(savedSelections);
      setBlockedItems([]);
      setNeedsConfirmation([]);
    }
  };

  const submitSave = async (confirmedDangerous: string[] = []) => {
    setIsSaving(true);
    setBlockedItems([]);
    try {
      const res = await fetch(`/api/tier-roles/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, confirmedDangerous }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === 'success') {
        showToast(t('tierRolesPage.savedSuccess'), 'success');
        setSavedSelections(selections);
        setNeedsConfirmation([]);
        return;
      }

      if (res.status === 409 && data?.status === 'needs_confirmation') {
        setNeedsConfirmation(data.needsConfirmation || []);
        return;
      }

      if (data?.status === 'blocked') {
        setBlockedItems(data.blocked || []);
        showToast(t('tierRolesPage.someRolesBlocked'), 'error');
        return;
      }

      showToast(data?.message || t('common.requestFailed', { status: res.status }), 'error');
    } catch (err) {
      console.error(err);
      showToast(t('tierRolesPage.saveNetworkError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => submitSave([]);
  const handleConfirmDangerous = () => submitSave(needsConfirmation.map((i) => i.tier));
  const handleCancelConfirmation = () => setNeedsConfirmation([]);

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('tierRolesPage.loadingRoles')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('tierRolesPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadData}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-28">
      <header className="border-b border-border-default pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('tierRolesPage.title')}</h1>
        <HelpText className="mt-1">
          {t('tierRolesPage.subtitle')}
        </HelpText>
      </header>

      <Card elevated className="!border-warning-border hover:!border-warning-border space-y-1">
        <p className="text-sm font-black text-warning">{t('tierRolesPage.prereqWarningTitle')}</p>
        <p className="text-sm text-warning leading-relaxed">{t('tierRolesPage.prereqWarningBody')}</p>
      </Card>

      {blockedItems.length > 0 && (
        <Card elevated className="!border-danger/20 hover:!border-danger/20 space-y-2">
          <p className="text-sm font-black text-danger uppercase">{t('tierRolesPage.couldNotSave')}</p>
          {blockedItems.map((item, i) => (
            <p key={i} className="text-sm text-danger">
              {item.tier ? <strong>{item.tier}</strong> : null} {item.role_name ? `(${item.role_name})` : ''} — {item.reason}
            </p>
          ))}
        </Card>
      )}

      <Card elevated className="space-y-1.5">
        <p className="text-sm font-bold text-text-primary">{t('tierRolesPage.infoBoxTitle')}</p>
        <ul className="text-sm text-text-secondary leading-relaxed list-disc list-inside space-y-1">
          <li>{t('tierRolesPage.infoBoxPoint1')}</li>
          <li>{t('tierRolesPage.infoBoxPoint2')}</li>
          <li>{t('tierRolesPage.infoBoxPoint3')}</li>
        </ul>
      </Card>

      <Card className="space-y-3">
        {TIER_CHOICES.map((tier) => (
          <div key={tier} className="flex items-center gap-4">
            <label className="w-28 flex-shrink-0 text-sm font-bold text-text-secondary">{tier}</label>
            <select
              value={selections[tier] || ''}
              onChange={(e) => setSelections((prev) => ({ ...prev, [tier]: e.target.value }))}
              className="flex-1 bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
            >
              <option value="">{t('tierRolesPage.noRoleAssigned')}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        ))}
      </Card>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-surface/95 border border-brand/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-sm font-bold text-text-primary">{t('common.unsavedChanges')}</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleDiscard} className="!px-0">
              {t('common.discard')}
            </Button>
            <Button type="button" variant="success" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      )}

      {needsConfirmation.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <Card className="!border-warning-border hover:!border-warning-border max-w-lg w-full space-y-4">
            <p className="text-base font-black text-warning">{t('tierRolesPage.elevatedPermsTitle')}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {needsConfirmation.map((item) => (
                <div key={item.tier} className="bg-bg-elevated border border-border-default rounded-lg p-3 text-sm">
                  <p className="text-text-primary font-bold">{item.tier} → {item.role_name}</p>
                  <p className="text-danger mt-1">{item.dangerous_permissions.join(', ')}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              {t('tierRolesPage.elevatedPermsBody')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={handleCancelConfirmation}>
                {t('common.cancel')}
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmDangerous} disabled={isSaving}>
                {isSaving ? t('common.saving') : t('tierRolesPage.confirmSaveAnyway')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SettingsPageContainer>
  );
}
