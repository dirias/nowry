/**
 * When the companion may speak unasked (MOB-088, `docs/prd-mobile-agent.md`).
 *
 * The companion's proactive messages are the one part of it that can be
 * unwelcome: they arrive without being asked for, in the middle of something.
 * So there are four settings governing them, and until now the whole of that
 * governance lived inside `AgentContext.queueIntervention` — a provider the
 * phone deliberately does not mount (D10). A second client that shipped
 * interventions without it would honour none of the four, and a learner who
 * turned wrong-answer nudges off on the web would get them on their phone.
 * That is not a bug you find by reading the phone's code.
 *
 * This is that governance as data and pure functions. The provider now asks
 * these instead of holding its own copy, so there is one answer to "may it
 * speak" and both clients get it.
 *
 * **The four gates, and the reason each exists.**
 *
 *   1. The TYPE is switched off. Five kinds of message, five switches, each
 *      independent — turning off the one that interrupts a session says
 *      nothing about the one that sums it up.
 *   2. FOCUS MODE is on and this type interrupts a session. Only in-session
 *      types are blocked: a summary after the last card is not an interruption.
 *   3. The session's CAP is spent. Frequency is not a rate, it is a count per
 *      session — a learner should be able to predict the most it will say.
 *   4. The SILENT WINDOW after a dismissal has not passed. Dismissing is the
 *      clearest signal there is, and it applies to `wrong_answer` alone: the
 *      messages you dismiss during a session are the ones that arrive during
 *      one.
 *
 * Nothing here talks to a server, holds state or knows about React. The caller
 * owns the count and the timestamp, because those live wherever a session does.
 */

/** How many proactive messages one session may carry, by frequency setting. */
export const INTERVENTION_CAPS = { conservative: 1, balanced: 2, frequent: 4 }

/** How long a dismissal silences the companion, by frequency setting, in ms. */
export const SILENCE_MS = { conservative: 1200000, balanced: 600000, frequent: 180000 }

/** The types that arrive while a session is running, which focus mode blocks. */
export const IN_SESSION_TYPES = ['wrong_answer']

/** The type a dismissal silences. Dismissing a summary silences nothing. */
export const SILENCED_TYPES = ['wrong_answer']

const DEFAULT_FREQUENCY = 'balanced'

/** Every switch, defaulted to on — the server omits what has never been set. */
const DEFAULT_TYPES = {
  wrong_answer: true,
  session_summary: true,
  pre_session: true,
  re_engagement: true,
  streak_milestone: true
}

/**
 * The four settings, read out of the `/agent/me` payload.
 *
 * The whole payload is snake_case and this is the only place outside the
 * provider's reducer that knows it, for the reason `usePetState` gives: a
 * screen reading `agent_focus_mode` for itself is how a client ends up
 * honouring a setting it has misspelled.
 *
 * @param {object|null} me
 * @returns {{frequency: string, focusMode: boolean, types: object}}
 */
export function interventionSettings(me) {
  return {
    frequency: me?.agent_intervention_frequency ?? DEFAULT_FREQUENCY,
    focusMode: me?.agent_focus_mode ?? false,
    types: {
      wrong_answer: me?.agent_intervention_wrong_answer ?? true,
      session_summary: me?.agent_intervention_session_summary ?? true,
      pre_session: me?.agent_intervention_pre_session ?? true,
      re_engagement: me?.agent_intervention_re_engagement ?? true,
      streak_milestone: me?.agent_intervention_streak_milestone ?? true
    }
  }
}

/** The cap for a frequency, including one the server has never heard of. */
export const interventionCap = (frequency) => INTERVENTION_CAPS[frequency] ?? INTERVENTION_CAPS[DEFAULT_FREQUENCY]

/**
 * When the companion may speak again after a dismissal.
 * @param {string} frequency
 * @param {number} [now]
 */
export const silenceUntil = (frequency, now = Date.now()) => now + (SILENCE_MS[frequency] ?? SILENCE_MS[DEFAULT_FREQUENCY])

/**
 * May the companion send this one?
 *
 * @param {string} type - `wrong_answer`, `session_summary`, …
 * @param {object} where
 * @param {object} [where.settings] - from `interventionSettings`; absent means every default
 * @param {number} [where.count] - proactive messages already sent THIS session
 * @param {number|null} [where.silentUntil] - ms timestamp, or null
 * @param {boolean} [where.inSession] - whether a study session is running
 * @param {number} [where.now]
 * @returns {boolean}
 */
export function allowIntervention(type, { settings = null, count = 0, silentUntil = null, inSession = false, now = Date.now() } = {}) {
  if (!type) return false

  const frequency = settings?.frequency ?? DEFAULT_FREQUENCY
  const types = settings?.types ?? DEFAULT_TYPES

  // 1 — the type's own switch. An unknown type has no switch and is allowed;
  // the server is the authority on what types exist.
  if (type in types && !types[type]) return false

  // 2 — focus mode, for the types that interrupt.
  if (settings?.focusMode && inSession && IN_SESSION_TYPES.includes(type)) return false

  // 3 — the session's budget.
  if (count >= interventionCap(frequency)) return false

  // 4 — the window after a dismissal.
  if (SILENCED_TYPES.includes(type) && silentUntil && now < silentUntil) return false

  return true
}

/**
 * The `wrong_answer` event, built from the card that was missed.
 *
 * A builder rather than a literal at each call site, for the reason
 * `screenContext` records: the payload has already been wrong once in a way
 * nothing caught, and two clients writing their own is how it happens again.
 * The field names are the server's.
 *
 * @param {object} card
 * @param {{index?: number, total?: number}} where - `index` is ZERO-based as a
 *   list is; the payload's `session_card_index` is one-based as a person counts.
 */
export function wrongAnswerEvent(card, { index = 0, total = 0, deckName = null } = {}) {
  if (!card) return null
  return {
    type: 'wrong_answer',
    card_id: card._id || card.id,
    /*
     * The deck's NAME, which the server used to substitute with the words
     * "this deck" — and a model told the deck is called "this deck" writes
     * "The deck this deck" (MOB-099). Omitted rather than faked when the
     * caller has none: the server says "Unknown" and its own rules forbid
     * inventing one.
     */
    deck_name: deckName || null,
    card_front: card.title || card.front || '',
    card_back: card.content || card.back || '',
    card_notes: card.notes || null,
    card_type: card.card_type || 'basic',
    session_card_index: index + 1,
    session_total_cards: total
  }
}

/**
 * The `session_summary` event.
 *
 * @param {{total?: number, wrong?: number, cardId?: string|null, front?: string|null}} session
 */
export function sessionSummaryEvent({ total = 0, wrong = 0, cardId = null, front = null, deckName = null } = {}) {
  return {
    type: 'session_summary',
    deck_name: deckName || null,
    session_total_cards: total,
    session_wrong_count: wrong,
    most_missed_card_id: cardId,
    most_missed_card_front: front
  }
}

export default allowIntervention
