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
 */
let pending = null

/** The session, before it pushes the chat. */
export function setAskContext(context) {
  pending = context ?? null
}

/** The chat, once. Returns `null` when nothing was set, and clears either way. */
export function takeAskContext() {
  const context = pending
  pending = null
  return context
}

/** For tests, and for a sign-out that must not leave a card behind. */
export function clearAskContext() {
  pending = null
}
