/**
 * The companion's side of a conversation, read by name (MOB-085).
 *
 * `GET /agent/me` and `POST /agent/chat` both report the month's message
 * budget, and the chat reply carries the same level-up block the XP grants do.
 * The names are the server's and they are named once, here — a screen reading
 * `messagesUsed` for itself gets `undefined`, and an undefined budget is an
 * unlimited one to every `>=` that reads it.
 *
 * **A limit of -1 means unlimited**, which is the plan table's own convention
 * for Plus and Pro. Treating it as a number is how "you have used 50 of -1
 * messages" reaches a screen.
 */

import { isOfflineError } from '../utils/formUtils'

/** The month's budget, or `null` when this account has no limit. */
export function messageBudget(payload) {
  const limit = Number(payload?.messages_limit)
  const used = Number(payload?.messages_used)
  if (!Number.isFinite(limit) || limit < 0) return null
  return { used: Number.isFinite(used) ? used : 0, limit }
}

/** Whether this account may send another message. Unlimited always may. */
export function canSend(payload) {
  const budget = messageBudget(payload)
  return budget === null || budget.used < budget.limit
}

/** The reply text, or `''` — never `undefined`, which renders as nothing twice. */
export const replyText = (response) => (typeof response?.reply === 'string' ? response.reply : '')

/**
 * The turns to send as history, oldest first, capped.
 *
 * The server takes `{role, content}` with roles `user` and `model` — NOT
 * `assistant`, which is the name every other chat API uses and the one a
 * reader will assume. A wrong role is not rejected; it is absorbed, and the
 * model simply stops being able to tell who said what.
 */
export const HISTORY_TURNS = 20

export function chatHistory(messages = [], limit = HISTORY_TURNS) {
  return messages
    .filter((message) => message && typeof message.text === 'string' && message.text.length > 0)
    .slice(-limit)
    .map((message) => ({ role: message.from === 'user' ? 'user' : 'model', content: message.text }))
}

/**
 * A model reply as plain text (MOB-085).
 *
 * The companion answers in markdown — the web renders it with `PetMarkdown`,
 * which is a web component and cannot cross. Sending the string through
 * unchanged put `**最前（ずいぶん）に立つ。**` on a phone screen, asterisks and
 * all: the syntax rendered instead of the emphasis it stands for.
 *
 * So the markers are removed rather than drawn. Emphasis is the one thing a
 * chat reply loses by this and it is the cheapest thing to lose; a bullet keeps
 * its shape as a real bullet, because a list that collapses into a paragraph
 * loses information rather than decoration.
 *
 * Deliberately conservative. `*` only unwraps when it actually wraps something,
 * so a lone asterisk in a formula survives, and nothing here touches a
 * character that is not a marker.
 */
export function plainReply(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '• ')
    .replace(/\*\*([^\n*]+)\*\*/g, '$1')
    .replace(/__([^\n_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^\n*]+)\*(?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/(^|[\s(])_([^\n_]+)_(?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * The sentence for a chat send that failed, as an i18n key (ADR-054, AI-005).
 *
 * Both clients used to say one thing for every failure — the phone "did not go
 * through", the web the server's English `detail` — so a learner retried a
 * message the AI could not answer for hours, and was told nothing when the
 * month was spent. The server says which failure it was; this reads it.
 *
 * Never the server's `detail` itself: it is a code, not a sentence, and it is
 * not in the learner's language.
 */
export function chatFailureKey(error) {
  if (isOfflineError(error)) return 'errors.offline'
  const status = error?.response?.status
  const detail = error?.response?.data?.detail
  if (status === 503 && detail === 'ai_unavailable') return 'agent.chat.unavailable'
  if (status === 429 && detail === 'message_limit_reached') return 'agent.chat.budgetSpent'
  // Any other 429 is the per-minute limit, which a moment's wait clears.
  if (status === 429) return 'agent.chat.busy'
  return 'agent.chat.failed'
}

/**
 * A reply as blocks: prose, and example sentences the screen draws as rows
 * (CHAT-004, ADR-055 §5).
 *
 * The companion writes each example on its own line as
 * `[[EX|sentence|reading|translation]]`, the reading empty when the language
 * needs none. A row can be heard and kept as a card; a sentence buried in a
 * bullet with its romaji and translation on the same line could be neither,
 * and the phone stripped its markdown into one dense run.
 *
 * Tolerant on purpose: a list marker before the tag is dropped, a tag with no
 * sentence stays prose, and a reply with no tags is one text block.
 *
 * @returns {Array<{type: 'text', text: string} | {type: 'example', sentence: string, reading: string, translation: string}>}
 */
export function parseReply(text) {
  if (typeof text !== 'string' || !text) return []
  const blocks = []
  let prose = []
  const flush = () => {
    const joined = prose.join('\n').trim()
    if (joined) blocks.push({ type: 'text', text: joined })
    prose = []
  }
  for (const line of text.split('\n')) {
    const match = EXAMPLE_LINE.exec(line)
    const sentence = match?.[1]?.trim()
    if (!sentence) {
      prose.push(line)
      continue
    }
    flush()
    blocks.push({ type: 'example', sentence, reading: (match[2] ?? '').trim(), translation: (match[3] ?? '').trim() })
  }
  flush()
  return blocks
}

/** One example tag on a line of its own, after an optional list marker. */
const EXAMPLE_LINE = /^\s*(?:[-*•]|\d+[.)])?\s*\[\[EX\|([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]\s*$/
