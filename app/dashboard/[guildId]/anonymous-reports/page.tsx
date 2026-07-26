'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

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
  const guildId = params?.guildId as string | undefined;

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
          setMessage(`Load failed [${res.status}]: ${data.error || 'Unknown error.'}`);
        }
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setMessage('Failed to fetch settings.');
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
        setQueueErrorMsg(data.message || `Request failed (${res.status})`);
        setQueueStatus('error');
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
      setQueueStatus('loaded');
    } catch (err) {
      console.error(err);
      setQueueErrorMsg('Network error while loading the queue.');
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
          action === 'approve' ? 'Report approved and published.' : action === 'reject' ? 'Report rejected.' : 'Report rejected and reporter blocked.',
          'success'
        );
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || `Request failed (${res.status})`, 'error');
        if (res.status === 409) {
          // 다른 경로(디스코드 버튼 등)가 이미 처리했다는 뜻 - 목록을 새로 맞춘다.
          await loadQueue();
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while processing this report.', 'error');
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
        setMessage('Settings saved successfully.');
      } else {
        setMessage(`Save failed [${res.status}]: ${data.error || 'Unknown error.'}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-purple-400">🌳 ANONYMOUS REPORTS</h1>
            <p className="text-xs text-[#57576F] mt-1">
              Configure where anonymous reports are reviewed and published. Reporter identity is never shown to admins.
            </p>
          </div>
          {hasLoaded && (
            <span
              className={`shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
                isConfigured
                  ? 'bg-green-950/40 text-green-400 border border-green-500/30'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isConfigured ? '✅ ACTIVE' : '⚠️ NOT CONFIGURED'}
            </span>
          )}
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div>
            <label className="text-xs text-gray-400 block mb-1">ACTIVE CONTEXT</label>
            <div className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-purple-400 px-3 py-2 rounded font-bold select-none">
              Guild {guildId ? guildId : 'Loading...'}
            </div>
          </div>

          <div className="bg-[#0F0F1A] border border-[#2A1F40] rounded-lg p-3 text-[11px] text-gray-300 leading-relaxed">
            Members submit reports via <span className="text-purple-300">/anonymous_report</span>. Each one goes to the
            <span className="text-purple-300"> admin channel</span> with Approve / Reject / Block buttons - reporter identity
            is stored in the database but never shown here. Approved reports are posted anonymously to the
            <span className="text-purple-300"> publish channel</span>.
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">ADMIN REVIEW CHANNEL ID</label>
            <input
              type="text"
              value={adminChannelId}
              onChange={(e) => setAdminChannelId(e.target.value)}
              disabled={loading}
              placeholder="e.g. 1234567890123456789"
              className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:outline-none focus:border-[#5865f2] disabled:opacity-50"
            />
            <p className="text-[10px] text-[#57576F] mt-2">Required. Only admins/mods should have access to this channel.</p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">PUBLIC PUBLISH CHANNEL ID</label>
            <input
              type="text"
              value={publishChannelId}
              onChange={(e) => setPublishChannelId(e.target.value)}
              disabled={loading}
              placeholder="e.g. 1234567890123456789"
              className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:outline-none focus:border-[#5865f2] disabled:opacity-50"
            />
            <p className="text-[10px] text-[#57576F] mt-2">
              Where approved reports get posted anonymously (e.g. a "bamboo forest" channel). Optional - if left empty, approvals just won't publish anywhere.
            </p>
            <p className="text-[10px] text-[#57576F] mt-2">
              How to find a channel ID: Discord Settings → Advanced → enable Developer Mode → right-click the channel → Copy Channel ID.
            </p>
          </div>

          {message && (
            <div className="bg-[#0F0F1A] border border-purple-900/50 text-xs text-center p-3 rounded text-gray-300 break-all whitespace-pre-wrap">
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-bold"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-[#2A1F40] pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-purple-400">📋 PENDING QUEUE</h2>
              <p className="text-[10px] text-[#57576F] mt-1">Reporter identity is never shown here, same as the Discord admin channel.</p>
            </div>
            <button type="button" onClick={loadQueue} className="shrink-0 text-[10px] font-bold text-purple-400 hover:underline">
              Refresh
            </button>
          </div>

          {queueStatus === 'loading' ? (
            <p className="text-xs text-gray-400 py-4">Loading reports...</p>
          ) : queueStatus === 'error' ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-red-400">⚠️ {queueErrorMsg}</p>
              <button type="button" onClick={loadQueue} className="text-xs font-bold text-purple-400 hover:underline">
                Retry
              </button>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">📭 No pending reports.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => {
                const isDeciding = decidingId === report.id;
                return (
                  <div key={report.id} className="bg-[#0F0F1A] border border-[#2A1F40] rounded-lg p-4 flex flex-col gap-3">
                    <p className="text-sm text-white whitespace-pre-wrap break-words">{report.content}</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-[#57576F]">{new Date(report.created_at).toLocaleString()}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecide(report.id, 'approve')}
                          disabled={isDeciding}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isDeciding ? '...' : 'APPROVE'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecide(report.id, 'reject')}
                          disabled={isDeciding}
                          className="bg-[#2A1F40] hover:bg-[#3a2a58] disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isDeciding ? '...' : 'REJECT'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecide(report.id, 'block')}
                          disabled={isDeciding}
                          className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isDeciding ? '...' : 'BLOCK'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
