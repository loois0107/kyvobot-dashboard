// Dashboard-side mirror of the bot's hardcoded ticket AI fallback text
// (kyvobot/cogs/ticket_ai.py). These are what the bot actually uses whenever a guild has no row
// in guild_ticket_settings (or a specific field is empty) - used both as the page's initial
// useState values (so a never-configured guild shows what the bot would really send, not an
// unrelated placeholder) and as the source for the "reset to bot default" button.
//
// Two fields can't be copied verbatim from the Python source:
// - The system prompt splices `retrieved_context` in via an f-string at a fixed spot, with no
//   {context} token. Saving that text as-is would fail the dashboard's "must contain {context}"
//   guard. DEFAULT_SYSTEM_PROMPT below replaces that splice point with a literal {context} token -
//   cogs/ticket_ai.py's custom-prompt path does base_prompt.replace("{context}", retrieved_context),
//   so saving this constant unmodified produces the exact same final prompt the bot's hardcoded
//   fallback would have produced.
// - The welcome embed's default description opens with `f"Welcome, {user.mention}."`, a per-ticket
//   Discord mention the bot has no dashboard-side templating hook for (a custom welcome_desc is
//   used byte-for-byte, no token substitution). DEFAULT_WELCOME_DESC drops that greeting instead of
//   inventing a token the bot doesn't support - resetting-and-saving is intentionally not 100%
//   identical to the bot's untouched fallback in this one respect.

export const DEFAULT_PANEL_TITLE = '🎫 Support Portal & Advanced AI Concierge';

export const DEFAULT_PANEL_DESC =
  'Click the button below to establish a private secure communication channel with staff.\n\n' +
  '🤖 **Context-Aware RAG Engine Active:** State your inquiry freely. Our ' +
  'AI remembers the conversation history and queries server docs for an immediate resolution!';

export const DEFAULT_WELCOME_TITLE = '🔒 Context-Aware AI Ticket Active';

export const DEFAULT_WELCOME_DESC =
  'Welcome! Please state your question or issue description in detail.\n\n' +
  '🤖 Our semantic RAG engine will instantly convert your message into vector fields, ' +
  'query our database index, and generate an answer based on server documentation.';

export const DEFAULT_SYSTEM_PROMPT =
  "You are the premium Kyvo AI Smart Support Assistant for this Discord server.\n" +
  "Your mission is to answer the user's question accurately by referencing the Server Documentation Context provided below.\n" +
  "You must evaluate the short-term chat history to maintain conversation flow (pronouns, continuous topics).\n\n" +
  "Server Documentation Context:\n{context}\n\n" +
  "CRITICAL ROUTING INSTRUCTIONS:\n" +
  "If the user explicitly asks for human staff, manager, administrator, or support agents, OR if they ask a specific server question that completely fails to match any relevant server documentation context, you MUST output exactly 'TRIGGER_STAFF_ALERT' as your final response string.\n" +
  "DO NOT output 'TRIGGER_STAFF_ALERT' for casual greetings (e.g., 'hello', 'hi', 'hey', or foreign equivalents like '안녕'), polite gestures, or basic small talk. For greetings, simply respond warmly, acknowledge the user, and ask how you can assist them based on server guidelines.";
