'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const sessionResult = useSession();
  const session = sessionResult ? sessionResult.data : null;
  const status = sessionResult ? sessionResult.status : "loading";

  // Dashboard Tab Control State
  const [activeTab, setActiveTab] = useState('overview');

  // --- Existing State Variables ---
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoRoleId, setAutoRoleId] = useState('');
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const [cmdName, setCmdName] = useState('');
  const [cmdResponse, setCmdResponse] = useState('');
  
  // --- Extended Feature State Variables ---
  # 1. AutoMod Extension (cogs/automod)
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(false);
  const [linkBlockEnabled, setLinkBlockEnabled] = useState(false);
  
  # 2. Economy & Leveling System (cogs/economy)
  const [xpEnabled, setXpEnabled] = useState(false);
  const [xpRate, setXpRate] = useState(1.0);
  
  # 3. Interactive Components (cogs/interactive)
  const [ticketCategoryId, setTicketCategoryId] = useState('');

  const [loading, setLoading] = useState(false);
  const TARGET_GUILD_ID = "1507639384453939381";

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  // Load configuration from Supabase
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
      
      setAntiSpamEnabled(data.anti_spam_enabled || false);
      setLinkBlockEnabled(data.link_block_enabled || false);
      setXpEnabled(data.xp_enabled || false);
      setXpRate(data.xp_rate || 1.0);
      setTicketCategoryId(data.ticket_category_id || '');
    }
    setLoading(false);
  };

  // --- Handlers ---
  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || bannedWords.includes(newWord.trim().toLowerCase())) return;
    const updatedWords = [...bannedWords, newWord.trim().toLowerCase()];
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ banned_words: updatedWords }).eq('guild_id', TARGET_GUILD_ID);
    if (!error) { setBannedWords(updatedWords); setNewWord(''); }
    setLoading(false);
  };

  const removeWord = async (wordToRemove: string) => {
    const updatedWords = bannedWords.filter(w => w !== wordToRemove);
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ banned_words: updatedWords }).eq('guild_id', TARGET_GUILD_ID);
    if (!error) setBannedWords(updatedWords);
    setLoading(false);
  };

  const saveWelcomeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      welcome_enabled: welcomeEnabled,
      welcome_channel_id: welcomeChannelId || null,
      welcome_message: welcomeMessage || null,
      auto_role_id: autoRoleId || null
    }).eq('guild_id', TARGET_GUILD_ID);

    if (error) alert(`Failed to save: ${error.message}`);
    else alert('👋 Welcome settings have been successfully saved!');
    setLoading(false);
  };

  const addCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdName.trim() || !cmdResponse.trim()) return;
    let name = cmdName.trim();
    if (!name.startsWith('!')) name = '!' + name;
    const updatedCommands = { ...customCommands, [name]: cmdResponse.trim() };
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ custom_commands: updatedCommands }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Failed to add command: ${error.message}`);
    else { setCustomCommands(updatedCommands); setCmdName(''); setCmdResponse(''); }
    setLoading(false);
  };

  const removeCommand = async (nameToRemove: string) => {
    const updatedCommands = { ...customCommands };
    delete updatedCommands[nameToRemove];
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({ custom_commands: updatedCommands }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Failed to delete command: ${error.message}`);
    else setCustomCommands(updatedCommands);
    setLoading(false);
  };

  const saveAutoModSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      anti_spam_enabled: antiSpamEnabled,
      link_block_enabled: linkBlockEnabled
    }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Error: ${error.message}`);
    else alert('🛡️ Advanced AutoMod settings have been successfully saved!');
    setLoading(false);
  };

  const saveEconomySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      xp_enabled: xpEnabled,
      xp_rate: xpRate
    }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Error: ${error.message}`);
    else alert('💰 Economy and leveling settings have been synchronized!');
    setLoading(false);
  };

  const saveInteractiveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      ticket_category_id: ticketCategoryId || null
    }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Error: ${error.message}`);
    else alert('🎟️ Interactive component settings have been saved!');
    setLoading(false);
  };

  // Auth Status Rendering
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
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white font-sans">
      
      {/* 📱 Mobile Horizontal Scroll / Desktop Sidebar Navigation */}
      <div className="w-full md:w-64 bg-gray-950 p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-gray-800 shrink-0 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="hidden md:block mb-4 p-2">
          <h1 className="text-2xl font-black text-blue-400 tracking-wide">KyvoBot</h1>
          <p className="text-xs text-gray-400 mt-1">Logged in as {session.user?.name}</p>
        </div>
        
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'automod', label: '🛡️ AutoMod Security' },
          { id: 'welcome', label: '👋 Welcome & Roles' },
          { id: 'economy', label: '💰 XP & Leveling' },
          { id: 'commands', label: '⚙️ Custom Commands' },
          { id: 'interactive', label: '🎟️ Interactive System' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-left whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
        
        <button onClick={() => signOut()} className="md:mt-auto px-4 py-2.5 text-sm font-semibold text-left text-rose-400 hover:bg-rose-500/10 rounded-xl whitespace-nowrap">
          🚪 Logout
        </button>
      </div>

      {/* 💻 Main Dashboard Content */}
      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full transition-all duration-200">
        
        {/* ---- TAB 1: OVERVIEW ---- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 p-6 rounded-2xl">
              <h2 className="text-2xl font-bold text-blue-300">Welcome back, {session.user?.name}!</h2>
              <p className="text-gray-400 text-sm mt-1">KyvoBot is actively syncing real-time configurations for Target Guild (ID: {TARGET_GUILD_ID}).</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Banned Words Filter</span>
                <p className="text-2xl font-black text-red-400 mt-1">{bannedWords.length} Filters Active</p>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Custom Commands</span>
                <p className="text-2xl font-black text-blue-400 mt-1">{Object.keys(customCommands).length} Commands Enabled</p>
              </div>
            </div>
          </div>
        )}

        {/* ---- TAB 2: AUTOMOD ---- */}
        {activeTab === 'automod' && (
          <div className="space-y-6">
            {/* Word Filters */}
            <section className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-red-400">🤬 Banned Words Filter</h2>
              <form onSubmit={addWord} className="flex gap-2 mb-4">
                <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Enter a new word to filter..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
                <button type="submit" className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">Add Filter</button>
              </form>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                {bannedWords.length === 0 ? <p className="text-gray-500 text-sm m-auto">No filtered words configured yet.</p> : 
                  bannedWords.map((word, i) => (
                    <div key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-xs flex items-center gap-2">
                      <span>{word}</span>
                      <button type="button" onClick={() => removeWord(word)} className="font-bold hover:text-red-300">✕</button>
                    </div>
                  ))
                }
              </div>
            </section>

            {# Advanced Filters }
            <form onSubmit={saveAutoModSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
              <h2 className="text-xl font-semibold text-blue-400">🛡️ Advanced Anti-Abuse</h2>
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-700">
                <div>
                  <p className="text-sm font-medium">Anti-Spam System</p>
                  <p className="text-xs text-gray-400">Rate-limits and warns users spamming consecutive messages</p>
                </div>
                <input type="checkbox" checked={antiSpamEnabled} onChange={(e) => setAntiSpamEnabled(e.target.checked)} className="w-5 h-5 accent-blue-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-700">
                <div>
                  <p className="text-sm font-medium">Invite Link Blocker</p>
                  <p className="text-xs text-gray-400">Automatically intercepts and deletes external discord server invites</p>
                </div>
                <input type="checkbox" checked={linkBlockEnabled} onChange={(e) => setLinkBlockEnabled(e.target.checked)} className="w-5 h-5 accent-blue-600" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "Apply Security Settings"}</button>
            </form>
          </div>
        )}

        {/* ---- TAB 3: WELCOME MESSAGE ---- */}
        {activeTab === 'welcome' && (
          <form onSubmit={saveWelcomeSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-blue-400">👋 Welcome Message & Auto-Role</h2>
              <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} className="w-5 h-5 accent-blue-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Welcome Channel ID</label>
                <input type="text" value={welcomeChannelId} onChange={(e) => setWelcomeChannelId(e.target.value)} placeholder="e.g., 123456789012345678" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Auto-Role ID (Give on Join)</label>
                <input type="text" value={autoRoleId} onChange={(e) => setAutoRoleId(e.target.value)} placeholder="e.g., 987654321098765432" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Custom Welcome Message</label>
              <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3} placeholder="Hello {user}, welcome to {server}!" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
              <p className="text-[10px] text-gray-500 mt-1">Available placeholders: <span className="text-blue-400">{'{user}, {username}, {server}, {member_count}'}</span></p>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "Save Welcome Settings"}</button>
          </form>
        )}

        {/* ---- TAB 4: ECONOMY & LEVELING ---- */}
        {activeTab === 'economy' && (
          <form onSubmit={saveEconomySettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-amber-400">💰 Economy & Leveling System</h2>
              <input type="checkbox" checked={xpEnabled} onChange={(e) => setXpEnabled(e.target.checked)} className="w-5 h-5 accent-amber-500" />
            </div>
            <p className="text-xs text-gray-400">Enables server tracking where members gain custom XP allocations and complete level milestones by active chatting.</p>
            
            {xpEnabled && (
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
                <label className="block text-xs font-medium text-gray-400 mb-1">XP Progression Rate Multiplier</label>
                <input type="number" step="0.1" min="0.1" max="5.0" value={xpRate} onChange={(e) => setXpRate(parseFloat(e.target.value) || 1.0)} className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white w-28 focus:outline-none" />
                <span className="text-xs text-gray-500 ml-2">Default 1.0 (Higher integers accelerate progression velocity)</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "Sync Leveling System"}</button>
          </form>
        )}

        {/* ---- TAB 5: CUSTOM COMMANDS ---- */}
        {activeTab === 'commands' && (
          <div className="space-y-6">
            <form onSubmit={addCommand} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-3">
              <h2 className="text-xl font-semibold text-blue-400">⚙️ Custom Commands (Unlimited Storage)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" value={cmdName} onChange={(e) => setCmdName(e.target.value)} placeholder="Command (e.g., !rules)" className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                <input type="text" value={cmdResponse} onChange={(e) => setCmdResponse(e.target.value)} placeholder="Bot static string return text..." className="sm:col-span-2 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-sm font-bold py-2 rounded-lg">Create Custom Command & Sync to DB</button>
            </form>

            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 max-h-80 overflow-y-auto space-y-2">
              {Object.keys(customCommands).length === 0 ? <p className="text-gray-500 text-center text-sm py-4">No custom commands registered yet.</p> : 
                Object.entries(customCommands).map(([name, response]) => (
                  <div key={name} className="bg-gray-800 border border-gray-700 p-3 rounded-xl flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-mono font-bold">{name}</span>
                      <p className="text-gray-300 text-xs mt-1 truncate">{response}</p>
                    </div>
                    <button type="button" onClick={() => removeCommand(name)} className="text-red-400 font-bold px-2 hover:text-red-300">✕</button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ---- TAB 6: INTERACTIVE VIEW COMPONENTS ---- */}
        {activeTab === 'interactive' && (
          <form onSubmit={saveInteractiveSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <h2 className="text-xl font-semibold text-emerald-400">🎟️ Interactive Component System</h2>
            <p className="text-xs text-gray-400">Deploys rich discord interactive node structures including specialized text buttons and select menus.</p>
            
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-3">
              <h3 className="text-sm font-medium text-emerald-300">Support System (Ticket System)</h3>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Ticket Target Category ID (Category ID)</label>
                <input type="text" value={ticketCategoryId} onChange={(e) => setTicketCategoryId(e.target.value)} placeholder="Target category where temporary dynamic support private channels scale" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "Save Interactive Settings"}</button>
          </form>
        )}

      </main>
    </div>
  );
}
