'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [guildId, setGuildId] = useState('');
  const [userId, setUserId] = useState('');
  const [commands, setCommands] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. 서버 설정 불러오기
  const fetchSettings = () => {
    if (!guildId) return alert('Enter the target Guild ID first.');
    setLoading(true);
    setMessage('');
    
    fetch(`/api/settings?guild_id=${guildId}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === 'success' && resData.data) {
          setCommands(resData.data.custom_commands || {});
          setMessage('Matrix settings successfully decrypted.');
        } else {
          setMessage('No existing matrix data found for this guild.');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage('Failed to fetch settings from network core.');
        setLoading(false);
      });
  };

  // 2. 서버 설정 저장하기
  const saveSettings = () => {
    if (!guildId || !userId) return alert('Guild ID and User ID are mandatory.');
    setLoading(true);
    setMessage('');

    fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild_id: guildId,
        user_id: userId,
        payload: { custom_commands: commands }
      })
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === 'success') {
          setMessage('Configuration matrix successfully deployed!');
        } else {
          setMessage(`Bypass failed: ${resData.message || 'Unauthorized'}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage('Network handshake failed.');
        setLoading(false);
      });
  };

  // 커스텀 명령어 임시 추가/수정 핸들러
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
          {/* 인증 매개변수 입력창 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">TARGET GUILD ID</label>
              <input 
                type="text" 
                value={guildId} 
                onChange={(e) => setGuildId(e.target.value)}
                className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:border-purple-500 outline-none"
                placeholder="1234567890..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">ADMIN USER ID</label>
              <input 
                type="text" 
                value={userId} 
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:border-purple-500 outline-none"
                placeholder="9876543210..."
              />
            </div>
          </div>

          <button 
            onClick={fetchSettings}
            className="border border-purple-500 bg-purple-950/20 hover:bg-purple-950/50 text-purple-400 text-xs py-2 rounded font-bold"
          >
            LOAD SERVER CONFIG MATRIX
          </button>

          {message && (
            <div className="bg-[#0F0F1A] border border-[#2A1F40] text-xs text-center p-2 rounded text-gray-300">
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
