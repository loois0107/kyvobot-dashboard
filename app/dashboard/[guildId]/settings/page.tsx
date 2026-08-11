'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MACRO_TRIGGER_MAX_LENGTH, MACRO_RESPONSE_MAX_LENGTH, MACRO_MAX_COUNT } from '@/lib/customCommandsSettings';
import { useT } from '@/lib/i18n/LanguageContext';
import { useToast } from '@/components/Toast';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import RoleSelect from '@/components/RoleSelect';
import { useGuildName } from '@/components/GuildsContext';
import type { TranslationKey } from '@/lib/i18n';

// 🛡️ /cc_add role_add·role_remove(봇 슬래시 커맨드)로 만든 매크로는 문자열이 아니라
// {type, role_id} 객체로 저장된다(cogs/custom_commands.py의 _normalize_command_entry와 동일한
// 스키마) - 이젠 이 대시보드에서도 같은 형태로 직접 만들 수 있다(role-macro API 라우트 경유).
export type MacroEntry = string | { type: 'text'; content: string } | { type: 'role_add' | 'role_remove'; role_id: string };

export function isRoleMacro(value: MacroEntry): value is { type: 'role_add' | 'role_remove'; role_id: string } {
  return typeof value === 'object' && value !== null && (value.type === 'role_add' || value.type === 'role_remove');
}

export function macroResponseText(value: MacroEntry): string {
  if (typeof value === 'string') return value;
  if (value.type === 'text') return value.content;
  return '';
}

type MacroType = 'text' | 'role_add' | 'role_remove';

// /api/settings/{guildId}/role-macro가 내려주는 code -> 로컬라이즈된 문구 매핑. role_not_found/
// discord_fetch_failed/invalid_* 등은 giveaways 페이지와 동일한 이유로 일부러 여기 없다 - 서버가
// 이미 사람이 읽을 영어 message를 내려주고 그걸 그대로 보여준다.
const ROLE_MACRO_ERROR_CODE_KEY: Record<string, TranslationKey> = {
  name_required: 'settingsPage.errNameRequired',
  role_required: 'settingsPage.errRoleRequired',
  role_is_admin: 'settingsPage.errRoleIsAdmin',
  bot_missing_manage_roles: 'settingsPage.errBotMissingManageRoles',
  role_hierarchy_blocked: 'settingsPage.errRoleHierarchyBlocked',
  save_failed: 'settingsPage.errSaveFailed',
};

// cc_add_group._resolve_cmd_name과 동일한 정규화: strip → lower → "/" 접두어 제거 → "!" 접두어
// 제거 (Python removeprefix와 동일하게 순서대로 한 번씩만 벗긴다).
function normalizeMacroName(raw: string): string {
  let n = raw.trim().toLowerCase();
  if (n.startsWith('/')) n = n.slice(1);
  if (n.startsWith('!')) n = n.slice(1);
  return n;
}

export default function SettingsPage() {
  const params = useParams();
  const t = useT();
  const { showToast } = useToast();
  const guildId = params?.guildId as string | undefined;
  const guildName = useGuildName(guildId);

  const [commands, setCommands] = useState<{ [key: string]: MacroEntry }>({});
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [macroType, setMacroType] = useState<MacroType>('text');
  const [macroName, setMacroName] = useState('');
  const [macroResponse, setMacroResponse] = useState('');
  const [macroRoleId, setMacroRoleId] = useState('');
  const [isSavingMacro, setIsSavingMacro] = useState(false);
  const [dangerousConfirm, setDangerousConfirm] = useState<{ dangerous: string[] } | null>(null);

  // 📡 매크로 목록 로드 (언어는 이제 general/page.tsx가 담당 - 이 페이지는 매크로 전용)
  const fetchAllSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);

    fetch(`/api/settings/${guildId}`)
      .then(async (res) => {
        const resData = await res.json();
        if (res.ok && resData.ok && resData.settings) {
          setCommands(resData.settings.custom_commands || {});
        } else {
          showToast(`${t('settingsPage.loadFailedPrefix')} [${res.status}]: ${resData.error || resData.message || t('settingsPage.unknownConfigState')}`, 'error');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        showToast(t('settingsPage.fetchFailed'), 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllSettings();
    if (!guildId || guildId === '[guildId]') return;
    let cancelled = false;
    fetch(`/api/guilds/${guildId}/roles`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRoles(data);
      })
      .catch((err) => console.error('[SETTINGS] Failed to load role list:', err));
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name || roleId;

  // 🌐 텍스트 매크로 추가/삭제 전용 (역할 매크로는 /api/settings/{guildId}/role-macro가 담당) -
  // custom_commands 전체를 통째로 교체하는 방식은 그대로 유지(role-macro 라우트가 만든 항목도
  // 이 객체 안에 같이 들어있으므로 부분 필드만 보낸다).
  const saveUnifiedSettings = async (nextCommands: Record<string, MacroEntry>): Promise<boolean> => {
    if (!guildId || guildId === '[guildId]') return false;
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_commands: nextCommands }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCommands(nextCommands);
        showToast(t('common.saveSuccess'), 'success');
        return true;
      }
      showToast(data.error || data.message || t('settingsPage.errGeneric'), 'error');
      return false;
    } catch (err) {
      console.error(err);
      showToast(t('settingsPage.handshakeBlocked'), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setMacroType('text');
    setMacroName('');
    setMacroResponse('');
    setMacroRoleId('');
    setDangerousConfirm(null);
  };

  const extractRoleMacroErrorMessage = async (res: Response, cmdName: string): Promise<string> => {
    try {
      const data = await res.json();
      if (data.code === 'trigger_too_long') return t('settingsPage.errTriggerTooLong', { max: MACRO_TRIGGER_MAX_LENGTH });
      if (data.code === 'max_macros') return t('settingsPage.errMaxMacros', { max: MACRO_MAX_COUNT });
      if (data.code === 'name_conflict') return t('settingsPage.errNameConflict', { name: cmdName });
      const key = ROLE_MACRO_ERROR_CODE_KEY[data.code];
      if (key) return t(key);
      return data.error || t('settingsPage.errGeneric');
    } catch {
      return t('settingsPage.errGeneric');
    }
  };

  const submitTextMacro = async () => {
    const cmdName = normalizeMacroName(macroName);
    if (!cmdName) { showToast(t('settingsPage.errNameRequired'), 'error'); return; }
    if (cmdName.length > MACRO_TRIGGER_MAX_LENGTH) { showToast(t('settingsPage.errTriggerTooLong', { max: MACRO_TRIGGER_MAX_LENGTH }), 'error'); return; }
    if (!macroResponse.trim()) { showToast(t('settingsPage.errResponseRequired'), 'error'); return; }
    if (macroResponse.length > MACRO_RESPONSE_MAX_LENGTH) { showToast(t('settingsPage.errResponseTooLong', { length: macroResponse.length, max: MACRO_RESPONSE_MAX_LENGTH }), 'error'); return; }
    if (isRoleMacro(commands[cmdName])) { showToast(t('settingsPage.errNameConflict', { name: cmdName }), 'error'); return; }
    if (!(cmdName in commands) && Object.keys(commands).length >= MACRO_MAX_COUNT) { showToast(t('settingsPage.errMaxMacros', { max: MACRO_MAX_COUNT }), 'error'); return; }

    setIsSavingMacro(true);
    const ok = await saveUnifiedSettings({ ...commands, [cmdName]: macroResponse });
    setIsSavingMacro(false);
    if (ok) resetAddModal();
  };

  const submitRoleMacro = async (confirmedDangerous: boolean) => {
    const cmdName = normalizeMacroName(macroName);
    if (!cmdName) { showToast(t('settingsPage.errNameRequired'), 'error'); return; }
    if (!macroRoleId) { showToast(t('settingsPage.errRoleRequired'), 'error'); return; }

    setIsSavingMacro(true);
    try {
      const res = await fetch(`/api/settings/${guildId}/role-macro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cmdName, action: macroType, role_id: macroRoleId, confirmedDangerous }),
      });
      if (res.ok) {
        showToast(t('common.saveSuccess'), 'success');
        resetAddModal();
        fetchAllSettings();
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        setDangerousConfirm({ dangerous: data.dangerous_permissions || [] });
        return;
      }
      showToast(await extractRoleMacroErrorMessage(res, cmdName), 'error');
    } catch (err) {
      console.error(err);
      showToast(t('settingsPage.handshakeBlocked'), 'error');
    } finally {
      setIsSavingMacro(false);
    }
  };

  const handleSubmitMacro = () => {
    if (macroType === 'text') submitTextMacro();
    else submitRoleMacro(false);
  };

  const handleDeleteCommand = async (name: string) => {
    if (!confirm(t('settingsPage.confirmDelete', { name }))) return;
    const updated = { ...commands };
    delete updated[name];
    await saveUnifiedSettings(updated);
  };

  const macroCount = Object.keys(commands).length;

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-[#2A1F40] pb-4">
          <h1 className="text-2xl font-extrabold text-purple-400">{t('settingsPage.title')}</h1>
          <HelpText className="mt-1">
            {t('settingsPage.subtitle')}
          </HelpText>
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">

          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('common.activeContext')}</label>
            <div className="w-full sm:w-1/2 bg-[#0F0F1A] border border-[#2A1F40] text-base text-purple-400 px-3 py-2 rounded font-bold select-none">
              {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
            </div>
          </div>

          <div className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3 border-b border-[#2A1F40] pb-2">
              <span className="text-sm font-bold text-gray-400">{t('settingsPage.macrosTitle')}</span>
              <button
                onClick={() => setShowAddModal(true)}
                disabled={loading}
                className="text-[11px] bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-2 py-1 rounded font-bold"
              >
                {t('settingsPage.addNew')}
              </button>
            </div>
            <div className="text-[11px] text-gray-500 mb-3 space-y-0.5">
              <p>{t('settingsPage.macrosHelpBullet1')}</p>
              <p>{t('settingsPage.macrosHelpBullet2')}</p>
              <p>{t('settingsPage.macrosHelpBullet3', { max: MACRO_RESPONSE_MAX_LENGTH.toLocaleString() })}</p>
            </div>

            {macroCount === 0 ? (
              <div className="text-center py-10 border border-dashed border-[#2A1F40] rounded-xl bg-[#161626]">
                <p className="text-4xl mb-2">📭</p>
                <p className="text-sm text-gray-400">{t('settingsPage.noMacros')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('settingsPage.noMacrosHint')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {Object.entries(commands).map(([trigger, value]) => (
                  <div key={trigger} className="flex justify-between items-center gap-2 text-sm bg-[#161626] p-2 rounded border border-[#2A1F40]">
                    <span className="text-green-400 font-bold shrink-0">/{trigger}</span>
                    {isRoleMacro(value) ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded truncate">
                        {t('settingsPage.roleMacroBadge', {
                          action: value.type === 'role_add' ? t('settingsPage.grants') : t('settingsPage.removes'),
                          roleName: roleName(value.role_id),
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400 truncate flex-1">{macroResponseText(value)}</span>
                    )}
                    <button
                      onClick={() => handleDeleteCommand(trigger)}
                      disabled={loading}
                      className="text-red-400 hover:text-red-500 font-bold disabled:opacity-50 shrink-0"
                    >
                      {t('settingsPage.deleteButton')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-purple-400 font-black text-base">{t('settingsPage.addModalTitle')}</h3>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-400">{t('settingsPage.macroNameLabel')}</label>
                <input
                  type="text"
                  value={macroName}
                  onChange={(e) => setMacroName(e.target.value)}
                  placeholder={t('settingsPage.macroNamePlaceholder')}
                  maxLength={MACRO_TRIGGER_MAX_LENGTH}
                  className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:border-purple-500 outline-none"
                />
                <HelpText>{t('settingsPage.macroNameHelp')}</HelpText>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-400">{t('settingsPage.macroTypeLabel')}</label>
                <div className="flex gap-2">
                  {(['text', 'role_add', 'role_remove'] as MacroType[]).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setMacroType(tp)}
                      className={`flex-1 text-[11px] font-bold py-2 rounded-lg border transition-all ${macroType === tp ? 'bg-purple-600 border-purple-600 text-white' : 'bg-[#0F0F1A] border-[#2A1F40] text-gray-400'}`}
                    >
                      {tp === 'text' ? t('settingsPage.macroTypeText') : tp === 'role_add' ? t('settingsPage.macroTypeRoleAdd') : t('settingsPage.macroTypeRoleRemove')}
                    </button>
                  ))}
                </div>
              </div>

              {macroType === 'text' ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-400">{t('settingsPage.macroResponseLabel')}</label>
                  <textarea
                    value={macroResponse}
                    onChange={(e) => setMacroResponse(e.target.value)}
                    placeholder={t('settingsPage.macroResponsePlaceholder')}
                    maxLength={MACRO_RESPONSE_MAX_LENGTH}
                    rows={3}
                    className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:border-purple-500 outline-none resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-400">{t('settingsPage.macroRoleLabel')}</label>
                  <RoleSelect guildId={guildId || ''} value={macroRoleId} onChange={setMacroRoleId} />
                  <HelpText>{macroType === 'role_add' ? t('settingsPage.macroRoleAddHelp') : t('settingsPage.macroRoleRemoveHelp')}</HelpText>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={resetAddModal} disabled={isSavingMacro} className="text-sm font-bold text-gray-400 hover:text-white px-4 py-2">
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitMacro}
                  disabled={isSavingMacro || !macroName.trim() || (macroType === 'text' ? !macroResponse.trim() : !macroRoleId)}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-black px-5 py-2 rounded-lg"
                >
                  {isSavingMacro ? t('settingsPage.savingMacro') : t('settingsPage.saveMacroButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {dangerousConfirm && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-[#161626] border border-orange-500/50 rounded-2xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-orange-400 font-black text-base">{t('settingsPage.dangerousPermTitle')}</h3>
              <p className="text-sm text-gray-400">
                {t('settingsPage.dangerousPermBody', { perms: dangerousConfirm.dangerous.join(', ') })}
              </p>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setDangerousConfirm(null)} className="text-sm font-bold text-gray-400 hover:text-white px-4 py-2">
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => { setDangerousConfirm(null); submitRoleMacro(true); }}
                  className="bg-red-600 hover:bg-red-500 text-white text-sm font-black px-5 py-2 rounded-lg"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </SettingsPageContainer>
    </div>
  );
}
