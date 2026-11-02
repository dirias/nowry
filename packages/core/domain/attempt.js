/**
 * The attempt behind a grade (ADR-059 §1–2), in the clients' words.
 *
 * A grade used to travel alone: card, grade, mode. What the learner did on
 * the way to it (how long they thought, whether they flipped, what help they
 * reached for) was lost the moment the key was pressed. This module is the
 * one place that shape is named, so both clients send the same row and
 * neither spells an API field (ADR-031: a screen reads the reader's words).
 */

/** The marks a learner can earn on one card before grading (ADR-059 §2). */
export const emptyHelp = () => ({ companion: null, audio: 0, hint: false, source: false })

/** How the companion was asked, when it was. */
export const HELP_KINDS = Object.freeze({ chat: 'chat', hint: 'hint', explain: 'explain', example: 'example', mnemonic: 'mnemonic' })

/** A scheduled showing moves the schedule; a practice showing (ADR-057 §2) is recorded only. */
export const SHOWING = Object.freeze({ scheduled: 'scheduled', practice: 'practice' })

const clamp = (ms) => (Number.isFinite(ms) && ms >= 0 ? Math.min(Math.round(ms), 3600000) : null)

/**
 * Think time is shown → flipped; judge time is flipped → graded. A card graded
 * without a flip (a quiz answer, or a key pressed on the front) has think time
 * up to the grade and no judge time.
 *
 * @param {{ shownAt: number|null, flippedAt: number|null, gradedAt: number }} marks — epoch ms
 * @returns {{ thinkMs: number|null, judgeMs: number|null }}
 */
export function attemptTimings({ shownAt = null, flippedAt = null, gradedAt = Date.now() } = {}) {
  if (shownAt == null) return { thinkMs: null, judgeMs: null }
  if (flippedAt == null) return { thinkMs: clamp(gradedAt - shownAt), judgeMs: null }
  return { thinkMs: clamp(flippedAt - shownAt), judgeMs: clamp(gradedAt - flippedAt) }
}

/**
 * The body the review call carries. Everything is optional on the server, so
 * a field a client cannot know is simply absent.
 *
 * @param {{
 *   clientSessionId?: string|null, showing?: 'scheduled'|'practice', side?: 'front'|'back'|null,
 *   thinkMs?: number|null, judgeMs?: number|null, confidence?: 'sure'|'maybe'|'none'|null,
 *   chosenOption?: string|null, help?: ReturnType<typeof emptyHelp>, position?: number|null,
 *   total?: number|null, scope?: string|null, blockId?: string|null, localHour?: number|null,
 *   client?: 'web'|'phone'|null
 * }} attempt
 */
export function attemptPayload(attempt = {}) {
  const help = { ...emptyHelp(), ...(attempt.help ?? {}) }
  return {
    client_session_id: attempt.clientSessionId ?? null,
    showing: attempt.showing === SHOWING.practice ? SHOWING.practice : SHOWING.scheduled,
    side: attempt.side ?? null,
    think_ms: clamp(attempt.thinkMs),
    judge_ms: clamp(attempt.judgeMs),
    confidence: attempt.confidence ?? null,
    chosen_option: attempt.chosenOption ?? null,
    help: {
      companion: help.companion ?? null,
      audio: Math.max(0, Math.min(50, help.audio | 0)),
      hint: Boolean(help.hint),
      source: Boolean(help.source)
    },
    position: attempt.position ?? null,
    total: attempt.total ?? null,
    scope: attempt.scope ?? null,
    block_id: attempt.blockId ?? null,
    local_hour: attempt.localHour ?? new Date().getHours(),
    client: attempt.client ?? null
  }
}
