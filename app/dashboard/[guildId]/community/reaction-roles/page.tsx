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
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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
    if (!window.confirm(t('reactionRolesPage.confirmDeleteBinding', { emoji: b.emoji, role: b.role_name }))) return;
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
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('reactionRolesPage.loading')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('reactionRolesPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadData}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('reactionRolesPage.title')}</h1>
        <HelpText className="mt-1 tracking-widest uppercase">
          {t('reactionRolesPage.subtitle')}
        </HelpText>
      </header>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary border-b border-border-default pb-2">
          {t('reactionRolesPage.addBindingTitle')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('reactionRolesPage.channelIdLabel')}</label>
            <ChannelSelect
              guildId={guildId}
              value={channelId}
              onChange={(id) => { setChannelId(id); setMessageId(''); setPreview(null); }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('reactionRolesPage.messageIdLabel')}</label>
            <MessageSelect
              guildId={guildId}
              channelId={channelId}
              value={messageId}
              onChange={(id) => { setMessageId(id); setPreview(null); }}
            />
          </div>
        </div>

        <Button type="button" variant="primary" onClick={handlePreview} disabled={!channelId || !messageId || isPreviewing}>
          {isPreviewing ? t('reactionRolesPage.checking') : t('reactionRolesPage.previewMessage')}
        </Button>

        {previewError && <p className="text-sm text-danger">⚠️ {previewError}</p>}

        {preview && (
          <Card elevated className="!p-3 !border-t-0 !border-r-0 !border-b-0 !border-l-4 !border-success space-y-1">
            <p className="text-sm text-text-secondary">{t('reactionRolesPage.foundItBy')} <span className="text-text-primary font-bold">{preview.author}</span></p>
            <p className="text-sm text-text-secondary italic">&quot;{preview.content}&quot;</p>
            <a href={preview.jump_url} target="_blank" rel="noreferrer" className="text-[10px] text-brand hover:underline">
              {t('reactionRolesPage.jumpToMessage')}
            </a>
          </Card>
        )}

        {preview && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">{t('reactionRolesPage.emojiLabel')}</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🎮"
                  className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-base text-text-primary focus:outline-none focus:border-brand"
                />
                <HelpText>{t('reactionRolesPage.emojiHelp')}</HelpText>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">{t('reactionRolesPage.roleLabel')}</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
                >
                  <option value="">{t('reactionRolesPage.selectRolePlaceholder')}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <HelpText>{t('reactionRolesPage.roleListHelp')}</HelpText>
              </div>
            </div>

            <Button type="button" variant="success" onClick={handleCreateClick} disabled={!emoji || !roleId || isSaving}>
              {isSaving ? t('reactionRolesPage.creatingBinding') : t('reactionRolesPage.createBinding')}
            </Button>
          </>
        )}
      </Card>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="!border-warning-border hover:!border-warning-border max-w-md w-full space-y-4">
            <h3 className="text-warning font-black text-base">{t('reactionRolesPage.dangerousPermTitle')}</h3>
            <p className="text-sm text-text-secondary">
              {t('reactionRolesPage.dangerousPermBody', { perms: confirmDialog.dangerous.join(', ') })}
            </p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setConfirmDialog(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => { setConfirmDialog(null); submitBinding(true); }}
              >
                {t('reactionRolesPage.confirmSaveAnyway')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {duplicateConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="!border-warning-border hover:!border-warning-border max-w-md w-full space-y-4">
            <h3 className="text-warning font-black text-base">{t('reactionRolesPage.duplicateExistsTitle')}</h3>
            <p className="text-sm text-text-secondary">
              {t('reactionRolesPage.duplicateExistsBody', { role: duplicateConfirm.existing.role_name })}
            </p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setDuplicateConfirm(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => { setDuplicateConfirm(null); submitBinding(false); }}
              >
                {t('reactionRolesPage.replaceExisting')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="space-y-3">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('reactionRolesPage.existingBindingsTitle')}
        </h3>
        {bindings.length === 0 ? (
          <p className="text-base text-text-secondary py-4">{t('reactionRolesPage.noBindingsYet')}</p>
        ) : (
          <div className="space-y-2">
            {bindings.map((b) => {
              const key = `${b.message_id}:${b.emoji}`;
              return (
                <Card elevated key={key} className="flex items-center justify-between gap-3 !px-3 !py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <EmojiBadge emoji={b.emoji} />
                    <span className="text-sm font-bold" style={{ color: roleColorHex(b.role_color) }}>{b.role_name}</span>
                    <a href={b.jump_url} target="_blank" rel="noreferrer" className="text-[10px] text-brand hover:underline shrink-0">
                      {t('reactionRolesPage.jump')}
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleDelete(b)}
                    disabled={deletingKey === key}
                    className="!px-3 !py-1.5 text-[10px] shrink-0"
                  >
                    {deletingKey === key ? t('reactionRolesPage.deletingBinding') : t('common.delete')}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
        <HelpText className="pt-2">{t('reactionRolesPage.deleteBindingFooter')}</HelpText>
      </Card>
    </SettingsPageContainer>
  );
}
