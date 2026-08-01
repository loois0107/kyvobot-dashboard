'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { parseEmojiDisplay } from '@/lib/reactionRoles';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import MessageSelect from '@/components/MessageSelect';

interface RoleOption {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
}

interface Binding {
  guild_id: string;
  channel_id: string;
  message_id: string;
  emoji: string;
  role_id: string;
  role_name: string;
  role_color: number;
  created_by: string;
  created_at: string;
  jump_url: string;
}

interface MessagePreview {
  author: string;
  content: string;
  timestamp: string;
  jump_url: string;
}

type LoadStatus = 'loading' | 'loaded' | 'error';

function roleColorHex(color: number): string {
  return color === 0 ? '#99AAB5' : `#${color.toString(16).padStart(6, '0')}`;
}

function EmojiBadge({ emoji }: { emoji: string }) {
  const parsed = parseEmojiDisplay(emoji);
  if (parsed.kind === 'custom') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={parsed.url} alt={parsed.name} className="w-5 h-5 inline-block" />;
  }
  return <span className="text-base">{parsed.value}</span>;
}

export default function ReactionRolesPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [channelId, setChannelId] = useState('');
  const [messageId, setMessageId] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [preview, setPreview] = useState<MessagePreview | null>(null);

  const [emoji, setEmoji] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ dangerous: string[] } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ existing: Binding } | null>(null);

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
      const res = await fetch(`/api/reaction-roles/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setBindings(data.bindings || []);
      setRoles(data.roles || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('reactionRolesPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const resetForm = () => {
    setChannelId('');
    setMessageId('');
    setPreview(null);
    setPreviewError('');
    setEmoji('');
    setRoleId('');
    setConfirmDialog(null);
    setDuplicateConfirm(null);
  };

  // 🛡️ 같은 채널+메시지+이모지로 다시 만들면 봇 쪽 upsert(on_conflict="message_id,emoji")가 기존
  // 매핑을 아무 경고 없이 대체한다 - 저장 전에 여기서 먼저 알려준다.
  const findExistingBinding = (): Binding | null => {
    return bindings.find((b) => b.channel_id === channelId && b.message_id === messageId && b.emoji === emoji) || null;
  };

  const handleCreateClick = () => {
    const existing = findExistingBinding();
    if (existing) {
      setDuplicateConfirm({ existing });
      return;
    }
    submitBinding(false);
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewError('');
    setPreview(null);
    try {
      const res = await fetch(`/api/reaction-roles/${guildId}/preview?channel_id=${encodeURIComponent(channelId)}&message_id=${encodeURIComponent(messageId)}`);
      if (!res.ok) {
        setPreviewError(await extractErrorMessage(res));
        return;
      }
      const data = await res.json();
      setPreview(data.message);
    } catch (err) {
      console.error(err);
      setPreviewError(t('reactionRolesPage.previewNetworkError'));
    } finally {
      setIsPreviewing(false);
    }
  };

  const submitBinding = async (confirmedDangerous: boolean) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/reaction-roles/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, message_id: messageId, emoji, role_id: roleId, confirmedDangerous }),
      });
      if (res.ok) {
        showToast(t('reactionRolesPage.createdSuccess'), 'success');
        resetForm();
        await loadData();
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        setConfirmDialog({ dangerous: data.dangerous_permissions || [] });
        return;
      }
      showToast(await extractErrorMessage(res), 'error');
    } catch (err) {
      console.error(err);
      showToast(t('reactionRolesPage.saveNetworkError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: Binding) => {
    const key = `${b.message_id}:${b.emoji}`;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/reaction-roles/${guildId}?message_id=${encodeURIComponent(b.message_id)}&emoji=${encodeURIComponent(b.emoji)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(t('reactionRolesPage.deletedSuccess'), 'success');
        await loadData();
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('reactionRolesPage.deleteNetworkError'), 'error');
    } finally {
      setDeletingKey(null);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        {t('reactionRolesPage.loading')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">{t('reactionRolesPage.loadFailed')}</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button type="button" onClick={loadData} className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-[#2b2d31] pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('reactionRolesPage.title')}</h1>
        <HelpText className="mt-1 tracking-widest uppercase">
          {t('reactionRolesPage.subtitle')}
        </HelpText>
      </header>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('reactionRolesPage.addBindingTitle')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#b5bac1]">{t('reactionRolesPage.channelIdLabel')}</label>
            <ChannelSelect
              guildId={guildId}
              value={channelId}
              onChange={(id) => { setChannelId(id); setMessageId(''); setPreview(null); }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#b5bac1]">{t('reactionRolesPage.messageIdLabel')}</label>
            <MessageSelect
              guildId={guildId}
              channelId={channelId}
              value={messageId}
              onChange={(id) => { setMessageId(id); setPreview(null); }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={!channelId || !messageId || isPreviewing}
          className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-xs font-black px-5 py-2.5 rounded-lg"
        >
          {isPreviewing ? t('reactionRolesPage.checking') : t('reactionRolesPage.previewMessage')}
        </button>

        {previewError && <p className="text-xs text-red-400">⚠️ {previewError}</p>}

        {preview && (
          <div className="bg-[#111214] rounded-lg p-3 border-l-4 border-[#23A55A] space-y-1">
            <p className="text-xs text-[#949ba4]">{t('reactionRolesPage.foundItBy')} <span className="text-white font-bold">{preview.author}</span></p>
            <p className="text-xs text-[#b5bac1] italic">&quot;{preview.content}&quot;</p>
            <a href={preview.jump_url} target="_blank" rel="noreferrer" className="text-[10px] text-[#5865F2] hover:underline">
              {t('reactionRolesPage.jumpToMessage')}
            </a>
          </div>
        )}

        {preview && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">{t('reactionRolesPage.emojiLabel')}</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🎮"
                  className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                />
                <HelpText>{t('reactionRolesPage.emojiHelp')}</HelpText>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">{t('reactionRolesPage.roleLabel')}</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                >
                  <option value="">{t('reactionRolesPage.selectRolePlaceholder')}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <HelpText>{t('reactionRolesPage.roleListHelp')}</HelpText>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateClick}
              disabled={!emoji || !roleId || isSaving}
              className="bg-[#23A55A] hover:bg-[#1a7f43] disabled:opacity-50 text-white text-xs font-black px-6 py-3 rounded-xl"
            >
              {isSaving ? t('reactionRolesPage.creatingBinding') : t('reactionRolesPage.createBinding')}
            </button>
          </>
        )}
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-orange-500/50 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-orange-400 font-black text-sm">{t('reactionRolesPage.dangerousPermTitle')}</h3>
            <p className="text-xs text-[#b5bac1]">
              {t('reactionRolesPage.dangerousPermBody', { perms: confirmDialog.dangerous.join(', ') })}
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmDialog(null)} className="text-xs font-bold text-gray-400 hover:text-white px-4 py-2">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDialog(null); submitBinding(true); }}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-5 py-2 rounded-lg"
              >
                {t('reactionRolesPage.confirmSaveAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-orange-500/50 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-orange-400 font-black text-sm">{t('reactionRolesPage.duplicateExistsTitle')}</h3>
            <p className="text-xs text-[#b5bac1]">
              {t('reactionRolesPage.duplicateExistsBody', { role: duplicateConfirm.existing.role_name })}
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setDuplicateConfirm(null)} className="text-xs font-bold text-gray-400 hover:text-white px-4 py-2">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { setDuplicateConfirm(null); submitBinding(false); }}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-5 py-2 rounded-lg"
              >
                {t('reactionRolesPage.replaceExisting')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('reactionRolesPage.existingBindingsTitle')}
        </h3>
        {bindings.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4">{t('reactionRolesPage.noBindingsYet')}</p>
        ) : (
          <div className="space-y-2">
            {bindings.map((b) => {
              const key = `${b.message_id}:${b.emoji}`;
              return (
                <div key={key} className="flex items-center justify-between gap-3 bg-[#111214] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <EmojiBadge emoji={b.emoji} />
                    <span className="text-xs font-bold" style={{ color: roleColorHex(b.role_color) }}>{b.role_name}</span>
                    <a href={b.jump_url} target="_blank" rel="noreferrer" className="text-[10px] text-[#5865F2] hover:underline shrink-0">
                      {t('reactionRolesPage.jump')}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    disabled={deletingKey === key}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50 px-2 py-1 shrink-0"
                  >
                    {deletingKey === key ? t('reactionRolesPage.deletingBinding') : t('common.delete')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <HelpText className="pt-2">{t('reactionRolesPage.deleteBindingFooter')}</HelpText>
      </div>
    </SettingsPageContainer>
  );
}
