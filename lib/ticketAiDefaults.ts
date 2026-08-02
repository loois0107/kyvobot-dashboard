// Dashboard-side mirror of the bot's hardcoded ticket AI fallback text
// (kyvobot/cogs/ticket_ai.py). The bot itself only ever sends the English version below (mirrored
// 1:1, see the EN set) - these are what the bot actually uses whenever a guild has no row in
// guild_ticket_settings (or a specific field is empty).
//
// getTicketAiDefaults(lang) additionally exists purely as a dashboard-side starting point/example:
// the KO set is NOT sent by the bot in Korean anywhere - it's only what fills the page's initial
// (never-configured) fields and the "reset to bot default" button when the dashboard viewer's own
// KR/EN toggle is set to Korean, so a Korean-speaking admin gets a natural-Korean example to edit
// instead of staring at a wall of English before they've typed anything. Saving either version
// as-is (or editing it) works identically either way - the bot has no per-language branching for
// this feature (see cogs/ticket_ai.py), it just sends whatever ended up saved in guild_ticket_settings.
//
// Two fields can't be copied verbatim from the Python source:
// - The system prompt splices `retrieved_context` in via an f-string at a fixed spot, with no
//   {context} token. Saving that text as-is would fail the dashboard's "must contain {context}"
//   guard. DEFAULT_SYSTEM_PROMPT (and its KO counterpart) replace that splice point with a literal
//   {context} token - cogs/ticket_ai.py's custom-prompt path does
//   base_prompt.replace("{context}", retrieved_context), so saving either constant unmodified
//   produces the exact final prompt the bot's hardcoded fallback would have produced (EN) or a
//   natural-Korean equivalent instruction set (KO). TRIGGER_STAFF_ALERT is a literal string the
//   bot's Python code matches verbatim - it is NOT translated in the KO version.
// - The welcome embed's default description opens with `f"Welcome, {user.mention}."`, a per-ticket
//   Discord mention the bot has no dashboard-side templating hook for (a custom welcome_desc is
//   used byte-for-byte, no token substitution). DEFAULT_WELCOME_DESC drops that greeting instead of
//   inventing a token the bot doesn't support - resetting-and-saving is intentionally not 100%
//   identical to the bot's untouched fallback in this one respect.

export type TicketAiDefaultsLang = 'en' | 'ko';

export interface TicketAiDefaultSet {
  panelTitle: string;
  panelDesc: string;
  welcomeTitle: string;
  welcomeDesc: string;
  systemPrompt: string;
}

const EN: TicketAiDefaultSet = {
  panelTitle: '🎫 Support Portal & Advanced AI Concierge',
  panelDesc:
    'Click the button below to establish a private secure communication channel with staff.\n\n' +
    '🤖 **Context-Aware RAG Engine Active:** State your inquiry freely. Our ' +
    'AI remembers the conversation history and queries server docs for an immediate resolution!',
  welcomeTitle: '🔒 Context-Aware AI Ticket Active',
  welcomeDesc:
    'Welcome! Please state your question or issue description in detail.\n\n' +
    '🤖 Our semantic RAG engine will instantly convert your message into vector fields, ' +
    'query our database index, and generate an answer based on server documentation.',
  systemPrompt:
    "You are the premium Kyvo AI Smart Support Assistant for this Discord server.\n" +
    "Your mission is to answer the user's question accurately by referencing the Server Documentation Context provided below.\n" +
    "You must evaluate the short-term chat history to maintain conversation flow (pronouns, continuous topics).\n\n" +
    "Server Documentation Context:\n{context}\n\n" +
    "CRITICAL ROUTING INSTRUCTIONS:\n" +
    "If the user explicitly asks for human staff, manager, administrator, or support agents, OR if they ask a specific server question that completely fails to match any relevant server documentation context, you MUST output exactly 'TRIGGER_STAFF_ALERT' as your final response string.\n" +
    "DO NOT output 'TRIGGER_STAFF_ALERT' for casual greetings (e.g., 'hello', 'hi', 'hey', or foreign equivalents like '안녕'), polite gestures, or basic small talk. For greetings, simply respond warmly, acknowledge the user, and ask how you can assist them based on server guidelines.",
};

const KO: TicketAiDefaultSet = {
  panelTitle: '🎫 지원 포털 & AI 컨시어지',
  panelDesc:
    '아래 버튼을 누르면 스태프와 1:1로 대화할 수 있는 비공개 채널이 열려요.\n\n' +
    '🤖 **문맥을 이해하는 RAG 엔진 작동 중:** 궁금한 점을 편하게 말씀해주세요. ' +
    '대화 흐름을 기억하고 서버 문서를 참고해서 바로 답변해 드립니다!',
  welcomeTitle: '🔒 AI 상담 티켓이 열렸어요',
  welcomeDesc:
    '환영합니다! 문의하실 내용이나 겪고 계신 문제를 자세히 적어주세요.\n\n' +
    '🤖 AI가 메시지를 바로 분석해서 서버 문서를 검색하고, 그 내용을 바탕으로 답변을 생성해 드려요.',
  systemPrompt:
    "당신은 이 디스코드 서버의 프리미엄 Kyvo AI 스마트 지원 어시스턴트입니다.\n" +
    "아래 제공되는 서버 문서 컨텍스트를 참고해서 유저의 질문에 정확하게 답변하는 것이 당신의 임무입니다.\n" +
    "대화의 맥락(대명사, 이어지는 주제 등)을 유지할 수 있도록 최근 대화 기록도 함께 고려하세요.\n\n" +
    "서버 문서 컨텍스트:\n{context}\n\n" +
    "중요 라우팅 지침:\n" +
    "유저가 사람 스태프, 매니저, 관리자, 상담원을 명시적으로 요청하거나, 서버 문서 컨텍스트와 전혀 관련 없는 구체적인 질문을 한 경우에는 반드시 최종 응답으로 정확히 'TRIGGER_STAFF_ALERT'만 출력해야 합니다.\n" +
    "단순한 인사('hello', 'hi', 'hey', '안녕' 등)나 가벼운 잡담에는 'TRIGGER_STAFF_ALERT'를 출력하지 마세요. 인사에는 따뜻하고 반갑게 응답하고, 서버 안내에 따라 무엇을 도와드릴지 물어보세요.",
};

const TICKET_AI_DEFAULTS: Record<TicketAiDefaultsLang, TicketAiDefaultSet> = { en: EN, ko: KO };

export function getTicketAiDefaults(lang: TicketAiDefaultsLang): TicketAiDefaultSet {
  return TICKET_AI_DEFAULTS[lang] ?? TICKET_AI_DEFAULTS.en;
}
