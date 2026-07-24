'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

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
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [savedSelections, setSavedSelections] = useState<Record<string, string>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [blockedItems, setBlockedItems] = useState<BlockedItem[]>([]);
  const [needsConfirmation, setNeedsConfirmation] = useState<NeedsConfirmationItem[]>([]);

  const isDirty = TIER_CHOICES.some((t) => (selections[t] || '') !== (savedSelections[t] || ''));

  useEffect(() => {
    if (!guildId) return;
    loadData();
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
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
      setLoadErrorMsg('Network error while loading role data.');
      setLoadStatus('error');
    }
  };

  const handleDiscard = () => {
    if (!isDirty) return;
    if (window.confirm('Discard your unsaved changes?')) {
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
        showToast('Tier role mappings saved!', 'success');
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
        showToast('Some roles could not be saved - see details below.', 'error');
        return;
      }

      showToast(data?.message || `Request failed (${res.status})`, 'error');
    } catch (err) {
      console.error(err);
      showToast('Network error while saving.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => submitSave([]);
  const handleConfirmDangerous = () => submitSave(needsConfirmation.map((i) => i.tier));
  const handleCancelConfirmation = () => setNeedsConfirmation([]);

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        Loading roles...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load role data</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button
          type="button"
          onClick={loadData}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28">
      <header className="border-b border-[#2b2d31] pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🏅 Tier Role Mapping</h1>
        <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
          Used by /tier_verify and /tier_set to grant a role for each rank tier
        </p>
      </header>

      {blockedItems.length > 0 && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 space-y-2">
          <p className="text-xs font-black text-red-400 uppercase">These couldn't be saved:</p>
          {blockedItems.map((item, i) => (
            <p key={i} className="text-xs text-red-300">
              {item.tier ? <strong>{item.tier}</strong> : null} {item.role_name ? `(${item.role_name})` : ''} — {item.reason}
            </p>
          ))}
        </div>
      )}

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        {TIER_CHOICES.map((tier) => (
          <div key={tier} className="flex items-center gap-4">
            <label className="w-28 flex-shrink-0 text-xs font-bold text-[#b5bac1]">{tier}</label>
            <select
              value={selections[tier] || ''}
              onChange={(e) => setSelections((prev) => ({ ...prev, [tier]: e.target.value }))}
              className="flex-1 bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
            >
              <option value="">-- No role assigned --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">⚠️ You have unsaved changes</span>
          <div className="flex gap-3">
            <button type="button" onClick={handleDiscard} className="text-xs font-bold text-gray-400 hover:text-white transition">
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {needsConfirmation.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <p className="text-sm font-black text-amber-400">⚠️ These roles have elevated permissions</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {needsConfirmation.map((item) => (
                <div key={item.tier} className="bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs">
                  <p className="text-white font-bold">{item.tier} → {item.role_name}</p>
                  <p className="text-amber-300 mt-1">{item.dangerous_permissions.join(', ')}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#949ba4]">
              Anyone who reaches these tiers will be granted a role with these permissions. Continue anyway?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelConfirmation}
                className="text-xs font-bold text-gray-400 hover:text-white px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDangerous}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-5 py-2 rounded-lg"
              >
                {isSaving ? 'Saving...' : 'Confirm & Save Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
