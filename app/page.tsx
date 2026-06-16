'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

// 🌐 [CRITICAL CONFIG] Replace with your actual Render Python Bot app URL
const RENDER_BOT_URL = "https://your-bot-app.onrender.com"; 

export default function Dashboard() {
  const sessionResult = useSession();
  const session = sessionResult ? sessionResult.data : null;
  const status = sessionResult ? sessionResult.status : "loading";

  // Navigation Control
  const [activeTab, setActiveTab] = useState('overview');

  // --- Core State Variables ---
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoRoleId, setAutoRoleId] = useState('');
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const [cmdName, setCmdName] = useState('');
  const [cmdResponse, setCmdResponse] = useState('');
  
  // --- Extended Modules State Variables ---
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(false);
  const [linkBlockEnabled, setLinkBlockEnabled] = useState(false);
  const [xpEnabled, setXpEnabled] = useState(false);
  const [xpRate, setXpRate] = useState(1.0);
  const [ticketCategoryId, setTicketCategoryId] = useState('');

  // --- Live Automation Analytics State ---
  const [botStats, setBotStats] = useState({
    status: 'loading', bot_name: 'KyvoBot Core', version: '1.0.4', guilds_count: 0, cached_users: 0, ping_ms: 0
  });

  const [loading, setLoading] = useState(false);
  const TARGET_GUILD_ID = "1507639384453939381";

  // Safely extract discord provider user account unique identifier string from Next-Auth session context
  const OPERATOR_USER_ID = (session as any)?.user?.id || "";

  useEffect(() => {
    if (session) {
      fetchSettings();
      fetchLiveBotStats();
      const timer = setInterval(fetchLiveBotStats, 30000);
      return () => clearInterval(timer);
    }
  }, [session]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('server_settings').select('*').eq('guild_id', TARGET_GUILD_ID).single();
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

  const fetchLiveBotStats = async () => {
    try {
      const res = await fetch(`${RENDER_BOT_URL}/api/stats`);
      if (res.ok) setBotStats(await res.json());
      else setBotStats(prev => ({ ...prev, status: 'interrupted' }));
    } catch (e) {
      setBotStats(prev => ({ ...prev, status: 'offline' }));
    }
  };

  // 🌟 CENTRALIZED SECURE ROUTER: Transmits saving frames directly through the Python firewall checkpoint
  const commitSecureUpdate = async (updatedPayload: dict) => {
    setLoading(true);
    try {
      const res = await fetch(`${RENDER_BOT_URL}/api/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: TARGET_GUILD_ID,
          user_id: OPERATOR_USER_ID,
          payload: updatedPayload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Transmission anomaly.");
      return true;
    } catch (e: any) {
      alert(`🔒 Security Intercept: ${e.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || bannedWords.includes(newWord.trim().toLowerCase())) return;
    const updatedWords = [...bannedWords, newWord.trim().toLowerCase()];
    if (await commitSecureUpdate({ banned_words: updatedWords })) {
      setBannedWords(updatedWords);
      setNewWord('');
    }
  };

  const removeWord = async (wordToRemove: string) => {
    const updatedWords = bannedWords.filter(w => w !== wordToRemove);
    if (await commitSecureUpdate({ banned_words: updatedWords })) setBannedWords(updatedWords);
  };

  const saveWelcomeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSuccess = await commitSecureUpdate({
      welcome_enabled: welcomeEnabled,
      welcome_channel_id: welcomeChannelId || null,
      welcome_message: welcomeMessage || null,
      auto_role_id: autoRoleId || null
    });
    if (isSuccess) alert('👋 Welcome settings synchronized securely via Core Bot Guard!');
  };

  const addCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdName.trim() || !cmdResponse.trim()) return;
    let name = cmdName.trim();
    if (!name.startsWith('!')) name = '!' + name;
    const updatedCommands = { ...customCommands, [name]: cmdResponse.trim() };
    if (await commitSecureUpdate({ custom_commands: updatedCommands })) {
      setCustomCommands(updatedCommands);
      setCmdName('');
      setCmdResponse('');
    }
  };

  const removeCommand = async (nameToRemove: string) => {
    const updatedCommands = { ...customCommands };
    delete updatedCommands[nameToRemove];
    if (await commitSecureUpdate({ custom_commands: updatedCommands })) setCustomCommands(updatedCommands);
  };

  const saveAutoModSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await commitSecureUpdate({ anti_spam_enabled: antiSpamEnabled, link_block_enabled: linkBlockEnabled })) {
      alert('🛡️ Advanced security controls updated securely!');
    }
  };

  const saveEconomySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await commitSecureUpdate({ xp_enabled: xpEnabled, xp_rate: xpRate })) {
      alert('💰 Progression economy system config updated securely!');
    }
  };

  const saveInteractiveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await commitSecureUpdate({ ticket_category_id: ticketCategoryId || null })) {
      alert('🎟️ Interactive view configurations saved securely!');
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans">
        <p className="text-xl animate-pulse text-gray-400">Authenticating session via Discord...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-sans p-6">
        <div className="max-w-md w-full text-center bg-gray-800 p-10 rounded-2xl border border-gray-700 shadow-2xl">
          <h1 className="text-4xl font-black text-blue-500 mb-4 tracking-wide">KyvoBot</h1>
          <p className="text-gray-400 mb-8 text-sm">Secure enterprise panel connection. Connect your Discord account to proceed.</p>
          <button onClick={() => signIn('discord')} className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-6 rounded-xl shadow-lg transition duration-150">
            Connect with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white font-sans">
      
      {/* 📱 Navigation Matrix Component */}
      <div className="w-full md:w-64 bg-gray-950 p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-gray-800 shrink-0 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="hidden md:block mb-4 p-2">
          <h1 className="text-2xl font-black text-blue-500 tracking-wide">KyvoBot</h1>
          <p className="text-xs text-gray-400 mt-1">Operator: {session.user?.name}</p>
        </div>
        
        {[
          { id: 'overview', label: '📊 Dashboard Overview' },
          { id: 'automod', label: '🛡️ AutoMod Filters' },
          { id: 'welcome', label: '👋 Welcome & Auto-Roles' },
          { id: 'economy', label: '💰 XP & Progression' },
          { id: 'commands', label: '⚙️ Custom Core Commands' },
          { id: 'interactive', label: '🎟️ Interactive View Modules' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all duration-150 ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
        
        <button onClick={() => signOut()} className="md:mt-auto px-4 py-2.5 text-xs font-bold text-left text-rose-400 hover:bg-rose-500/10 rounded-xl whitespace-nowrap">
          🚪 Disconnect Terminal
        </button>
      </div>

      {/* 💻 Main Settings Panel Node */}
      <main className="flex-1 p-5 sm:p-10 max-w-4xl mx-auto w-full transition-all duration-200">
        
        {/* ---- TAB 1: OVERVIEW & TELEMETRY CHARTS ---- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gray-950 border border-gray-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  {botStats.bot_name} <span className="text-xs font-normal text-gray-500">v{botStats.version}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Asynchronous telemetry engine actively streaming from render hosting node.</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800 text-xs font-bold">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  botStats.status === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' :
                  botStats.status === 'booting' ? 'bg-amber-500 animate-spin' : 'bg-rose-500'
                }`} />
                <span className="uppercase tracking-wider font-mono">{botStats.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Network API Ping Latency</span>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{botStats.ping_ms} <span className="text-xs font-normal text-gray-500">ms</span></p>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Memory Cached Users</span>
                <p className="text-2xl font-black text-blue-400 mt-1 font-mono">{botStats.cached_users} <span className="text-xs font-normal text-gray-500">Profiles</span></p>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Connected Cluster Guilds</span>
                <p className="text-2xl font-black text-purple-400 mt-1 font-mono">{botStats.guilds_count} <span className="text-xs font-normal text-gray-500">Servers</span></p>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">📈 Network Traffic & Messaging Velocity</h3>
                  <p className="text-[11px] text-gray-400">Asynchronous metric logging vector index map inside current cluster node.</p>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 px-2 py-0.5 rounded-md font-mono">LIVE MATRIX</span>
              </div>

              <div className="relative w-full h-48 bg-gray-950 rounded-xl p-2 border border-gray-900 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="25" x2="500" y2="25" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="5,5" />
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="5,5" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="5,5" />
                  <path d="M 0 100 L 0 70 Q 100 20 200 60 T 400 30 L 500 10 L 500 100 Z" fill="url(#chartGradient)" />
                  <path d="M 0 70 Q 100 20 200 60 T 400 30 L 500 10" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="500" cy="10" r="4" fill="#60a5fa" className="animate-ping origin-center" />
                  <circle cx="500" cy="10" r="3" fill="#3b82f6" />
                </svg>
                <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[9px] text-gray-600 font-mono">
                  <span>-50m ago</span><span>-30m ago</span><span>-10m ago</span><span>LIVE TIME</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- TAB 2: AUTOMOD ---- */}
        {activeTab === 'automod' && (
          <div className="space-y-6">
            <section className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-lg font-bold mb-1 text-rose-400">🤬 Banned Words Dictionary</h2>
              <p className="text-xs text-gray-400 mb-4">Messages containing these strict sub-strings will be purged immediately.</p>
              <form onSubmit={addWord} className="flex gap-2 mb-4">
                <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Type restricted word..." className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white placeholder-gray-600" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition">Add Token</button>
              </form>
              <div className="bg-gray-950 rounded-xl p-4 border border-gray-800 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                {bannedWords.length === 0 ? <p className="text-gray-600 text-xs m-auto">Dictionary configuration vacant.</p> : 
                  bannedWords.map((word, i) => (
                    <div key={i} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-2">
                      <span>{word}</span>
                      <button type="button" onClick={() => removeWord(word)} className="font-bold hover:text-rose-300">✕</button>
                    </div>
                  ))
                }
              </div>
            </section>

            <form onSubmit={saveAutoModSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">🛡️ Advanced Infrastructure Security</h2>
              <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
                <div>
                  <p className="text-xs font-bold">Anti-Spam System Rate-Limiter</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Intercepts and flags users processing more than 5 messages per 3 seconds.</p>
                </div>
                <input type="checkbox" checked={antiSpamEnabled} onChange={(e) => setAntiSpamEnabled(e.target.checked)} className="w-4 h-4 accent-blue-500" />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
                <div>
                  <p className="text-xs font-bold">External Server Invite Interceptor</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Deletes messages indexing cross-server advertisement links.</p>
                </div>
                <input type="checkbox" checked={linkBlockEnabled} onChange={(e) => setLinkBlockEnabled(e.target.checked)} className="w-4 h-4 accent-blue-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/10">{loading ? "Synchronizing..." : "Commit Security Settings"}</button>
            </form>
          </div>
        )}

        {/* ---- TAB 3: WELCOME MESSAGE ---- */}
        {activeTab === 'welcome' && (
          <form onSubmit={saveWelcomeSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-blue-400">👋 Join Inbound Welcome Matrix</h2>
                <p className="text-xs text-gray-400 mt-0.5">Automates greetings and grants base tier access level roles.</p>
              </div>
              <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Welcome Target Channel ID</label>
                <input type="text" value={welcomeChannelId} onChange={(e) => setWelcomeChannelId(e.target.value)} placeholder="e.g., 1507639384453939381" className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-700" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Inbound Auto-Role ID Assignment</label>
                <input type="text" value={autoRoleId} onChange={(e) => setAutoRoleId(e.target.value)} placeholder="e.g., 987654321098765432" className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-700" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Custom Structural String Response</label>
              <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3} placeholder="Hello {user}, welcome to the server node cluster {server}!" className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none placeholder-gray-700" />
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                <span>Variables:</span>
                <span className="text-blue-400 font-mono">{"{user}"} = Mention</span>
                <span className="text-blue-400 font-mono">{"{username}"} = Plain text</span>
                <span className="text-blue-400 font-mono">{"{server}"} = Server name</span>
                <span className="text-blue-400 font-mono">{"{member_count}"} = Scaling integer</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/10">{loading ? "Synchronizing..." : "Save Incoming Protocol"}</button>
          </form>
        )}

        {/* ---- TAB 4: ECONOMY & LEVELING ---- */}
        {activeTab === 'economy' && (
          <form onSubmit={saveEconomySettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-amber-500">💰 Gamification Economy Tracker</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enables XP scaling node architectures based on texting velocity profiles.</p>
              </div>
              <input type="checkbox" checked={xpEnabled} onChange={(e) => setXpEnabled(e.target.checked)} className="w-4 h-4 accent-amber-500" />
            </div>
            
            {xpEnabled && (
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">XP Allocation Multiplier Coefficient</label>
                <div className="flex items-center gap-3">
                  <input type="number" step="0.1" min="0.1" max="5.0" value={xpRate} onChange={(e) => setXpRate(parseFloat(e.target.value) || 1.0)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white w-24 focus:outline-none focus:border-amber-500 font-mono" />
                  <p className="text-[11px] text-gray-500">Scale factor 1.0 baseline. Incremental rates accelerate level configuration checkpoints.</p>
                </div>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-amber-600/10">{loading ? "Synchronizing..." : "Synchronize Progression Economy"}</button>
          </form>
        )}

        {/* ---- TAB 5: CUSTOM COMMANDS ---- */}
        {activeTab === 'commands' && (
          <div className="space-y-6">
            <form onSubmit={addCommand} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-3">
              <h2 className="text-lg font-bold text-blue-400">⚙️ Unlimited Inline Custom Routing Map</h2>
              <p className="text-xs text-gray-400 mb-2">Maps matching prefixes directly to specific payload asset string responses.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" value={cmdName} onChange={(e) => setCmdName(e.target.value)} placeholder="Trigger key (e.g., !rules)" className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-700" />
                <input type="text" value={cmdResponse} onChange={(e) => setCmdResponse(e.target.value)} placeholder="Static output response..." className="sm:col-span-2 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-700" />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-2.5 rounded-xl transition">Deploy Pipeline Entry</button>
            </form>

            <div className="bg-gray-950 rounded-2xl p-4 border border-gray-800 max-h-80 overflow-y-auto space-y-2">
              {Object.keys(customCommands).length === 0 ? <p className="text-gray-600 text-center text-xs py-4">Custom dictionary database index empty.</p> : 
                Object.entries(customCommands).map(([name, response]) => (
                  <div key={name} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">{name}</span>
                      <p className="text-gray-400 text-xs mt-1 truncate">{response}</p>
                    </div>
                    <button type="button" onClick={() => removeCommand(name)} className="text-rose-400 font-bold px-2 hover:text-rose-300 transition text-sm">✕</button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ---- TAB 6: INTERACTIVE VIEW COMPONENTS ---- */}
        {activeTab === 'interactive' && (
          <form onSubmit={saveInteractiveSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <h2 className="text-lg font-bold text-emerald-400">🎟️ Discord Interactive DOM Components</h2>
            <p className="text-xs text-gray-400">Manages persistent UI button bindings and selection menu routers inside target frames.</p>
            
            <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold text-emerald-400">1:1 Customer Support Isolation Node (Ticket System)</h3>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Target Room Scaling Category ID</label>
                <input type="text" value={ticketCategoryId} onChange={(e) => setTicketCategoryId(e.target.value)} placeholder="e.g., 987654321098765432" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-gray-700" />
                <p className="text-[10px] text-gray-500 mt-1">Isolates single support channels under this specified categorization block dynamically on interaction click.</p>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-600/10">{loading ? "Synchronizing..." : "Commit Component Layouts"}</button>
          </form>
        )}

      </main>
    </div>
  );
}
