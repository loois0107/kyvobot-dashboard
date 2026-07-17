'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function SettingsPage() {
  const params = useParams();
  const guildId = params?.guildId as string | undefined;

  const [commands, setCommands] = useState<{ [key: string]: string }>({});
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 🌐 [클로드 최종 조언 설계도 이식] stats가 아닌 세로 개설한 전용 GET 라우트로 데이터 fetch
  const fetchSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');
    
    fetch(`/api/settings/${guildId}`)
      .then((res) => res.json())
      .then((resData) => {
        // 3단 폴백 및 안전 장치 탑재 연동
        if (resData.ok && resData.settings) {
          setLanguage(resData.settings.language || 'en');
          setCommands(resData.settings.custom_commands || {});
          setMessage('Matrix settings successfully decrypted.');
        } else {
          setMessage(resData.message || 'No settings found.');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage('Failed to fetch settings from network core.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, [guildId]);

  const saveSettings = () => {
    if (!guildId || guildId === '[guildId]') return alert('Invalid Active Guild Context.');
    setLoading(true);
    setMessage('');

    fetch(`/api/settings/${guildId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_commands: commands,
        language: language
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => 'Unknown Raw Body');
          throw new Error(`HTTP ${res.status} // ${errText}`);
        }
        return res.json();
      })
      .then((resData) => {
        if (resData.ok) {
          setMessage('Configuration matrix successfully deployed!');
        } else {
          setMessage(`Bypass failed: ${resData.message || 'Unauthorized'}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage(`Handshake Blocked: ${err.message}`);
        setLoading(false);
      });
  };

  const handleAddCommand = () => {
    const trigger = prompt('Enter command trigger (e.g., !hello):');
    const response = prompt('Enter command response text:');
    if (trigger && response) {
      setCommands({ ...commands, [trigger]: response });
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 border-b border-[#2A1F40] pb-4">
          <h1 className="text-2xl font-extrabold text-purple-400">KYVO NETWORKS // SERVER MANAGEMENT</h1>
          <p className="text-xs text-[#57576F] mt-1">Configure automated behaviors and macros.</p>
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">ACTIVE CONTEXT</label>
              <div className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-purple-400 px-3 py-2 rounded font-bold select-none">
                Guild {guildId ? guildId : 'Loading...'}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">SERVER LANGUAGE</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:border-purple-500 outline-none cursor-pointer font-bold"
              >
                <option value="en">🇺🇸 English (EN)</option>
                <option value="ko">🇰🇷 한국어 (KO)</option>
              </select>
            </div>
          </div>

          {message && (
            <div className="bg-[#0F0F1A] border border-purple-900/50 text-xs text-center p-3 rounded text-gray-300 break-all whitespace-pre-wrap">
              {message}
            </div>
          )}

          {/* 명령어 관리판 */}
          <div className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3 border-b border-[#2A1F40] pb-2">
              <span className="text-xs font-bold text-gray-400">CUSTOM MACRO COMMANDS</span>
              <button 
                onClick={handleAddCommand}
                className="text-[11px] bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded font-bold"
              >
                + ADD NEW
              </button>
            </div>

            {Object.keys(commands).length === 0 ? (
              <p className="text-xs text-[#57576F] text-center py-4">No macros configured in this database layer.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {Object.entries(commands).map(([trigger, response]) => (
                  <div key={trigger} className="flex justify-between items-center text-xs bg-[#161626] p-2 rounded border border-[#2A1F40]">
                    <span className="text-green-400 font-bold">{trigger}</span>
                    <span className="text-gray-400 truncate max-w-[200px]">{response}</span>
                    <button 
                      onClick={() => {
                        const next = { ...commands };
                        delete next[trigger];
                        setCommands(next);
                      }}
                      className="text-red-400 hover:text-red-500 font-bold"
                    >
                      [DELETE]
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={saveSettings}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-xs font-bold py-3 rounded-lg transition-all"
          >
            {loading ? 'DEPLOYING MATRIX...' : 'COMMIT CHANGES TO SUPABASE'}
          </button>
        </div>
      </div>
    </div>
  );
}