'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import { useGuildName } from '@/components/GuildsContext';
import ConfiguredBadge from '@/components/ConfiguredBadge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface PendingReport {
  id: number;
  content: string;
  status: string;
  created_at: string;
}

type QueueLoadStatus = 'loading' | 'loaded' | 'error';
type DecisionAction = 'approve' | 'reject' | 'block';

export default function AnonymousReportsSettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = params?.guildId as string | undefined;
  const guildName = useGuildName(guildId);

  const [adminChannelId, setAdminChannelId] = useState('');
  const [publishChannelId, setPublishChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [queueStatus, setQueueStatus] = useState<QueueLoadStatus>('loading');
  const [queueErrorMsg, setQueueErrorMsg] = useState('');
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const isConfigured = Boolean(adminChannelId.trim());

  const fetchSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');
    setMessageType(null);

    fetch(`/api/anonymous-reports-settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setAdminChannelId(data.anonymous_reports_settings?.admin_channel_id || '');
          setPublishChannelId(data.anonymous_reports_settings?.publish_channel_id || '');
        } else {
          setMessage(`${t('anonymousReportsPage.loadFailedPrefix')} [${res.status}]: ${data.error || t('anonymousReportsPage.unknownError')}`);
          setMessageType('error');
        }
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setMessage(t('anonymousReportsPage.fetchSettingsFailed'));
        setMessageType('error');
        setLoading(false);
        setHasLoaded(true);
      });
  };

  useEffect(() => {
    fetchSettings();
    loadQueue();
  }, [guildId]);

  const loadQueue = async () => {
    if (!guildId || guildId === '[guildId]') return;
    setQueueStatus('loading');
    setQueueErrorMsg('');
    try {
      const res = await fetch(`/api/anonymous-reports/${guildId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setQueueErrorMsg(data.message || t('common.requestFailed', { status: res.status }));
        setQueueStatus('error');
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
      setQueueStatus('loaded');
    } catch (err) {
      console.error(err);
      setQueueErrorMsg(t('anonymousReportsPage.queueLoadNetworkError'));
      setQueueStatus('error');
    }
  };

  // 🛡️ 처리는 봇의 내부 웹훅으로 위임된다(cogs/anonymous_reports.py의 _finalize_report) - 여기서
  // 승인/거절/차단 로직을 직접 구현하지 않는다. 성공하면 디스코드 관리자 큐 메시지의 버튼도
  // 봇이 같이 제거하므로, 여기서는 목록에서 optimistic하게 빼주기만 하면 된다.
  const handleDecide = async (reportId: number, action: DecisionAction) => {
    if (action === 'block' && !confirm(t('anonymousReportsPage.confirmBlock'))) return;
    setDecidingId(reportId);
    try {
      const res = await fetch(`/api/anonymous-reports/${guildId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, action }),
      });
      if (res.ok) {
        showToast(
          action === 'approve' ? t('anonymousReportsPage.reportApproved') : action === 'reject' ? t('anonymousReportsPage.reportRejected') : t('anonymousReportsPage.reportRejectedBlocked'),
          'success'
        );
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || t('common.requestFailed', { status: res.status }), 'error');
        if (res.status === 409) {
          // 다른 경로(디스코드 버튼 등)가 이미 처리했다는 뜻 - 목록을 새로 맞춘다.
          await loadQueue();
        }
      }
    } catch (err) {
      console.error(err);
      showToast(t('anonymousReportsPage.decideNetworkError'), 'error');
    } finally {
      setDecidingId(null);
    }
  };

  const handleSave = async () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');
    setMessageType(null);

    try {
      const res = await fetch(`/api/anonymous-reports-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_channel_id: adminChannelId || null,
          publish_channel_id: publishChannelId || null,
        }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setMessage(t('anonymousReportsPage.saveSettingsSuccess'));
        setMessageType('success');
      } else {
        setMessage(`${t('anonymousReportsPage.saveFailedPrefix')} [${res.status}]: ${data.error || t('anonymousReportsPage.unknownError')}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error(err);
      setMessage(t('anonymousReportsPage.saveSettingsFailed'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-6 selection:bg-brand/20">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-border-default pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-brand">{t('anonymousReportsPage.title')}</h1>
            <HelpText className="mt-1">
              {t('anonymousReportsPage.subtitle')}
            </HelpText>
          </div>
          {hasLoaded && <ConfiguredBadge configured={isConfigured} />}
        </header>

        <Card className="flex flex-col gap-6">
          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('common.activeContext')}</label>
            <div className="w-full bg-bg-elevated border border-border-default text-base text-text-primary px-3 py-2 rounded font-bold select-none">
              {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
            </div>
          </div>

          <div className="bg-bg-elevated border border-border-default rounded-lg p-3 text-[11px] text-text-secondary leading-relaxed">
            {t('anonymousReportsPage.explainer')}
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('anonymousReportsPage.adminChannelLabel')}</label>
            <ChannelSelect
              guildId={guildId || ''}
              value={adminChannelId}
              onChange={setAdminChannelId}
              className="text-base px-3 py-2"
            />
            <HelpText className="mt-2">{t('anonymousReportsPage.adminChannelHelp')}</HelpText>
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('anonymousReportsPage.publishChannelLabel')}</label>
            <ChannelSelect
              guildId={guildId || ''}
              value={publishChannelId}
              onChange={setPublishChannelId}
              className="text-base px-3 py-2"
            />
            <HelpText className="mt-2">
              {t('anonymousReportsPage.publishChannelHelp')}
            </HelpText>
          </div>

          {message && (
            <div
              className={`text-sm text-center p-3 rounded border break-all whitespace-pre-wrap ${
                messageType === 'success'
                  ? 'bg-success/10 border-success/20 text-success'
                  : 'bg-danger/10 border-danger/20 text-danger'
              }`}
            >
              {message}
            </div>
          )}

          <Button type="button" variant="primary" onClick={handleSave} disabled={loading} className="w-full text-base">
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </Card>

        <Card className="mt-8 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 border-b border-border-default pb-3">
            <div>
              <h2 className="text-base font-extrabold text-text-primary">{t('anonymousReportsPage.queueTitle')}</h2>
              <HelpText className="mt-1">{t('anonymousReportsPage.queueSubtitle')}</HelpText>
            </div>
            <Button type="button" variant="ghost" onClick={loadQueue} className="shrink-0 !px-2 !py-1 text-[10px]">
              {t('common.refresh')}
            </Button>
          </div>

          {queueStatus === 'loading' ? (
            <p className="text-sm text-text-secondary py-4">{t('anonymousReportsPage.loadingReports')}</p>
          ) : queueStatus === 'error' ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-danger">⚠️ {queueErrorMsg}</p>
              <Button type="button" variant="primary" onClick={loadQueue} className="!px-4 !py-2 text-sm">
                {t('common.retry')}
              </Button>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">{t('anonymousReportsPage.noPendingReports')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => {
                const isDeciding = decidingId === report.id;
                return (
                  <Card elevated key={report.id} className="flex flex-col gap-3">
                    <p className="text-base text-text-primary whitespace-pre-wrap break-words">{report.content}</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-muted">{new Date(report.created_at).toLocaleString()}</span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="success"
                          onClick={() => handleDecide(report.id, 'approve')}
                          disabled={isDeciding}
                          className="!px-3 !py-1.5 text-[10px]"
                        >
                          {isDeciding ? t('anonymousReportsPage.deciding') : t('anonymousReportsPage.approve')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDecide(report.id, 'reject')}
                          disabled={isDeciding}
                          className="!px-3 !py-1.5 text-[10px]"
                        >
                          {isDeciding ? t('anonymousReportsPage.deciding') : t('anonymousReportsPage.reject')}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleDecide(report.id, 'block')}
                          disabled={isDeciding}
                          className="!px-3 !py-1.5 text-[10px]"
                        >
                          {isDeciding ? t('anonymousReportsPage.deciding') : t('anonymousReportsPage.block')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </SettingsPageContainer>
    </div>
  );
}
