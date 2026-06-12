'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
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
      .select('banned_words')
      .eq('guild_id', TARGET_GUILD_ID)
      .single();

    if (data) {
      setBannedWords(data.banned_words || []);
    }
    setLoading(false);
  };

  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || bannedWords.includes(newWord.trim().toLowerCase())) return;

    const updatedWords = [...bannedWords, newWord.trim().toLowerCase()];
    setLoading(true);

    // guild_id가 기본키가 되었기 때문에 이제 단 한 줄로 깔끔하게 저장 및 수정이 끝납니다!
    const { error } = await supabase
      .from('server_settings')
      .upsert({ guild_id: TARGET_GUILD_ID, banned_words: updatedWords });

    if (error) {
      alert(`저장 실패:\n${error.message}`);
    } else {
      setBannedWords(updatedWords);
      setNewWord('');
    }
    setLoading(false);
  };

  const removeWord = async (wordToRemove: string) => {
    const updatedWords = bannedWords.filter(w => w !== wordToRemove);
    setLoading(true);
    
    const { error } = await supabase
      .from('server_settings')
      .update({ banned_words: updatedWords })
      .eq('guild_id', TARGET_GUILD_ID);

    if (error) {
      alert(`삭제 실패:\n${error.message}`);
    } else {
      setBannedWords(updatedWords);
    }
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
          <p className="text-gray-400 mb-8">Login with your Discord account to manage and configure your server dashboard.</p>
          <button onClick={() => signIn('discord')} className="w-full bg-[#5865F2] text-white font-bold py-4 px-6 rounded-xl shadow-lg">
            Connect with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 border-b border-gray-700 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-400">KyvoBot Dashboard</h1>
            <p className="text-gray-400 mt-2">Welcome, <span className="text-white font-semibold">{session.user?.name}</span>!</p>
          </div>
          <button onClick={() => signOut()} className="bg-gray-700 text-sm font-semibold px-4 py-2 rounded-lg">Logout</button>
        </header>

        <section className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6">🛡️ AutoMod: Banned Words</h2>
          <form onSubmit={addWord} className="flex gap-4 mb-8">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Enter a new word to ban..."
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">Add Filter</button>
          </form>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 min-h-[150px]">
            {bannedWords.length === 0 ? (
              <p className="text-gray-500 text-center mt-8">No banned words configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {bannedWords.map((word, index) => (
                  <div key={index} className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg flex items-center gap-3">
                    <span>{word}</span>
                    <button onClick={() => removeWord(word)} className="text-red-400 font-bold">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}