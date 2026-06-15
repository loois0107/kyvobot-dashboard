'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const sessionResult = useSession();
  const session = sessionResult ? sessionResult.data : null;
  const status = sessionResult ? sessionResult.status : "loading";

  // 기존 금지어 상태
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  
  // 새로 추가된 환영 메시지 상태들
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoRoleId, setAutoRoleId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const TARGET_GUILD_ID = "1507639384453939381";

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('server_settings')
      .select('*')
      .eq('guild_id', TARGET_GUILD_ID)
      .single();

    if (data) {
      setBannedWords(data.banned_words || []);
      setWelcomeEnabled(data.welcome_enabled || false);
      setWelcomeChannelId(data.welcome_channel_id || '');
      setWelcomeMessage(data.welcome_message || '');
      setAutoRoleId(data.auto_role_id || '');
    }
    setLoading(false);
  };

  // 금지어 추가
  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || bannedWords.includes(newWord.trim().toLowerCase())) return;
    const updatedWords = [...bannedWords, newWord.trim().toLowerCase()];
    setLoading(true);
    const { error } = await supabase
      .from('server_settings')
      .update({ banned_words: updatedWords })
      .eq('guild_id', TARGET_GUILD_ID);

    if (!error) { setBannedWords(updatedWords); setNewWord(''); }
    setLoading(false);
  };

  // 금지어 삭제
  const removeWord = async (wordToRemove: string) => {
    const updatedWords = bannedWords.filter(w => w !== wordToRemove);
    setLoading(true);
    const { error } = await supabase
      .from('server_settings')
      .update({ banned_words: updatedWords })
      .eq('guild_id', TARGET_GUILD_ID);

    if (!error) setBannedWords(updatedWords);
    setLoading(false);
  };

  // 환영 메시지 설정 저장
  const saveWelcomeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('server_settings')
      .update({
        welcome_enabled: welcomeEnabled,
        welcome_channel_id: welcomeChannelId,
        welcome_message: welcomeMessage,
        auto_role_id: autoRoleId
      })
      .eq('guild_id', TARGET_GUILD_ID);

    if (error) alert(`저장 실패: ${error.message}`);
    else alert('👋 환영 메시지 설정이 성공적으로 저장되었습니다!');
    setLoading(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans">
        <p className="text-xl animate-pulse text-gray-400">Authenticating with Discord...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-sans p-6">
        <div className="max-w-md text-center bg-gray-800 p-10 rounded-2xl border border-gray-700 shadow-2xl">
          <h1 className="text-4xl font-extrabold text-blue-400 mb-4">KyvoBot</h1>
          <p className="text-gray-400 mb-8">Login with Discord to manage your server dashboard.</p>
          <button onClick={() => signIn('discord')} className="w-full bg-[#5865F2] text-white font-bold py-4 px-6 rounded-xl shadow-lg">
            Connect with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="border-b border-gray-700 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-400">KyvoBot Dashboard</h1>
            <p className="text-gray-400 mt-2">Welcome, <span className="text-white font-semibold">{session.user?.name}</span>!</p>
          </div>
          <button onClick={() => signOut()} className="bg-gray-700 text-sm font-semibold px-4 py-2 rounded-lg">Logout</button>
        </header>

        {/* 1. 금지어 섹션 */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6">🛡️ AutoMod: Banned Words</h2>
          <form onSubmit={addWord} className="flex gap-4 mb-8">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Enter a new word to ban..."
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold whitespace-nowrap">Add Filter</button>
          </form>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 min-h-[100px]">
            {bannedWords.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">No banned words configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {bannedWords.map((word, index) => (
                  <div key={index} className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg flex items-center gap-3">
                    <span>{word}</span>
                    <button type="button" onClick={() => removeWord(word)} className="text-red-400 font-bold">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 2. 새로 추가된 환영 메시지 섹션 */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">👋 Welcome Message & Auto-Role</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-300">{welcomeEnabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>

          <form onSubmit={saveWelcomeSettings} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Welcome Channel ID</label>
                <input type="text" value={welcomeChannelId} onChange={(e) => setWelcomeChannelId(e.target.value)} placeholder="e.g. 123456789012345678" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Auto-Role ID (Give on Join)</label>
                <input type="text" value={autoRoleId} onChange={(e) => setAutoRoleId(e.target.value)} placeholder="e.g. 987654321098765432" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Custom Welcome Message</label>
              <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={4} placeholder="Hello {user}, welcome to {server}! You are member #{member_count}!" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none resize-none" />
              <p className="text-xs text-gray-500 mt-2">Available tags: <span className="text-blue-400">{'{user}'}</span>, <span className="text-blue-400">{'{username}'}</span>, <span className="text-blue-400">{'{server}'}</span>, <span className="text-blue-400">{'{member_count}'}</span></p>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
              {loading ? "Saving..." : "Save Welcome Settings"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
