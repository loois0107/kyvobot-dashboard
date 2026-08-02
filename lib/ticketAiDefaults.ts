// Ticket AI panel/welcome/system-prompt fields now start (and reset to) completely empty strings -
// the bot's own hardcoded fallback (kyvobot/cogs/ticket_ai.py) already kicks in automatically
// whenever a guild's stored value is empty/falsy (see the `settings.get(...) if settings and
// settings.get(...) else "..."` pattern at lines 224/225/287/288, and the equivalent
// `if settings and settings.get("system_prompt")` guard for the AI system prompt). So an
// intentionally-blank field is not a broken state - the bot transparently uses its own safe
// English default until an admin writes something of their own. This file is NOT a mirror of that
// bot-side text anymore; it only holds short, jargon-free example hints shown as HTML `placeholder`
// text (grayed-out, never a real value, never saved) so a blank field still gives a sense of what
// to write instead of being a totally blank stare. Picked by the dashboard viewer's own KR/EN
// toggle - purely cosmetic, same as before.

export type TicketAiDefaultsLang = 'en' | 'ko';

export interface TicketAiPlaceholderSet {
  panelTitle: string;
  panelDesc: string;
  welcomeTitle: string;
  welcomeDesc: string;
  systemPrompt: string;
}

const PLACEHOLDER_EN: TicketAiPlaceholderSet = {
  panelTitle: 'e.g. Need Help? Open a Ticket',
  panelDesc: 'e.g. Click below to chat privately with our staff.',
  welcomeTitle: 'e.g. Your Ticket is Open',
  welcomeDesc: "e.g. Thanks for reaching out! Tell us what you need help with.",
  systemPrompt: 'e.g. Answer in a friendly, professional tone using the server rules below.',
};

const PLACEHOLDER_KO: TicketAiPlaceholderSet = {
  panelTitle: '예: 도움이 필요하신가요? 티켓을 열어주세요',
  panelDesc: '예: 아래 버튼을 누르면 스태프와 1:1로 대화할 수 있어요',
  welcomeTitle: '예: 티켓이 열렸어요',
  welcomeDesc: '예: 문의해주셔서 감사해요! 어떤 도움이 필요하신지 알려주세요',
  systemPrompt: '예: 친절하고 전문적인 말투로, 서버 규칙을 참고해서 답변해주세요',
};

const TICKET_AI_PLACEHOLDERS: Record<TicketAiDefaultsLang, TicketAiPlaceholderSet> = {
  en: PLACEHOLDER_EN,
  ko: PLACEHOLDER_KO,
};

export function getTicketAiPlaceholders(lang: TicketAiDefaultsLang): TicketAiPlaceholderSet {
  return TICKET_AI_PLACEHOLDERS[lang] ?? TICKET_AI_PLACEHOLDERS.en;
}
