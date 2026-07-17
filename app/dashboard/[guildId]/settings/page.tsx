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

  // 📡 1. 서버 통합 매트릭스 로드
  const fetchAllSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');
    
    fetch(`/api/settings/${guildId}`)
      .then(async (res) => {
        const resData = await res.json();
        if (res.ok && resData.ok && resData.settings) {
          setLanguage(resData.settings.language || 'en');
          setCommands(resData.settings.custom_commands || {});
          setMessage('Matrix settings successfully decrypted.');
        } else {
          // ⚡ [클로드 수정 제안 적용] 로드 실패 시 에러 필드 및 HTTP 상태 매핑
          setMessage Luz(`Load failed [${res.status}]: ${resData.error || resData.message || 'Unknown configuration state.'}`);
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
    fetchAllSettings();
  }, [guildId]);

  // 🌐 2. 통합 백엔드 저장 처리 파이프라인
  const saveUnifiedSettings = async (nextCommands?: Record<string, string>, nextLang?: string) => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    
    const targetCommands = nextCommands !== undefined ? nextCommands : commands;
    const targetLang = nextLang !== undefined ? nextLang : language;

    try {
      const res = await fetch(`/api/settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: targetLang,
          custom_commands: targetCommands
        }),
      });

      const data = await res.json();
      
      // ⚡ [클로드 핵심 제안] 성공과 실패 분기문을 분리하여 진짜 에러 파싱
      if (res.ok && data.ok) {
        setMessage('Configuration matrix successfully deployed!');
        if (nextCommands !== undefined) setCommands(nextCommands);
        if (nextLang !== undefined) setLanguage(nextLang);
      } else {
        // 백엔드 실패는 error 필드로 옴 + HTTP 상태도 같이 노출!
        setMessage(`Save failed [${res.status}]: ${data.error || data.message || 'Unknown Layer Exception.'}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Handshake Blocked: Core Pipeline Fault.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommand = () => {
    const name = prompt('Enter command name (e.g., hello):')?.trim().toLowerCase();
    const response = prompt('Enter command response text:');
    if (!name || !response) return;

    const updated = { ...commands, [name]: response };
    saveUnifiedSettings(updated, language);
  };

  const handleDeleteCommand = (name: string) => {
    if (!confirm(`Delete '${name}'?`)) return;
    
    const updated = { ...commands };
    delete updated[name];
    saveUnifiedSettings(updated, language);
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
                onChange={(e) => saveUnifiedSettings(commands, e.target.value)}
                disabled={loading}
                className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-sm text-white px-3 py-2 rounded focus:border-purple-500 outline-none cursor-pointer font-bold disabled:opacity-50"
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

          <div className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3 border-b border-[#2A1F40] pb-2">
              <span className="text-xs font-bold text-gray-400">CUSTOM MACRO COMMANDS</span>
              <button 
                onClick={handleAddCommand}
                disabled={loading}
                className="text-[11px] bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-2 py-1 rounded font-bold"
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
                    <span className="text-green-400 font-bold">/{trigger}</span>
                    <span className="text-gray-400 truncate max-w-[200px]">{response}</span>
                    <button 
                      onClick={() => handleDeleteCommand(trigger)}
                      disabled={loading}
                      className="text-red-400 hover:text-red-500 font-bold disabled:opacity-50"
                    >
                      [DELETE]
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}