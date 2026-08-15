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

    fetch(`/api/anonymous-reports-settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setAdminChannelId(data.anonymous_reports_settings?.admin_channel_id || '');
          setPublishChannelId(data.anonymous_reports_settings?.publish_channel_id || '');
        } else {
          setMessage(`${t('anonymousReportsPage.loadFailedPrefix')} [${res.status}]: ${data.error || t('anonymousReportsPage.unknownError')}`);
        }
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setMessage(t('anonymousReportsPage.fetchSettingsFailed'));
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
      } else {
        setMessage(`${t('anonymousReportsPage.saveFailedPrefix')} [${res.status}]: ${data.error || t('anonymousReportsPage.unknownError')}`);
      }
    } catch (err) {
      console.error(err);
      setMessage(t('anonymousReportsPage.saveSettingsFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-purple-400">{t('anonymousReportsPage.title')}</h1>
            <HelpText className="mt-1">
              {t('anonymousReportsPage.subtitle')}
            </HelpText>
          </div>
          {hasLoaded && <ConfiguredBadge configured={isConfigured} />}
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('common.activeContext')}</label>
            <div className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-base text-purple-400 px-3 py-2 rounded font-bold select-none">
              {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
            </div>
          </div>

          <div className="bg-[#0F0F1A] border border-[#2A1F40] rounded-lg p-3 text-[11px] text-gray-300 leading-relaxed">
            {t('anonymousReportsPage.explainer')}
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('anonymousReportsPage.adminChannelLabel')}</label>
            <ChannelSelect
              guildId={guildId || ''}
              value={adminChannelId}
              onChange={setAdminChannelId}
              className="text-base px-3 py-2"
            />
            <HelpText className="mt-2">{t('anonymousReportsPage.adminChannelHelp')}</HelpText>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('anonymousReportsPage.publishChannelLabel')}</label>
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
            <div className="bg-[#0F0F1A] border border-purple-900/50 text-sm text-center p-3 rounded text-gray-300 break-all whitespace-pre-wrap">
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full text-base bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-bold"
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-[#2A1F40] pb-3">
            <div>
              <h2 className="text-base font-extrabold text-purple-400">{t('anonymousReportsPage.queueTitle')}</h2>
              <HelpText className="mt-1">{t('anonymousReportsPage.queueSubtitle')}</HelpText>
            </div>
            <button type="button" onClick={loadQueue} className="shrink-0 text-[10px] font-bold text-purple-400 hover:underline">
              {t('common.refresh')}
            </button>
          </div>

          {queueStatus === 'loading' ? (
            <p className="text-sm text-gray-400 py-4">{t('anonymousReportsPage.loadingReports')}</p>
          ) : queueStatus === 'error' ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-red-400">⚠️ {queueErrorMsg}</p>
              <button type="button" onClick={loadQueue} className="text-sm font-bold text-purple-400 hover:underline">
                {t('common.retry')}
              </button>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">{t('anonymousReportsPage.noPendingReports')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => {
                const isDeciding = decidingId === report.id;
                return (
                  <div key={report.id} className="bg-[#0F0F1A] border border-[#2A1F40] rounded-lg p-4 flex flex-col gap-3">
                    <p className="text-base text-white whitespace-pre-wrap break-words">{report.content}</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#8b8d98]">{new Date(report.created_at).toLocaleString()}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecide(report.id, 'approve')}
                          disabled={isDeciding}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isDeciding ? t('anonymousReportsPage.deciding') : t('anonymousReportsPage.approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecide(report.id, 'reject')}
                          disabled={isDeciding}
                          className="bg-[#2A1F40] hover:bg-[#3a2a58] disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isDeciding ? t('anonymousReportsPage.deciding') : t('anonymousReportsPage.reject')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecide(report.id, 'block')}
                          disabled={isDeciding}
                          className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isDeciding ? t('anonymousReportsPage.deciding') : t('anonymousReportsPage.block')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SettingsPageContainer>
    </div>
  );
}
