'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';

interface VectorNode {
  id: string;
  content: string;
  feedback: { up: number; down: number; total: number };
}

const MIN_FEEDBACK_SAMPLE = 3; // 이 미만이면 비율 대신 "데이터 부족" 표시 - 매너 평가 배지와 같은 이유

function FeedbackBadge({ feedback }: { feedback: { up: number; down: number; total: number } }) {
  const t = useT();
  if (feedback.total < MIN_FEEDBACK_SAMPLE) {
    return (
      <span className="bg-gray-600/10 text-gray-400 border border-gray-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
        {t('ticketSettingsPage.dataInsufficient', { total: feedback.total, min: MIN_FEEDBACK_SAMPLE })}
      </span>
    );
  }
  const helpfulPct = Math.round((feedback.up / feedback.total) * 100);
  const colorClass =
    helpfulPct >= 70
      ? 'bg-green-600/10 text-green-400 border-green-500/20'
      : helpfulPct >= 50
      ? 'bg-amber-600/10 text-amber-400 border-amber-500/20'
      : 'bg-red-600/10 text-red-400 border-red-500/20';
  return (
    <span className={`${colorClass} border text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase`}>
      👍 {helpfulPct}% ({feedback.up}/{feedback.total})
    </span>
  );
}

export default function TicketAiSettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const t = useT();

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

  // 🚦 Daily AI answer limits - empty string means "use the bot's default" (400 server / 20 user)
  const [dailyGuildLimit, setDailyGuildLimit] = useState('');
  const [dailyUserLimit, setDailyUserLimit] = useState('');

  // 🧬 RAG Knowledge Base States
  const [knowledgeInput, setKnowledgeInput] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [vectorNodes, setVectorNodes] = useState<VectorNode[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  useEffect(() => {
    const rawId = params?.guildId as string;
    if (rawId && rawId !== '[guildId]' && !rawId.includes('%5B')) {
      setGuildId(rawId);
      loadTicketSettings(rawId);
      loadKnowledgeNodes(rawId);
    }
  }, [params?.guildId]);

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
          setDailyGuildLimit(data.daily_guild_limit != null ? String(data.daily_guild_limit) : '');
          setDailyUserLimit(data.daily_user_limit != null ? String(data.daily_user_limit) : '');
        }
        setIsDirty(false);
      }
    } catch (err) { console.error(err); }
  };

  const loadKnowledgeNodes = async (id: string) => {
    try {
      const res = await fetch(`/api/ticket-knowledge?guild_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setVectorNodes(data.map((node: any) => ({
            id: String(node.id), content: node.content,
            feedback: node.feedback || { up: 0, down: 0, total: 0 },
          })));
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveMasterConfigs = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guildId || guildId === '[guildId]') return;

    // 🛡️ CRITICAL AI GUARD: 프롬프트에 {context} 변수가 누락되었는지 확인하여 봇이 바보가 되는 현상 차단
    if (!systemPrompt.includes('{context}')) {
      showToast(t('ticketSettingsPage.missingContextToken'), 'error');
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
          system_prompt: systemPrompt,
          daily_guild_limit: dailyGuildLimit,
          daily_user_limit: dailyUserLimit,
        }),
      });

      if (res.ok) {
        showToast(t('ticketSettingsPage.saveMasterSuccess'), 'success');
        setIsDirty(false);
      } else {
        showToast(t('ticketSettingsPage.saveMasterFailed'), 'error');
      }
    } catch (err: any) { showToast(t('ticketSettingsPage.networkDrop', { message: err.message }), 'error'); }
    finally { setIsSaving(false); }
  };

  const extractKnowledgeErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.error || data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const startEditingNode = (node: VectorNode) => {
    setEditingNodeId(node.id);
    setKnowledgeInput(node.content);
  };

  const cancelEditingNode = () => {
    setEditingNodeId(null);
    setKnowledgeInput('');
  };

  const injectKnowledgeNode = async () => {
    if (!knowledgeInput.trim()) {
      showToast(t('ticketSettingsPage.emptyKnowledgeError'), 'error');
      return;
    }
    if (!guildId || guildId === '[guildId]') return;

    setIsInjecting(true);
    try {
      // ✏️ 수정 모드면 PUT(재생성 + 옛 행 삭제), 아니면 기존과 동일한 POST(신규 추가).
      const res = editingNodeId
        ? await fetch('/api/ticket-knowledge', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingNodeId, guild_id: guildId.trim(), content: knowledgeInput.trim() }),
          })
        : await fetch('/api/ticket-knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guild_id: guildId.trim(), content: knowledgeInput.trim() }),
          });

      if (res.ok) {
        const result = await res.json();
        const savedRow = result.data?.[0];
        if (editingNodeId) {
          setVectorNodes(prev => prev.filter(node => node.id !== editingNodeId).concat(
            savedRow ? [{ id: String(savedRow.id), content: savedRow.content, feedback: { up: 0, down: 0, total: 0 } }] : []
          ));
          showToast(res.status === 207 ? await extractKnowledgeErrorMessage(res) : t('ticketSettingsPage.updatedEntrySuccess'), res.status === 207 ? 'error' : 'success');
        } else if (savedRow) {
          setVectorNodes(prev => [...prev, { id: String(savedRow.id), content: savedRow.content, feedback: { up: 0, down: 0, total: 0 } }]);
          showToast(t('ticketSettingsPage.injectedEntrySuccess'), 'success');
        }
        setKnowledgeInput('');
        setEditingNodeId(null);
      } else {
        showToast(await extractKnowledgeErrorMessage(res), 'error');
      }
    } catch (err: any) {
      showToast(t('ticketSettingsPage.networkDrop', { message: err.message }), 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  const purgeKnowledgeNode = async (id: string) => {
    if (!guildId || guildId === '[guildId]') return;
    try {
      const res = await fetch(`/api/ticket-knowledge?id=${id}&guild_id=${guildId.trim()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVectorNodes(prev => prev.filter(node => node.id !== id));
        showToast(t('ticketSettingsPage.deleteEntrySuccess'), 'info');
      } else {
        showToast(t('ticketSettingsPage.deleteEntryFailed'), 'error');
      }
    } catch (err: any) {
      showToast(t('ticketSettingsPage.networkDrop', { message: err.message }), 'error');
    }
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1] p-2 sm:p-4 md:p-6 pb-28">
      <div className="max-w-5xl mx-auto space-y-6">

        <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('ticketSettingsPage.title')}</h1>
            <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">{t('ticketSettingsPage.subtitle')}</p>
          </div>
          <button type="button" onClick={handleSaveMasterConfigs} disabled={isSaving} className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all cursor-pointer">
            {isSaving ? t('ticketSettingsPage.injecting') : t('ticketSettingsPage.saveButton')}
          </button>
        </header>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl px-4 sm:px-6 py-4">
          <p className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed">
            {t('ticketSettingsPage.intro')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-xs font-black tracking-widest text-[#5865F2] uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">{t('ticketSettingsPage.panelSetupTitle')}</h2>
            <p className="text-[10px] text-[#57576F]">{t('ticketSettingsPage.panelSetupDesc')}</p>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">{t('ticketSettingsPage.panelTitleLabel')}</label>
              <input type="text" value={panelTitle} onChange={(e) => { setPanelTitle(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">{t('ticketSettingsPage.panelDescLabel')}</label>
              <textarea rows={3} value={panelDesc} onChange={(e) => { setPanelDesc(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white resize-none focus:outline-none focus:border-[#5865F2]" />
            </div>
          </div>

          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-xs font-black tracking-widest text-green-400 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">{t('ticketSettingsPage.welcomeEmbedTitle')}</h2>
            <p className="text-[10px] text-[#57576F]">{t('ticketSettingsPage.welcomeEmbedDesc')}</p>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">{t('ticketSettingsPage.welcomeTitleLabel')}</label>
              <input type="text" value={welcomeTitle} onChange={(e) => { setWelcomeTitle(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-green-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#b5bac1] uppercase tracking-wider">{t('ticketSettingsPage.welcomeDescLabel')}</label>
              <textarea rows={3} value={welcomeDesc} onChange={(e) => { setWelcomeDesc(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white resize-none focus:outline-none focus:border-green-500" />
            </div>
          </div>

        </div>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-3 shadow-xl">
          <h2 className="text-xs font-black tracking-widest text-purple-400 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">{t('ticketSettingsPage.systemPromptTitle')}</h2>

          <span className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed font-medium block">
            {t('ticketSettingsPage.systemPromptDescPrefix')}{' '}
            <code className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded text-xs font-mono font-bold font-black">
              {"{context}"}
            </code>{' '}
            {t('ticketSettingsPage.systemPromptDescSuffix')}
          </span>

          <textarea
            rows={5} value={systemPrompt} onChange={(e) => { setSystemPrompt(e.target.value); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-xl p-4 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-3 shadow-xl">
          <h2 className="text-xs font-black tracking-widest text-orange-400 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">{t('ticketSettingsPage.dailyLimitsTitle')}</h2>
          <span className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed font-medium block">
            {t('ticketSettingsPage.dailyLimitsDesc')}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#b5bac1]">{t('ticketSettingsPage.guildLimitLabel')}</label>
              <input
                type="number" min={1} placeholder="400"
                value={dailyGuildLimit}
                onChange={(e) => { setDailyGuildLimit(e.target.value); setIsDirty(true); }}
                className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#b5bac1]">{t('ticketSettingsPage.userLimitLabel')}</label>
              <input
                type="number" min={1} placeholder="20"
                value={dailyUserLimit}
                onChange={(e) => { setDailyUserLimit(e.target.value); setIsDirty(true); }}
                className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl">
          <h2 className="text-xs font-black tracking-wider text-yellow-500 uppercase border-b border-[#2b2d31] pb-2 flex items-center gap-2">{t('ticketSettingsPage.knowledgeBaseTitle')}</h2>

          <span className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed font-medium block">
            {t('ticketSettingsPage.knowledgeBaseDesc')}
          </span>

          <textarea
            rows={3} placeholder={t('ticketSettingsPage.knowledgePlaceholder')}
            value={knowledgeInput} onChange={(e) => setKnowledgeInput(e.target.value)}
            className="w-full bg-[#111214] border border-[#232428] rounded-xl p-4 text-xs text-white focus:outline-none focus:border-yellow-500"
          />

          <div className="flex gap-2">
            <button type="button" onClick={injectKnowledgeNode} disabled={isInjecting} className="flex-1 bg-yellow-600/10 hover:bg-yellow-600 border border-yellow-500/20 text-yellow-400 hover:text-white text-xs font-black py-3 rounded-xl tracking-widest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isInjecting
                ? (editingNodeId ? t('ticketSettingsPage.reEmbedding') : t('ticketSettingsPage.injectingShort'))
                : (editingNodeId ? t('ticketSettingsPage.updateEntry') : t('ticketSettingsPage.injectEntry'))}
            </button>
            {editingNodeId && (
              <button type="button" onClick={cancelEditingNode} className="text-xs font-bold text-gray-400 hover:text-white px-4 py-3 rounded-xl border border-[#232428]">
                {t('common.cancel')}
              </button>
            )}
          </div>

          <div className="space-y-2 pt-2">
            {vectorNodes.map((node) => (
              <div key={node.id} className={`bg-[#111214] border rounded-xl p-4 flex justify-between items-center group shadow-inner ${editingNodeId === node.id ? 'border-yellow-500' : 'border-[#232428]'}`}>
                <div className="space-y-1 flex-1 mr-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-yellow-600/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
                      {t('ticketSettingsPage.vectorNodeId', { id: node.id.slice(-4) })}
                    </span>
                    <FeedbackBadge feedback={node.feedback} />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-200 font-medium pt-1 break-all">{node.content}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button type="button" onClick={() => startEditingNode(node)} className="text-yellow-400 hover:text-white bg-yellow-950/20 hover:bg-yellow-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-yellow-500/10 transition-all cursor-pointer">
                    {t('ticketSettingsPage.edit')}
                  </button>
                  <button type="button" onClick={() => purgeKnowledgeNode(node.id)} className="text-red-400 hover:text-white bg-red-950/20 hover:bg-red-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-500/10 transition-all cursor-pointer">
                    {t('ticketSettingsPage.purge')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">{t('ticketSettingsPage.unsavedWarning')}</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => { loadTicketSettings(guildId); setIsDirty(false); }} className="text-xs font-bold text-gray-400 hover:text-white transition">{t('common.discard')}</button>
            <button type="button" onClick={handleSaveMasterConfigs} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">{t('ticketSettingsPage.commitBrain')}</button>
          </div>
        </div>
      )}

    </div>
  );
}
