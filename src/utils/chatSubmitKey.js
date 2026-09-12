/**
 * Does this keystroke send the message? (PEND-002)
 *
 * The pet chat used to leave Enter alone — "send is button-only" — which is
 * the wrong default for a chat: every chat the user already has open sends on
 * Enter and breaks a line on Shift+Enter. Slack, Discord, ChatGPT, Messages.
 *
 * It is a function rather than four lines inside a 1,900-line component
 * because the two exceptions are the whole difficulty, and both are invisible
 * until someone hits them:
 *
 * - **A touch keyboard has no Shift+Enter.** Its return key is expected to
 *   make a new line, so on a coarse pointer the old behaviour stands and the
 *   send button remains the way to send.
 * - **An IME is mid-word.** Enter commits a candidate in Japanese, Chinese and
 *   Korean input. Sending there posts half a word, and it is the single most
 *   common way this change goes wrong. Browsers signal it three ways depending
 *   on age and engine — `isComposing` on the event, on the native event, or
 *   the legacy `keyCode: 229` — so all three are read.
 *
 * The caller supplies `coarsePointer` rather than this file reading
 * `matchMedia` itself, so the rule is testable without a browser and a tablet
 * that gains a keyboard mid-session gets the right answer at keypress time.
 */
export function shouldSendOnKey(event, { coarsePointer = false } = {}) {
  if (!event || event.key !== 'Enter') return false
  // Shift+Enter is always a newline, on every pointer.
  if (event.shiftKey) return false
  if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return false
  if (coarsePointer) return false
  return true
}

/** Whether the primary pointer is a finger. Safe where `matchMedia` is absent. */
export function hasCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return Boolean(window.matchMedia('(pointer: coarse)').matches)
}

export default shouldSendOnKey
