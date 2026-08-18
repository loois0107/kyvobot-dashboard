'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { useT, useLanguage } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getTicketAiPlaceholders } from '@/lib/ticketAiDefaults';

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
      <Badge variant="neutral">
        {t('ticketSettingsPage.dataInsufficient', { total: feedback.total, min: MIN_FEEDBACK_SAMPLE })}
      </Badge>
    );
  }
  const helpfulPct = Math.round((feedback.up / feedback.total) * 100);
  const variant = helpfulPct >= 70 ? 'success' : helpfulPct >= 50 ? 'warning' : 'danger';
  return (
    <Badge variant={variant}>
      👍 {helpfulPct}% ({feedback.up}/{feedback.total})
    </Badge>
  );
}

export default function TicketAiSettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const t = useT();
  const { lang } = useLanguage();

  const [guildId, setGuildId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 📝 Discord Panel Embed Setup States - start fully empty. The bot's own hardcoded fallback
  // (cogs/ticket_ai.py) already kicks in automatically whenever the saved value is empty/falsy, so
  // an admin who never touches these fields is not leaving anything broken - see
  // lib/ticketAiDefaults.ts's header comment. ticketAiPlaceholders below supplies short example
  // hints via the input's `placeholder` prop only - never a real value, never saved.
  const ticketAiPlaceholders = getTicketAiPlaceholders(lang);
  const [panelTitle, setPanelTitle] = useState('');
  const [panelDesc, setPanelDesc] = useState('');
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeDesc, setWelcomeDesc] = useState('');

  // 🧠 Cognitive AI Prompt State
  const [systemPrompt, setSystemPrompt] = useState('');

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

  const handleResetToBotDefault = () => {
    if (!window.confirm(t('ticketSettingsPage.resetToBotDefaultConfirm'))) return;
    setPanelTitle('');
    setPanelDesc('');
    setWelcomeTitle('');
    setWelcomeDesc('');
    setSystemPrompt('');
    setIsDirty(true);
    showToast(t('ticketSettingsPage.resetToBotDefaultDone'), 'info');
  };

  const handleSaveMasterConfigs = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guildId || guildId === '[guildId]') return;

    // 🛡️ CRITICAL AI GUARD: 프롬프트에 {context} 변수가 누락되었는지 확인하여 봇이 바보가 되는 현상 차단.
    // 완전히 비어있으면 검증 대상에서 제외한다 - 봇은 system_prompt가 falsy면 자기 하드코딩된
    // 안전한 기본 프롬프트(역할 설정 + {context} 삽입 + TRIGGER_STAFF_ALERT 로직 포함)를 그대로
    // 쓰므로(cogs/ticket_ai.py) 빈 값 저장은 실제로 안전하다. 여기서 막으면 오히려 "완전히 비우기"
    // 자체가 불가능해진다.
    if (systemPrompt.trim() && !systemPrompt.includes('{context}')) {
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
    <div className="min-h-screen bg-bg-base text-text-primary p-2 sm:p-4 md:p-6 pb-28">
      <SettingsPageContainer>

        <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('ticketSettingsPage.title')}</h1>
            <HelpText className="mt-1 tracking-widest uppercase">{t('ticketSettingsPage.subtitle')}</HelpText>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button type="button" variant="secondary" onClick={handleResetToBotDefault} className="flex-1 sm:flex-none">
              {t('ticketSettingsPage.resetToBotDefault')}
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveMasterConfigs} disabled={isSaving} className="flex-1 sm:flex-none">
              {isSaving ? t('ticketSettingsPage.injecting') : t('ticketSettingsPage.saveButton')}
            </Button>
          </div>
        </header>

        <Card>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            {t('ticketSettingsPage.intro')}
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Card className="space-y-4">
            <h2 className="text-sm font-black tracking-widest text-brand uppercase border-b border-border-default pb-2 flex items-center gap-2">{t('ticketSettingsPage.panelSetupTitle')}</h2>
            <HelpText>{t('ticketSettingsPage.panelSetupDesc')}</HelpText>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t('ticketSettingsPage.panelTitleLabel')}</label>
              <input type="text" value={panelTitle} onChange={(e) => { setPanelTitle(e.target.value); setIsDirty(true); }} placeholder={ticketAiPlaceholders.panelTitle} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t('ticketSettingsPage.panelDescLabel')}</label>
              <textarea rows={3} value={panelDesc} onChange={(e) => { setPanelDesc(e.target.value); setIsDirty(true); }} placeholder={ticketAiPlaceholders.panelDesc} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary resize-none focus:outline-none focus:border-brand" />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-semibold tracking-widest text-text-primary uppercase border-b border-border-default pb-2 flex items-center gap-2">{t('ticketSettingsPage.welcomeEmbedTitle')}</h2>
            <HelpText>{t('ticketSettingsPage.welcomeEmbedDesc')}</HelpText>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t('ticketSettingsPage.welcomeTitleLabel')}</label>
              <input type="text" value={welcomeTitle} onChange={(e) => { setWelcomeTitle(e.target.value); setIsDirty(true); }} placeholder={ticketAiPlaceholders.welcomeTitle} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t('ticketSettingsPage.welcomeDescLabel')}</label>
              <textarea rows={3} value={welcomeDesc} onChange={(e) => { setWelcomeDesc(e.target.value); setIsDirty(true); }} placeholder={ticketAiPlaceholders.welcomeDesc} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary resize-none focus:outline-none focus:border-brand" />
            </div>
          </Card>

        </div>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold tracking-widest text-text-primary uppercase border-b border-border-default pb-2 flex items-center gap-2">{t('ticketSettingsPage.systemPromptTitle')}</h2>

          <span className="text-sm sm:text-base text-text-secondary leading-relaxed font-medium block">
            {t('ticketSettingsPage.systemPromptDescPrefix')}{' '}
            <code className="bg-bg-elevated text-text-secondary border border-border-default px-1.5 py-0.5 rounded text-sm font-mono font-bold">
              {"{context}"}
            </code>{' '}
            {t('ticketSettingsPage.systemPromptDescSuffix')}
          </span>

          <textarea
            rows={5} value={systemPrompt} onChange={(e) => { setSystemPrompt(e.target.value); setIsDirty(true); }}
            placeholder={ticketAiPlaceholders.systemPrompt}
            className="w-full bg-bg-elevated border border-border-default rounded-xl p-4 text-sm sm:text-base text-text-primary font-mono focus:outline-none focus:border-brand"
          />
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold tracking-widest text-text-primary uppercase border-b border-border-default pb-2 flex items-center gap-2">{t('ticketSettingsPage.dailyLimitsTitle')}</h2>
          <span className="text-sm sm:text-base text-text-secondary leading-relaxed font-medium block">
            {t('ticketSettingsPage.dailyLimitsDesc')}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">{t('ticketSettingsPage.guildLimitLabel')}</label>
              <input
                type="number" min={1} placeholder="400"
                value={dailyGuildLimit}
                onChange={(e) => { setDailyGuildLimit(e.target.value); setIsDirty(true); }}
                className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">{t('ticketSettingsPage.userLimitLabel')}</label>
              <input
                type="number" min={1} placeholder="20"
                value={dailyUserLimit}
                onChange={(e) => { setDailyUserLimit(e.target.value); setIsDirty(true); }}
                className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-text-primary uppercase border-b border-border-default pb-2 flex items-center gap-2">{t('ticketSettingsPage.knowledgeBaseTitle')}</h2>

          <span className="text-sm sm:text-base text-text-secondary leading-relaxed font-medium block">
            {t('ticketSettingsPage.knowledgeBaseDesc')}
          </span>

          <textarea
            rows={3} placeholder={t('ticketSettingsPage.knowledgePlaceholder')}
            value={knowledgeInput} onChange={(e) => setKnowledgeInput(e.target.value)}
            className="w-full bg-bg-elevated border border-border-default rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:border-brand"
          />

          {editingNodeId && (vectorNodes.find((node) => node.id === editingNodeId)?.feedback.total ?? 0) > 0 && (
            <p className="text-[11px] font-bold text-warning">{t('ticketSettingsPage.editResetsFeedbackWarning')}</p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={injectKnowledgeNode} disabled={isInjecting} className="flex-1">
              {isInjecting
                ? (editingNodeId ? t('ticketSettingsPage.reEmbedding') : t('ticketSettingsPage.injectingShort'))
                : (editingNodeId ? t('ticketSettingsPage.updateEntry') : t('ticketSettingsPage.injectEntry'))}
            </Button>
            {editingNodeId && (
              <Button type="button" variant="ghost" onClick={cancelEditingNode}>
                {t('common.cancel')}
              </Button>
            )}
          </div>

          <div className="space-y-2 pt-2">
            {vectorNodes.map((node) => (
              <Card
                elevated
                key={node.id}
                className={`flex justify-between items-center ${editingNodeId === node.id ? '!border-brand hover:!border-brand' : ''}`}
              >
                <div className="space-y-1 flex-1 mr-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-bg-surface text-text-secondary border border-border-default text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
                      {t('ticketSettingsPage.vectorNodeId', { id: node.id.slice(-4) })}
                    </span>
                    <FeedbackBadge feedback={node.feedback} />
                  </div>
                  <p className="text-sm sm:text-base text-text-primary font-medium pt-1 break-all">{node.content}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button type="button" variant="secondary" onClick={() => startEditingNode(node)} className="!px-3 !py-1.5 text-[10px]">
                    {t('ticketSettingsPage.edit')}
                  </Button>
                  <Button type="button" variant="danger" onClick={() => purgeKnowledgeNode(node.id)} className="!px-3 !py-1.5 text-[10px]">
                    {t('ticketSettingsPage.purge')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>

      </SettingsPageContainer>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-surface/95 border border-brand/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-sm font-bold text-text-primary">{t('ticketSettingsPage.unsavedWarning')}</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => { loadTicketSettings(guildId); setIsDirty(false); }} className="!px-0">{t('common.discard')}</Button>
            <Button type="button" variant="success" onClick={handleSaveMasterConfigs}>{t('ticketSettingsPage.commitBrain')}</Button>
          </div>
        </div>
      )}

    </div>
  );
}
