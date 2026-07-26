'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MACRO_TRIGGER_MAX_LENGTH, MACRO_RESPONSE_MAX_LENGTH, MACRO_MAX_COUNT } from '@/lib/customCommandsSettings';

// 🛡️ /cc_add role_add·role_remove(봇 전용 관리자 슬래시 커맨드)로 만든 매크로는 문자열이 아니라
// {type, role_id} 객체로 저장된다(cogs/custom_commands.py의 _normalize_command_entry와 동일한
// 스키마). 예전엔 이 상태를 가정 안 하고 <span>{response}</span>로 그냥 렌더링해서, 역할 매크로가
// 하나라도 있는 서버는 이 페이지를 열면 React가 "Objects are not valid as a React child"로
// 그대로 크래시났다. 이제 값 형태를 먼저 판별해서 role_add/role_remove는 읽기 전용 배지로 안전하게
// 보여주고, 텍스트 매크로만 이 페이지에서 만들고 지울 수 있게 한다.
export type MacroEntry = string | { type: 'text'; content: string } | { type: 'role_add' | 'role_remove'; role_id: string };

export function isRoleMacro(value: MacroEntry): value is { type: 'role_add' | 'role_remove'; role_id: string } {
  return typeof value === 'object' && value !== null && (value.type === 'role_add' || value.type === 'role_remove');
}

export function macroResponseText(value: MacroEntry): string {
  if (typeof value === 'string') return value;
  if (value.type === 'text') return value.content;
  return '';
}

export default function SettingsPage() {
  const params = useParams();
  const guildId = params?.guildId as string | undefined;

  const [commands, setCommands] = useState<{ [key: string]: MacroEntry }>({});
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
          setMessage(`Load failed [${res.status}]: ${resData.error || resData.message || 'Unknown configuration state.'}`);
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
  const saveUnifiedSettings = async (nextCommands?: Record<string, MacroEntry>, nextLang?: string) => {
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

      if (res.ok && data.ok) {
        setMessage('Configuration matrix successfully deployed!');
        if (nextCommands !== undefined) setCommands(nextCommands);
        if (nextLang !== undefined) setLanguage(nextLang);
      } else {
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
    if (Object.keys(commands).length >= MACRO_MAX_COUNT) {
      setMessage(`Rejected: this server already has the maximum of ${MACRO_MAX_COUNT} custom macros. Delete one before adding another.`);
      return;
    }

    const name = prompt('Enter command name (e.g., hello):')?.trim().toLowerCase();
    const response = prompt('Enter command response text:');
    if (!name || !response) return;

    if (name.length > MACRO_TRIGGER_MAX_LENGTH) {
      setMessage(`Rejected: macro trigger must be ${MACRO_TRIGGER_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (response.length > MACRO_RESPONSE_MAX_LENGTH) {
      setMessage(`Rejected: macro response is ${response.length} characters - Discord's message limit is ${MACRO_RESPONSE_MAX_LENGTH}.`);
      return;
    }
    if (isRoleMacro(commands[name])) {
      setMessage(`Rejected: "${name}" is already a role macro managed via /cc_add·/cc_delete - delete it there first if you want to replace it.`);
      return;
    }

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
          <p className="text-xs text-[#57576F] mt-1">
            서버 언어와 텍스트 매크로(!트리거 또는 /트리거에 반응하는 자동 응답)를 관리합니다.
            역할 지급형 매크로는 /cc_add 슬래시 커맨드로만 만들 수 있어요.
          </p>
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
              <p className="text-[10px] text-[#57576F] mt-1">봇이 보내는 모든 메시지(임베드·안내문·에러 메시지 전부)의 언어를 결정하는 전역 설정이에요.</p>
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
            <p className="text-[10px] text-[#57576F] mb-3">
              채팅에 정확히 !트리거 또는 /트리거라고만 쳤을 때(뒤에 다른 말이 붙으면 반응 안 함) 등록된 텍스트를
              그대로 응답하는 매크로예요. 진짜 디스코드 슬래시 커맨드와는 별개 시스템이라 자동완성엔 안 떠요.
              이름 → 응답 텍스트 순서로 입력하세요 (응답은 최대 {MACRO_RESPONSE_MAX_LENGTH.toLocaleString()}자 - 디스코드 메시지 길이 제한).
            </p>

            {Object.keys(commands).length === 0 ? (
              <p className="text-xs text-[#57576F] text-center py-4">No macros configured in this database layer.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {Object.entries(commands).map(([trigger, value]) => (
                  <div key={trigger} className="flex justify-between items-center text-xs bg-[#161626] p-2 rounded border border-[#2A1F40]">
                    <span className="text-green-400 font-bold">/{trigger}</span>
                    {isRoleMacro(value) ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                        🔒 {value.type === 'role_add' ? 'grants' : 'removes'} role (ID: {value.role_id}) - edit via /cc_add·/cc_delete
                      </span>
                    ) : (
                      <span className="text-gray-400 truncate max-w-[200px]">{macroResponseText(value)}</span>
                    )}
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
