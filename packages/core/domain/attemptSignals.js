/**
 * Reading the attempts ledger the way a tutor would (ADR-059 §3).
 *
 * The rows say what happened; these functions say what it means, in words
 * both clients share: how fast an answer was against the learner's OWN median
 * for the deck, whether a miss was a lapse or still learning, whether help
 * was reached for, and which misses are one problem rather than many.
 *
 * Every reading here ends in something a screen can draw or press. Nothing
 * here compares a learner with anyone else.
 */

/** Speed × outcome. `null` when the row has no timing or the deck no median yet. */
export const SPEED = Object.freeze({
  fluent: 'fluent', // right and fast: what held
  misconception: 'misconception', // wrong and fast: confident about something untrue
  fragile: 'fragile', // right and slow: held by effort
  unlearned: 'unlearned' // wrong and slow: not yet encoded
})

/** What a grade meant for the card's life, read from the state before it. */
export const LAPSE = Object.freeze({
  fresh: 'new',
  learning: 'learning',
  lapse: 'lapse',
  relearning: 'relearning',
  mature: 'mature'
})

const FAST = 0.75
const SLOW = 1.5

/**
 * @param {{ evaluation: string, thinkMs: number|null }} attempt
 * @param {number|null} medianMs — the learner's own median think time for the deck
 */
export function speedClass(attempt, medianMs) {
  const think = attempt?.thinkMs
  if (think == null || !medianMs) return null
  const right = attempt.evaluation === 'correct'
  const wrong = attempt.evaluation === 'incorrect'
  if (think <= medianMs * FAST) {
    if (right) return SPEED.fluent
    if (wrong) return SPEED.misconception
    return null
  }
  if (think >= medianMs * SLOW) {
    if (right) return SPEED.fragile
    return SPEED.unlearned
  }
  return null
}

/**
 * @param {{ repetitions?: number, interval?: number, lapses?: number }} before
 * @param {string} evaluation
 */
export function lapseClass(before, evaluation) {
  const reps = before?.repetitions ?? 0
  if (reps === 0) return LAPSE.fresh
  if (reps <= 2) return LAPSE.learning
  const missed = evaluation !== 'correct'
  if (missed && (before?.interval ?? 0) >= 7) return LAPSE.lapse
  if (missed && (before?.lapses ?? 0) > 0) return LAPSE.relearning
  return LAPSE.mature
}

/** One row of the ledger, in the clients' words. */
export const attemptLine = (row) => ({
  id: row?.id ?? null,
  cardId: row?.card_id ?? null,
  title: row?.card_title ?? null,
  tags: row?.tags ?? [],
  grade: row?.grade ?? null,
  evaluation: row?.evaluation ?? 'incorrect',
  showing: row?.showing ?? 'scheduled',
  thinkMs: row?.think_ms ?? null,
  judgeMs: row?.judge_ms ?? null,
  helped: Boolean(row?.help?.companion || row?.help?.hint),
  audio: row?.help?.audio ?? 0,
  before: {
    interval: row?.before?.interval ?? 1,
    repetitions: row?.before?.repetitions ?? 0,
    lapses: row?.before?.lapses ?? 0
  },
  position: row?.position ?? null
})

/**
 * The signals on one attempt.
 * @returns {{ speed: string|null, lapse: string, helped: boolean, practice: boolean }}
 */
export function attemptSignals(line, medianMs) {
  return {
    speed: speedClass(line, medianMs),
    lapse: lapseClass(line.before, line.evaluation),
    helped: Boolean(line.helped),
    practice: line.showing === 'practice'
  }
}

const HAN = /\p{Script=Han}/u

/** The Han characters of a title, each once. */
const hanOf = (title) => Array.from(new Set(Array.from(title ?? '').filter((ch) => HAN.test(ch))))

/**
 * Which misses are one problem (ADR-059 §3): cards that share a character
 * (kanji, hanzi) first, then cards that share a tag, then the rest one by one.
 * A family needs at least two cards; the shared character becomes its label.
 *
 * @param {Array<{ cardId: string, title: string|null, tags?: string[] }>} misses
 * @returns {Array<{ kind: 'character'|'tag'|'single', label: string|null, cards: Array }>}
 */
export function missFamilies(misses) {
  const left = [...misses]
  const families = []

  const byChar = new Map()
  left.forEach((card) => hanOf(card.title).forEach((ch) => byChar.set(ch, (byChar.get(ch) ?? 0) + 1)))
  const chars = Array.from(byChar.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([ch]) => ch)
  for (const ch of chars) {
    const members = left.filter((card) => hanOf(card.title).includes(ch))
    if (members.length < 2) continue
    families.push({ kind: 'character', label: ch, cards: members })
    members.forEach((m) => left.splice(left.indexOf(m), 1))
  }

  const byTag = new Map()
  left.forEach((card) => (card.tags ?? []).forEach((tag) => byTag.set(tag, (byTag.get(tag) ?? 0) + 1)))
  const tags = Array.from(byTag.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
  for (const tag of tags) {
    const members = left.filter((card) => (card.tags ?? []).includes(tag))
    if (members.length < 2) continue
    families.push({ kind: 'tag', label: tag, cards: members })
    members.forEach((m) => left.splice(left.indexOf(m), 1))
  }

  left.forEach((card) => families.push({ kind: 'single', label: null, cards: [card] }))
  return families
}

/** How long before a return reads as "away" rather than "a gap". */
export const BREAK_DAYS = 14
/** A family worth asking about by itself. */
export const ASK_FAMILY_MIN = 3

/**
 * The whole reading of one finished session: a sentence, what slipped grouped,
 * what held folded, and the moves. Built from the ledger when the session has
 * rows; from the session's own cards when it was logged before the ledger.
 *
 * @param {{ session: object, attempts?: object[]|null, medianThinkMs?: number|null, daysSincePrevious?: number|null }} input
 */
export function sessionBreakdown({ session, attempts = null, medianThinkMs = null, daysSincePrevious = null }) {
  const rows = (attempts ?? []).map(attemptLine).filter((line) => line.showing !== 'practice')
  const fromLedger = rows.length > 0
  const lines = fromLedger
    ? rows.map((line) => ({ ...line, signals: attemptSignals(line, medianThinkMs) }))
    : (session?.cards ?? []).map((card) => ({
        cardId: card?.card_id ?? null,
        title: card?.card_title ?? card?.question_text ?? null,
        tags: [],
        grade: card?.grade ?? null,
        evaluation: card?.evaluation ?? 'incorrect',
        helped: false,
        signals: { speed: null, lapse: null, helped: false, practice: false }
      }))

  const misses = lines.filter((line) => line.evaluation !== 'correct')
  const held = lines.filter((line) => line.evaluation === 'correct')
  const families = missFamilies(misses)
  const named = families.filter((f) => f.kind !== 'single')
  const total = lines.length

  let reading
  if (total === 0) reading = null
  else if (daysSincePrevious != null && daysSincePrevious >= BREAK_DAYS)
    reading = { key: 'sessions.reading.afterBreak', params: { days: daysSincePrevious, held: held.length, total } }
  else if (misses.length === 0) reading = { key: 'sessions.reading.allHeld', params: { count: total } }
  else if (named.length > 0) reading = { key: 'sessions.reading.families', params: { held: held.length, total, count: named.length } }
  else reading = { key: 'sessions.reading.plain', params: { held: held.length, total, missed: misses.length } }

  const moves = []
  if (misses.length > 0) moves.push({ kind: 'drill', cardIds: misses.map((m) => m.cardId).filter(Boolean) })
  const biggest = named.find((f) => f.kind === 'character' && f.cards.length >= ASK_FAMILY_MIN)
  if (biggest)
    moves.push({
      kind: 'askFamily',
      label: biggest.label,
      cardIds: biggest.cards.map((c) => c.cardId),
      titles: biggest.cards.map((c) => c.title)
    })

  return {
    fromLedger,
    reading,
    slipped: families,
    slippedCount: misses.length,
    held: {
      count: held.length,
      fluent: held.filter((l) => l.signals.speed === SPEED.fluent).length,
      fragile: held.filter((l) => l.signals.speed === SPEED.fragile).length,
      cards: held
    },
    moves
  }
}

/** A family's own signal: the one most of its cards share, else none. */
export function familySignal(family) {
  const counts = new Map()
  family.cards.forEach((card) => {
    const s = card.signals?.speed
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1)
  })
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] * 2 < family.cards.length) return null
  return top[0]
}
