'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import RoleSelect from '@/components/RoleSelect';
import MemberSelect from '@/components/MemberSelect';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { TranslationKey } from '@/lib/i18n';

// 봇의 /internal/twitch/set 응답 status를 그대로 통과시킨 code -> 로컬라이즈된 문구 매핑.
// unreachable/server_config/discord_fetch_failed/missing_fields/role_not_found/unknown 등은
// 여기 없는 게 의도적 - 그런 케이스는 서버가 이미 사람이 읽을 영어 message를 내려주고, 이 페이지는
// 다른 라우트들과 동일하게 그 raw message를 그대로 보여준다(reaction-roles/tier-roles와 동일 관례).
const ADD_ERROR_CODE_KEY: Record<string, TranslationKey> = {
  role_needs_member: 'twitchPage.errRoleNeedsMember',
  channel_permission_denied: 'twitchPage.errChannelPermissionDenied',
  role_is_admin: 'twitchPage.errRoleIsAdmin',
  bot_missing_manage_roles: 'twitchPage.errBotMissingManageRoles',
  role_hierarchy_blocked: 'twitchPage.errRoleHierarchyBlocked',
  subscription_failed: 'twitchPage.errSubscriptionFailed',
  save_failed: 'twitchPage.errSaveFailed',
};

interface StreamerRow {
  broadcaster_id: string;
  broadcaster_login: string;
  is_live: boolean;
  last_checked_at: string | null;
  poll_health: 'healthy' | 'warning' | 'stale' | 'pending';
  minutes_since_last_check: number | null;
  announcement_channel_id: string;
  announcement_channel_name: string | null;
  member_id: string | null;
  member_display_name: string | null;
  live_role_id: string | null;
  live_role_name: string | null;
  role_grant_status: 'not_configured' | 'incomplete' | 'configured';
}

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function TwitchStreamersSettings() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  // 🛡️ 4단계(healthy/warning/stale/pending)는 Badge.tsx의 3버킷(success/warning/danger/neutral)에
  // 억지로 안 맞춘다(Badge.tsx:9-15 주석에 이미 이 페이지를 콕 집어 명시된 결정) - 색상 값만
  // 토큰 팔레트에서 그대로 가져온다.
  const HEALTH_BADGE: Record<StreamerRow['poll_health'], { emoji: string; label: string; color: string }> = {
    healthy: { emoji: '🟢', label: t('twitchPage.healthyLabel'), color: 'text-success' },
    warning: { emoji: '🟡', label: t('twitchPage.delayedLabel'), color: 'text-warning' },
    stale: { emoji: '🔴', label: t('twitchPage.stalledLabel'), color: 'text-danger' },
    pending: { emoji: '⚪', label: t('twitchPage.pendingLabel'), color: 'text-text-muted' },
  };

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [streamers, setStreamers] = useState<StreamerRow[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [streamerLogin, setStreamerLogin] = useState('');
  const [channelId, setChannelId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberLabel, setMemberLabel] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ dangerous: string[] } | null>(null);

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
      const res = await fetch(`/api/twitch/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setStreamers(data.streamers || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('twitchPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const resetAddForm = () => {
    setStreamerLogin('');
    setChannelId('');
    setMemberId('');
    setMemberLabel('');
    setRoleId('');
    setConfirmDialog(null);
  };

  // 봇 웹훅의 status(code)를 그대로 넘겨받아 이 페이지에서 아는 코드는 로컬라이즈하고, 모르는
  // 코드(네트워크/서버 설정 오류 등)는 다른 라우트들과 동일하게 서버가 내려준 영어 message를
  // 그대로 보여준다.
  const extractAddErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      if (data.code === 'streamer_not_found') {
        return t('twitchPage.errStreamerNotFound', { streamer: data.streamer || streamerLogin });
      }
      const key = ADD_ERROR_CODE_KEY[data.code];
      if (key) return t(key);
      return data.message || t('twitchPage.errGeneric');
    } catch {
      return t('twitchPage.errGeneric');
    }
  };

  const submitAdd = async (confirmedDangerous: boolean) => {
    setIsAdding(true);
    try {
      const res = await fetch(`/api/twitch/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamer: streamerLogin.trim(),
          channel_id: channelId,
          member_id: memberId || null,
          role_id: roleId || null,
          confirmedDangerous,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const login = (data?.streamer || streamerLogin.trim()).toLowerCase();
        resetAddForm();
        // 토스트에 넣을 역할/멤버 "이름"은 이 시점엔 ID밖에 없다 - 목록을 다시 불러와서 그 응답이
        // 채워주는 표시명(member_display_name/live_role_name)을 그대로 재사용한다.
        const listRes = await fetch(`/api/twitch/${guildId}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const freshStreamers: StreamerRow[] = listData.streamers || [];
          setStreamers(freshStreamers);
          const added = freshStreamers.find((s) => s.broadcaster_login.toLowerCase() === login);
          if (added && added.member_display_name && added.live_role_name) {
            showToast(t('twitchPage.addSuccessWithRole', { streamer: added.broadcaster_login, member: added.member_display_name, role: added.live_role_name }), 'success');
          } else {
            showToast(t('twitchPage.addSuccessNoRole', { streamer: added?.broadcaster_login || login }), 'success');
          }
        } else {
          showToast(t('twitchPage.addSuccessNoRole', { streamer: login }), 'success');
        }
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        setConfirmDialog({ dangerous: data.dangerous_permissions || [] });
        return;
      }
      showToast(await extractAddErrorMessage(res), 'error');
    } catch (err) {
      console.error(err);
      showToast(t('twitchPage.addNetworkError'), 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddClick = () => {
    submitAdd(false);
  };

  const handleRemove = async (streamer: StreamerRow) => {
    if (!window.confirm(t('twitchPage.confirmStopTracking', { login: streamer.broadcaster_login }))) return;
    setRemovingId(streamer.broadcaster_id);
    try {
      const res = await fetch(`/api/twitch/${guildId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcaster_id: streamer.broadcaster_id }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data?.subscriptions_also_removed
          ? t('twitchPage.subscriptionAlsoRemoved')
          : t('twitchPage.subscriptionStillActive');
        showToast(t('twitchPage.removedSuccess', { login: streamer.broadcaster_login, detail }), 'success');
        setStreamers((prev) => prev.filter((s) => s.broadcaster_id !== streamer.broadcaster_id));
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('twitchPage.removeNetworkError'), 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('twitchPage.loading')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('twitchPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadData} className="!px-6 !py-3 !rounded-xl text-sm font-black">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('twitchPage.title')}</h1>
        <HelpText className="mt-1">
          {t('twitchPage.subtitle')}
        </HelpText>
        <HelpText className="mt-2 normal-case">
          {t('twitchPage.healthLegend')}
        </HelpText>
      </header>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('twitchPage.addSectionTitle')}
        </h3>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('twitchPage.streamerLoginLabel')}</label>
          <input
            type="text"
            value={streamerLogin}
            onChange={(e) => setStreamerLogin(e.target.value)}
            placeholder={t('twitchPage.streamerLoginPlaceholder')}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary font-mono focus:outline-none focus:border-brand"
          />
          <HelpText>{t('twitchPage.streamerLoginHelp')}</HelpText>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('twitchPage.announcementChannel')}</label>
          <ChannelSelect guildId={guildId} value={channelId} onChange={setChannelId} />
          <HelpText>{t('twitchPage.announcementChannelHelp')}</HelpText>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('twitchPage.linkedMember')}</label>
            <MemberSelect
              guildId={guildId}
              value={memberId}
              onChange={(id, displayName) => { setMemberId(id); setMemberLabel(displayName || ''); }}
            />
            <HelpText>{t('twitchPage.linkedMemberHelp')}</HelpText>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('twitchPage.liveRole')}</label>
            <RoleSelect guildId={guildId} value={roleId} onChange={setRoleId} />
            <HelpText>{t('twitchPage.liveRoleHelp')}</HelpText>
          </div>
        </div>

        <Button
          type="button"
          variant="success"
          onClick={handleAddClick}
          disabled={!streamerLogin.trim() || !channelId || isAdding}
          className="!px-6 !py-3 !rounded-xl text-sm font-black"
        >
          {isAdding ? t('twitchPage.adding') : t('twitchPage.addButton')}
        </Button>
      </Card>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card elevated className="!border-warning/50 max-w-md w-full space-y-4">
            <h3 className="text-warning font-black text-base">{t('twitchPage.dangerousPermTitle')}</h3>
            <p className="text-sm text-text-secondary">
              {t('twitchPage.dangerousPermBody', { perms: confirmDialog.dangerous.join(', '), member: memberLabel || memberId })}
            </p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setConfirmDialog(null)} className="text-sm font-bold">
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => { setConfirmDialog(null); submitAdd(true); }}
                className="!px-5 !py-2 text-sm font-black"
              >
                {t('common.confirm')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {streamers.length === 0 ? (
        <Card elevated className="!py-12 border-dashed text-center">
          <p className="text-base text-text-muted">
            {t('twitchPage.noStreamersYet')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {streamers.map((s) => {
            const badge = HEALTH_BADGE[s.poll_health];
            return (
              <Card key={s.broadcaster_id} className="space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-text-primary">{s.broadcaster_login}</span>
                    {s.is_live ? (
                      <Badge variant="success">{t('twitchPage.live')}</Badge>
                    ) : (
                      <Badge variant="neutral">{t('twitchPage.offline')}</Badge>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold ${badge.color}`}>
                    {badge.emoji} {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
                  <div>
                    <span className="text-text-secondary uppercase text-[10px] font-bold block">{t('twitchPage.announcementChannel')}</span>
                    {s.announcement_channel_name ? `#${s.announcement_channel_name}` : t('twitchPage.unknownChannel', { id: s.announcement_channel_id })}
                  </div>
                  <div>
                    <span className="text-text-secondary uppercase text-[10px] font-bold block">{t('twitchPage.lastPollCheck')}</span>
                    {s.last_checked_at
                      ? t('twitchPage.minutesAgo', { minutes: Math.round(s.minutes_since_last_check ?? 0) })
                      : t('twitchPage.neverChecked')}
                  </div>
                  <div>
                    <span className="text-text-secondary uppercase text-[10px] font-bold block">{t('twitchPage.linkedMember')}</span>
                    {s.member_id ? (s.member_display_name || `Unknown member (${s.member_id})`) : t('twitchPage.notConfiguredDash')}
                  </div>
                  <div>
                    <span className="text-text-secondary uppercase text-[10px] font-bold block">{t('twitchPage.liveRole')}</span>
                    {s.live_role_id ? (s.live_role_name || `Unknown role (${s.live_role_id})`) : t('twitchPage.notConfiguredDash')}
                  </div>
                </div>

                {s.role_grant_status === 'incomplete' && (
                  <p className="text-[11px] font-bold text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
                    {t('twitchPage.incompleteWarning', {
                      reason: s.member_id ? t('twitchPage.incompleteReasonNoRole') : t('twitchPage.incompleteReasonNoMember'),
                    })}
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleRemove(s)}
                    disabled={removingId === s.broadcaster_id}
                    className="!px-4 !py-2 text-[11px] font-black"
                  >
                    {removingId === s.broadcaster_id ? t('twitchPage.removing') : t('twitchPage.remove')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </SettingsPageContainer>
  );
}
