'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const sessionResult = useSession();
  const session = sessionResult ? sessionResult.data : null;
  const status = sessionResult ? sessionResult.status : "loading";

  // 대시보드 탭 제어 상태 (모바일 가독성 핵심)
  const [activeTab, setActiveTab] = useState('overview');

  // --- 기존 State 유지 ---
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoRoleId, setAutoRoleId] = useState('');
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const [cmdName, setCmdName] = useState('');
  const [cmdResponse, setCmdResponse] = useState('');
  
  // --- 🌟 새롭게 확장된 신규 기능 State ---
  // 1. AutoMod 확장 (cogs/automod)
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(false);
  const [linkBlockEnabled, setLinkBlockEnabled] = useState(false);
  
  // 2. 이코노미 & 레벨 시스템 (cogs/economy)
  const [xpEnabled, setXpEnabled] = useState(false);
  const [xpRate, setXpRate] = useState(1.0);
  
  // 3. 인터랙티브 컴포넌트 (cogs/interactive)
  const [ticketCategoryId, setTicketCategoryId] = useState('');

  const [loading, setLoading] = useState(false);
  const TARGET_GUILD_ID = "1507639384453939381";

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  // DB에서 데이터 로드 (신규 컬럼들 로드 로직 추가)
  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('server_settings')
      .select('*')
      .eq('guild_id', TARGET_GUILD_ID)
      .single();

    if (data) {
      // 기존 데이터 매핑
      setBannedWords(data.banned_words || []);
      setWelcomeEnabled(data.welcome_enabled || false);
      setWelcomeChannelId(data.welcome_channel_id || '');
      setWelcomeMessage(data.welcome_message || '');
      setAutoRoleId(data.auto_role_id || '');
      setCustomCommands(data.custom_commands || {});
      
      // 신규 데이터 매핑 (DB에 컬럼 생성 후 연동 가능, 없을 시 기본값 fallback)
      setAntiSpamEnabled(data.anti_spam_enabled || false);
      setLinkBlockEnabled(data.link_block_enabled || false);
      setXpEnabled(data.xp_enabled || false);
      setXpRate(data.xp_rate || 1.0);
      setTicketCategoryId(data.ticket_category_id || '');
    }
    setLoading(false);
  };

  // --- 기존 핸들러 유지 (동작 보장) ---
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

  // --- 🌟 신규 기능 전용 저장 핸들러들 ---
  const saveAutoModSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      anti_spam_enabled: antiSpamEnabled,
      link_block_enabled: linkBlockEnabled
    }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Error: ${error.message}`);
    else alert('🛡️ 고급 보안 설정이 저장되었습니다!');
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
    else alert('💰 레벨 시스템 설정이 동기화되었습니다!');
    setLoading(false);
  };

  const saveInteractiveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('server_settings').update({
      ticket_category_id: ticketCategoryId || null
    }).eq('guild_id', TARGET_GUILD_ID);
    if (error) alert(`Error: ${error.message}`);
    else alert('🎟️ 티켓 시스템 카테고리가 등록되었습니다!');
    setLoading(false);
  };


  // --- 세션 및 로딩 UI 기동 ---
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
      
      {/* 📱 폰 네비게이션 가로 스크롤 & 데스크톱 사이드바 변환 메뉴 */}
      <div className="w-full md:w-64 bg-gray-950 p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-gray-800 shrink-0 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="hidden md:block mb-4 p-2">
          <h1 className="text-2xl font-black text-blue-400 tracking-wide">KyvoBot</h1>
          <p className="text-xs text-gray-400 mt-1">Logged in as {session.user?.name}</p>
        </div>
        
        {[
          { id: 'overview', label: '📊 대시보드 개요' },
          { id: 'automod', label: '🛡️ AutoMod 보안' },
          { id: 'welcome', label: '👋 환영 인사/역할' },
          { id: 'economy', label: '💰 XP & 레벨링' },
          { id: 'commands', label: '⚙️ 커스텀 명령어' },
          { id: 'interactive', label: '🎟️ 인터랙티브' },
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

      {/* 💻 메인 콘텐츠 뷰포트 */}
      <main className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto w-full transition-all duration-200">
        
        {/* ---- TAB 1: OVERVIEW ---- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 p-6 rounded-2xl">
              <h2 className="text-2xl font-bold text-blue-300">안녕하세요, {session.user?.name}님!</h2>
              <p className="text-gray-400 text-sm mt-1">KyvoBot이 지정된 서버(ID: {TARGET_GUILD_ID})의 설정을 실시간 동기화 중입니다.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">금지어 필터</span>
                <p className="text-2xl font-black text-red-400 mt-1">{bannedWords.length} 개 작동 중</p>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">등록된 커스텀 커맨드</span>
                <p className="text-2xl font-black text-blue-400 mt-1">{Object.keys(customCommands).length} 개 활성화</p>
              </div>
            </div>
          </div>
        )}

        {/* ---- TAB 2: AUTOMOD ---- */}
        {activeTab === 'automod' && (
          <div className="space-y-6">
            {/* 기존 금지어 기능 */}
            <section className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-red-400">🤬 Banned Words Filter</h2>
              <form onSubmit={addWord} className="flex gap-2 mb-4">
                <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="금지할 단어 입력..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
                <button type="submit" className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">추가</button>
              </form>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                {bannedWords.length === 0 ? <p className="text-gray-500 text-sm m-auto">필터링 중인 단어가 없습니다.</p> : 
                  bannedWords.map((word, i) => (
                    <div key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-xs flex items-center gap-2">
                      <span>{word}</span>
                      <button type="button" onClick={() => removeWord(word)} className="font-bold hover:text-red-300">✕</button>
                    </div>
                  ))
                }
              </div>
            </section>

            {/* 신규 고급 보안 기능 (cogs/automod 연동용) */}
            <form onSubmit={saveAutoModSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
              <h2 className="text-xl font-semibold text-blue-400">🛡️ Advanced Anti-Abuse</h2>
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-700">
                <div>
                  <p className="text-sm font-medium">도배 방지 시스템 (Anti-Spam)</p>
                  <p className="text-xs text-gray-400">짧은 시간 내 연속 메시지 도배 유저 차단</p>
                </div>
                <input type="checkbox" checked={antiSpamEnabled} onChange={(e) => setAntiSpamEnabled(e.target.checked)} className="w-5 h-5 accent-blue-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-700">
                <div>
                  <p className="text-sm font-medium">초대 링크 차단 (Link Blocker)</p>
                  <p className="text-xs text-gray-400">타 디스코드 서버 홍보 링크 자동 삭제</p>
                </div>
                <input type="checkbox" checked={linkBlockEnabled} onChange={(e) => setLinkBlockEnabled(e.target.checked)} className="w-5 h-5 accent-blue-600" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "보안 설정 적용"}</button>
            </form>
          </div>
        )}

        {/* ---- TAB 3: WELCOME MESSAGE (기존 코드 완벽 이식) ---- */}
        {activeTab === 'welcome' && (
          <form onSubmit={saveWelcomeSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-blue-400">👋 Welcome Message & Auto-Role</h2>
              <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} className="w-5 h-5 accent-blue-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Welcome Channel ID</label>
                <input type="text" value={welcomeChannelId} onChange={(e) => setWelcomeChannelId(e.target.value)} placeholder="채널 ID 입력" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Auto-Role ID (입장시 자동부여)</label>
                <input type="text" value={autoRoleId} onChange={(e) => setAutoRoleId(e.target.value)} placeholder="역할 ID 입력" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Custom Welcome Message</label>
              <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3} placeholder="Hello {user}, welcome to {server}!" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
              <p className="text-[10px] text-gray-500 mt-1">사용 가능한 치환 태그: <span className="text-blue-400">{'{user}, {username}, {server}, {member_count}'}</span></p>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "Save Welcome Settings"}</button>
          </form>
        )}

        {/* ---- TAB 4: ECONOMY & LEVELING (cogs/economy 연동용 신규 탭) ---- */}
        {activeTab === 'economy' && (
          <form onSubmit={saveEconomySettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-amber-400">💰 Economy & Leveling System</h2>
              <input type="checkbox" checked={xpEnabled} onChange={(e) => setXpEnabled(e.target.checked)} className="w-5 h-5 accent-amber-500" />
            </div>
            <p className="text-xs text-gray-400">활성화 시 멤버들이 채팅을 칠 때마다 서버 경험치를 획득하며 레벨업을 진행합니다.</p>
            
            {xpEnabled && (
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
                <label className="block text-xs font-medium text-gray-400 mb-1">XP 획득 배율 설정 (XP Rate)</label>
                <input type="number" step="0.1" min="0.1" max="5.0" value={xpRate} onChange={(e) => setXpRate(parseFloat(e.target.value) || 1.0)} className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white w-28 focus:outline-none" />
                <span className="text-xs text-gray-500 ml-2">기본값 1.0 (높을수록 렙업 속도가 빨라짐)</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "레벨링 시스템 동기화"}</button>
          </form>
        )}

        {/* ---- TAB 5: CUSTOM COMMANDS ---- */}
        {activeTab === 'commands' && (
          <div className="space-y-6">
            <form onSubmit={addCommand} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-3">
              <h2 className="text-xl font-semibold text-blue-400">⚙️ Custom Commands (무제한 저장)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" value={cmdName} onChange={(e) => setCmdName(e.target.value)} placeholder="명령어 (!rules)" className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                <input type="text" value={cmdResponse} onChange={(e) => setCmdResponse(e.target.value)} placeholder="봇 응답 메시지..." className="sm:col-span-2 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-sm font-bold py-2 rounded-lg">커스텀 명령어 추가 및 DB 동기화</button>
            </form>

            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700 max-h-80 overflow-y-auto space-y-2">
              {Object.keys(customCommands).length === 0 ? <p className="text-gray-500 text-center text-sm py-4">등록된 커스텀 명령어가 없습니다.</p> : 
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

        {/* ---- TAB 6: INTERACTIVE VIEW COMPONENTS (cogs/interactive 연동용 신규 탭) ---- */}
        {activeTab === 'interactive' && (
          <form onSubmit={saveInteractiveSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
            <h2 className="text-xl font-semibold text-emerald-400">🎟️ Interactive Component System</h2>
            <p className="text-xs text-gray-400">디스코드 내의 버튼, 선택 메뉴(Dropdown) 인터랙션 기능을 구성합니다.</p>
            
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-3">
              <h3 className="text-sm font-medium text-emerald-300">문의하기 (Ticket System)</h3>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">티켓 생성 카테고리 ID (Category ID)</label>
                <input type="text" value={ticketCategoryId} onChange={(e) => setTicketCategoryId(e.target.value)} placeholder="유저가 문의 버튼 클릭 시 채널이 생성될 카테고리 ID" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm font-bold py-2.5 rounded-lg transition">{loading ? "Saving..." : "인터랙티브 설정 저장"}</button>
          </form>
        )}

      </main>
    </div>
  );
}
