/**
 * What the chat is being asked ABOUT, handed from one screen to the next
 * (MOB-086).
 *
 * The study session knows the card; the chat screen is a route away. The web
 * solves this with `AgentProvider.setViewContext`, and mounting that provider
 * on a phone would run the quiz, avatar generation and a nudge fetch in order
 * to pass one object (MOB-085 D10).
 *
 * A route param is the other obvious answer and is worse: the payload carries
 * the card's front and its answer, and putting a learner's card text into a URL
 * is both a size limit and a thing that ends up in a log.
 *
 * So: one object, set by the screen that has it and TAKEN by the screen that
 * needs it. Taking clears it, which is the whole point — a context belongs to
 * the opening of the chat it was set for, and a later ungrounded open must not
 * inherit the card someone was looking at ten minutes ago.
 *
 * **It also carries the way back** (MOB-087). The chat is a sibling route in
 * the tab group, so leaving it pops the TAB navigator rather than the screen
 * that opened it: asking about a card and closing the chat landed on Home.
 * Nothing was lost — the session stores its progress — but being returned to
 * the wrong screen reads as being thrown out of the one you were in. The opener
 * says where it wants to be put back, and the chat puts it there.
 */
let pending = null

/**
 * The opener, before it pushes the chat.
 *
 * @param {object|null} context - what the chat is being asked about.
 * @param {string|null} from - the href to return to when the chat closes.
 */
export function setAskContext(context, from = null) {
  pending = context || from ? { context: context ?? null, from: from ?? null } : null
}

/**
 * The chat, once. `{context, from}`, both possibly null, and cleared either
 * way.
 */
export function takeAskContext() {
  const taken = pending
  pending = null
  return taken ?? { context: null, from: null }
}

/** For tests, and for a sign-out that must not leave a card behind. */
export function clearAskContext() {
  pending = null
}
