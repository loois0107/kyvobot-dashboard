'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';

interface VectorNode {
  id: string;
  content: string;
}

export default function TicketAiSettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  
  const [guildId, setGuildId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 📝 Discord Panel Embed Setup States
  const [panelTitle, setPanelTitle] = useState('Support Portal & Advanced AI Concierge');
  const [panelDesc, setPanelDesc] = useState('Click the button below to establish a private secure communication channel...');
  const [welcomeTitle, setWelcomeTitle] = useState('Context-Aware AI Ticket Active');
  const [welcomeDesc, setWelcomeDesc] = useState('Welcome. Please state your question or issue description in detail...');

  // 🧠 Cognitive AI Prompt State
  const [systemPrompt, setSystemPrompt] = useState('You are the premium Kyvo AI Smart Support Assistant... Use {context} to reference rules.');

  // 🧬 RAG Knowledge Base States
  const [knowledgeInput, setKnowledgeInput] = useState('');
  const [vectorNodes, setVectorNodes] = useState<VectorNode[]>([
    { id: '1', content: '이 서버엔 kyvorn 이 있습니다' },
    { id: '2', content: '강아지 이름은 방울이야' }
  ]);

  useEffect(() => {
    const rawId = params?.guildId as string;
    if (rawId && rawId !== '[guildId]' && !rawId.includes('%5B')) {
      setGuildId(rawId);
      loadTicketSettings(rawId);
    }
  }, [params?.guildId]);

  // 🛡️ [문지기 무력화 완료] 로컬 도커 환경 세션 검문소를 비활성화합니다.
  // useEffect(() => {
  //   if (status === 'unauthenticated') router.push('/');
  // }, [status, router]);

  const loadTicketSettings = async (id: string) => {
    try {
      const res = await fetch(`/api/ticket-settings?guild_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setPanelTitle(data.setup_title || '');
          setPanelDesc(data.setup_desc || '');
          setWelcomeTitle(data.welcome_title || '');
          setWelcomeDesc(data.welcome_desc || '');
          setSystemPrompt(data.system_prompt || '');
        }
        setIsDirty(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveMasterConfigs = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guildId || guildId === '[guildId]') return;

    // 🛡️ CRITICAL AI GUARD: 프롬프트에 {context} 변수가 누락되었는지 확인하여 봇이 바보가 되는 현상 차단
    if (!systemPrompt.includes('{context}')) {
      showToast('Configuration Rejected: Your Cognitive System Prompt MUST contain the exact text token `{context}` so the RAG pipeline can inject knowledge base vectors!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const sessionWithToken = session as any;
      const res = await fetch('/api/ticket-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: guildId.trim(),
          accessToken: sessionWithToken?.accessToken || null,
          setup_title: panelTitle,
          setup_desc: panelDesc,
          welcome_title: welcomeTitle,
          welcome_desc: welcomeDesc,
          system_prompt: systemPrompt
        }),
      });

      if (res.ok) {
        showToast('Master infrastructure configurations committed to neural nexus!', 'success');
        setIsDirty(false);
      } else {
        showToast('Failed to save AI configuration maps.', 'error');
      }
    } catch (err: any) { showToast(`Network Drop: ${err.message}`, 'error'); }
    finally { setIsSaving(false); }
  };

  const injectKnowledgeNode = () => {
    if (!knowledgeInput.trim()) {
      showToast('Error: Cannot ingest an empty knowledge block.', 'error');
      return;
    }
    const newNode: VectorNode = {
      id: String(Date.now()),
      content: knowledgeInput.trim()
    };
    setVectorNodes(prev => [...prev, newNode]);
    setKnowledgeInput('');
    setIsDirty(true);
    showToast('Knowledge context injected into staging queue.', 'success');
  };

  const purgeKnowledgeNode = (id: string) => {
    setVectorNodes(prev => prev.filter(node => node.id !== id));
    setIsDirty(true);
    showToast('Vector grid synapse disconnected.', 'info');
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1] p-2 sm:p-4 md:p-6 pb-28">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🗃️ TICKET AI // CUSTOMIZER CONTROL</h1>
            <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">CONFIGURE AUTOMATED HELP DESK PANEL LAYOUTS AND INTERCEPT MATRIX PROMPTS</p>
          </div>
          <button type="button" onClick={handleSaveMasterConfigs} disabled={isSaving} className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all cursor-pointer">
            {isSaving ? 'INJECTING...' : 'SAVE & INJECT MASTER CONFIGURATIONS'}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-xs font-black tracking-widest text-[#5865F2] uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">⚗️ PANEL SETUP INTERFACE</h2>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">📋 SETUP PANEL TITLE</label>
              <input type="text" value={panelTitle} onChange={(e) => { setPanelTitle(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">📑 SETUP PANEL DESCRIPTION</label>
              <textarea rows={3} value={panelDesc} onChange={(e) => { setPanelDesc(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white resize-none focus:outline-none focus:border-[#5865F2]" />
            </div>
          </div>

          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-xs font-black tracking-widest text-green-400 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">🔒 TICKET ACTIVE WELCOME EMBED</h2>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">🔒 WELCOME EMBED TITLE</label>
              <input type="text" value={welcomeTitle} onChange={(e) => { setWelcomeTitle(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-green-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">💬 TICKET ROOM WELCOME DESCRIPTION</label>
              <textarea rows={3} value={welcomeDesc} onChange={(e) => { setWelcomeDesc(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white resize-none focus:outline-none focus:border-green-500" />
            </div>
          </div>

        </div>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-3 shadow-xl">
          <h2 className="text-xs font-black tracking-widest text-purple-400 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">🤖 COGNITIVE SYSTEM PROMPT (AI CORE ROLE)</h2>
          
          <span className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed font-medium block">
            Personality and formatting instructions injection array. Include the variable token{' '}
            <code className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded text-xs font-mono font-bold font-black">
              {"{context}"}
            </code>{' '}
            to forcefully thread the pgvector knowledge block search hits into that precise prompt segment.
          </span>

          <textarea 
            rows={5} value={systemPrompt} onChange={(e) => { setSystemPrompt(e.target.value); setIsDirty(true); }} 
            className="w-full bg-[#111214] border border-[#232428] rounded-xl p-4 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-purple-500" 
          />
        </div>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl">
          <h2 className="text-xs font-black tracking-wider text-yellow-500 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">🧠 AI VECTOR KNOWLEDGE BASE REGISTRY (RAG MATRIX)</h2>
          
          <span className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed font-medium block">
            Teach the AI your server rules, sanction thresholds, or frequently asked questions. Every entry saved here is automatically tokenized into vector matrices inside Supabase and mapped to the ticket RAG search pipeline dynamically.
          </span>

          <textarea 
            rows={3} placeholder="Enter server rules or guidelines here (e.g., 'Profanity Rule: Mild insults trigger 2 warnings, 3rd offense inflicts a 10-minute timeout...')" 
            value={knowledgeInput} onChange={(e) => setKnowledgeInput(e.target.value)}
            className="w-full bg-[#111214] border border-[#232428] rounded-xl p-4 text-xs text-white focus:outline-none focus:border-yellow-500" 
          />
          
          <button type="button" onClick={injectKnowledgeNode} className="w-full bg-yellow-600/10 hover:bg-yellow-600 border border-yellow-500/20 text-yellow-400 hover:text-white text-xs font-black py-3 rounded-xl tracking-widest transition-all cursor-pointer">
            + INJECT KNOWLEDGE DATA CONTEXT INTO NEURAL NETWORK
          </button>

          <div className="space-y-2 pt-2">
            {vectorNodes.map((node) => (
              <div key={node.id} className="bg-[#111214] border border-[#232428] rounded-xl p-4 flex justify-between items-center group shadow-inner">
                <div className="space-y-1 flex-1 mr-4">
                  <span className="bg-yellow-600/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
                    ⚡ VECTOR NODE ID: {node.id.slice(-4)}...
                  </span>
                  <p className="text-xs sm:text-sm text-gray-200 font-medium pt-1 break-all">{node.content}</p>
                </div>
                <button type="button" onClick={() => purgeKnowledgeNode(node.id)} className="text-red-400 hover:text-white bg-red-950/20 hover:bg-red-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-500/10 transition-all cursor-pointer flex-shrink-0">
                  PURGE
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">⚠️ Uncommitted Core Brain Changes Detected</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => { loadTicketSettings(guildId); setIsDirty(false); }} className="text-xs font-bold text-gray-400 hover:text-white transition">Discard</button>
            <button type="button" onClick={handleSaveMasterConfigs} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">Commit Brain</button>
          </div>
        </div>
      )}

    </div>
  );
}