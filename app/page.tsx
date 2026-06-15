'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const sessionResult = useSession();
  const session = sessionResult ? sessionResult.data : null;
  const status = sessionResult ? sessionResult.status : "loading";

  // 1. Banned Words State
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  
  // 2. Welcome Message State
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoRoleId, setAutoRoleId] = useState('');

  // 3. Custom Commands State
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const [cmdName, setCmdName] = useState('');
  const [cmdResponse, setCmdResponse] = useState('');
  
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
      setCustomCommands(data.custom_commands || {});
    }
    setLoading(false);
  };

  // Add Banned Word
  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || bannedWords.includes(newWord.trim().toLowerCase())) return;
    const updatedWords = [...bannedWords, newWord.trim().toLowerCase()];
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ banned_words: updatedWords }).eq('guild_id', TARGET_GUILD_ID);
    if (!error) { setBannedWords(updatedWords); setNewWord(''); }
    setLoading(false);
  };

  // Remove Banned Word
  const removeWord = async (wordToRemove: string) => {
    const updatedWords = bannedWords.filter(w => w !== wordToRemove);
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ banned_words: updatedWords }).eq('guild_id', TARGET_GUILD_ID);
    if (!error) setBannedWords(updatedWords);
    setLoading(false);
  };

  // Save Welcome Settings
  const saveWelcomeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      welcome_enabled: welcomeEnabled,
      welcome_channel_id: welcomeChannelId,
      welcome_message: welcomeMessage,
      auto_role_id: autoRoleId
    }).eq('guild_id', TARGET_GUILD_ID);

    if (error) alert(`Failed to save: ${error.message}`);
    else alert('👋 Welcome settings have been successfully saved!');
    setLoading(false);
  };

  // Add Custom Command
  const addCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdName.trim() || !cmdResponse.trim()) return;
    
    let name = cmdName.trim();
    if (!name.startsWith('!')) name = '!' + name;

    const updatedCommands = { ...customCommands, [name]: cmdResponse.trim() };
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ custom_commands: updatedCommands }).eq('guild_id', TARGET_GUILD_ID);

    if (error) {
      alert(`Failed to add command: ${error.message}`);
    } else {
      setCustomCommands(updatedCommands);
      setCmdName('');
      setCmdResponse('');
    }
    setLoading(false);
  };

  // Remove Custom Command
  const removeCommand = async (nameToRemove: string) => {
    const updatedCommands = { ...customCommands };
    delete updatedCommands[nameToRemove];
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ custom_commands: updatedCommands }).eq('guild_id', TARGET_GUILD_ID);

    if (error) alert(`Failed to delete command: ${error.message}`);
    else setCustomCommands(updatedCommands);
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

        {/* 1. AutoMod Section */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6">🛡️ AutoMod: Banned Words</h2>
          <form onSubmit={addWord} className="flex gap-4 mb-8">
            <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Enter a new word to ban..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none" />
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

        {/* 2. Welcome Message Section */}
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
              <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={4} placeholder="Hello {user}, welcome to {server}!" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none resize-none" />
              <p className="text-xs text-gray-500 mt-2">Available tags: <span className="text-blue-400">{'{user}'}</span>, <span className="text-blue-400">{'{username}'}</span>, <span className="text-blue-400">{'{server}'}</span>, <span className="text-blue-400">{'{member_count}'}</span></p>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
              {loading ? "Saving..." : "Save Welcome Settings"}
            </button>
          </form>
        </section>

        {/* 3. Custom Commands Section */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6">🛠️ Custom Commands</h2>
          <form onSubmit={addCommand} className="space-y-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input type="text" value={cmdName} onChange={(e) => setCmdName(e.target.value)} placeholder="Command (e.g. !rules)" className="bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none" />
              <input type="text" value={cmdResponse} onChange={(e) => setCmdResponse(e.target.value)} placeholder="Bot Response text..." className="sm:col-span-2 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">Create Custom Command</button>
          </form>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 min-h-[120px]">
            {Object.keys(customCommands).length === 0 ? (
              <p className="text-gray-500 text-center mt-6">No custom commands created yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(customCommands).map(([name, response]) => (
                  <div key={name} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-md font-mono text-sm font-bold mb-1">{name}</span>
                      <p className="text-gray-300 text-sm truncate">{response}</p>
                    </div>
                    <button type="button" onClick={() => removeCommand(name)} className="text-red-400 hover:text-red-500 font-bold px-2">✕</button>
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
