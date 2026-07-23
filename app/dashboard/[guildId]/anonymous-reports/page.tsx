'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function AnonymousReportsSettingsPage() {
  const params = useParams();
  const guildId = params?.guildId as string | undefined;

  const [adminChannelId, setAdminChannelId] = useState('');
  const [publishChannelId, setPublishChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

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
  }, [guildId]);

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
      </div>
    </div>
  );
}
