'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function VoiceSettingsPage() {
  const params = useParams();
  const guildId = params?.guildId as string | undefined;

  const [triggerChannelId, setTriggerChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');

    fetch(`/api/voice-settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setTriggerChannelId(data.voice_settings?.trigger_channel_id || '');
        } else {
          setMessage(`Load failed [${res.status}]: ${data.error || 'Unknown error.'}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage('Failed to fetch voice settings.');
        setLoading(false);
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
      const res = await fetch(`/api/voice-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_channel_id: triggerChannelId || null }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setMessage('Voice settings saved successfully.');
      } else {
        setMessage(`Save failed [${res.status}]: ${data.error || 'Unknown error.'}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to save voice settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 border-b border-[#2A1F40] pb-4">
          <h1 className="text-2xl font-extrabold text-purple-400">🎙️ JOIN TO CREATE</h1>
          <p className="text-xs text-[#57576F] mt-1">
            Configure the trigger voice channel. Joining it spawns a personal temp channel and moves the member in automatically.
          </p>
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div>
            <label className="text-xs text-gray-400 block mb-1">ACTIVE CONTEXT</label>
            <div className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-purple-400 px-3 py-2 rounded font-bold select-none">
              Guild {guildId ? guildId : 'Loading...'}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">TRIGGER VOICE CHANNEL ID</label>
            <input
              type="text"
              value={triggerChannelId}
              onChange={(e) => setTriggerChannelId(e.target.value)}
              disabled={loading}
              placeholder="e.g. 1234567890123456789"
              className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:outline-none focus:border-[#5865f2] disabled:opacity-50"
            />
            <p className="text-[10px] text-[#57576F] mt-2">
              Enable Developer Mode in Discord, then right-click the voice channel and "Copy Channel ID". Leave empty to disable Join to Create.
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
