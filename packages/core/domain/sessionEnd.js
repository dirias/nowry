/**
 * The ending of a session, as one model for both clients (ADR-060 §1).
 *
 * A session used to end on a count and a cheer: "You've reviewed 4 cards.
 * Great job!" after a perfect run and after a 50% alike. The reading already
 * existed in History (ADR-059) and sat one tap away at the one moment the
 * learner was reflecting. This builds the ending from the device's own grades
 * the instant the last card is graded, then takes the ledger's rows when they
 * answer, so the summary never has a sentence the breakdown lacks.
 *
 * Nothing here draws. The clients draw the same rows (§15.10) at one width or
 * two; this decides what the rows say and which keys the reading has earned.
 */
import { sessionBreakdown } from './attemptSignals'

/** The endings there are. The same object, in a different state (ADR-060 §5). */
export const END_STATE = Object.freeze({
  nothing: 'nothing', // all caught up: nothing was graded
  drill: 'drill', // practice over named cards; moves nothing, earns nothing
  perfect: 'perfect', // every card held
  ordinary: 'ordinary' // something slipped
})

/** What a key does. The label is each client's, from the kind and its count. */
export const END_KEY = Object.freeze({
  drill: 'drill', // the slipped cards again, as practice
  dueToday: 'dueToday', // the daily review, for what is still due
  study: 'study' // the Study Center
})

/** Families shown before "Show all" on a phone (Board 4). */
export const FAMILY_CAP = 3

/**
 * The score's colour role, one threshold for every screen that colours a
 * score. The two clients disagreed by five points for a year without anyone
 * noticing, which is the argument for owning it here.
 */
export const scoreRole = (pct) => {
  if (pct == null) return 'neutral'
  if (pct >= 80) return 'success'
  if (pct >= 55) return 'warning'
  return 'danger'
}

/**
 * One answer per card: a re-grade replaces the earlier answer in place rather
 * than counting the card twice. The phone keeps its answers keyed already; the
 * web appends, and its old summary counted the cards rather than the grades
 * to hide that. Here the rule is the model's, so both read the same session.
 */
export const latestAnswers = (answers) => {
  const byCard = new Map()
  answers.forEach((answer, index) => byCard.set(answer.cardId ?? `#${index}`, answer))
  return Array.from(byCard.values())
}

/** The device's answers in the shape the breakdown's ledger-less branch reads. */
const recordOf = (answers) => ({
  cards: answers.map((answer) => ({
    card_id: answer.cardId ?? null,
    card_title: answer.cardTitle ?? null,
    grade: answer.grade ?? null,
    evaluation: answer.evaluation ?? 'incorrect'
  }))
})

const minutesBetween = (startedAt, endedAt) => {
  const start = startedAt ? new Date(startedAt).getTime() : NaN
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1
  return Math.max(1, Math.round((end - start) / 60000))
}

/**
 * The state line: what the session earned, as readouts (§15.10, "state is a
 * line of copy, not a hue"). The grants are the XP replies the clients already
 * receive and used to throw away; the streak is the statistics summary's.
 */
const stateReadouts = ({ grants, streak }) => {
  const readouts = []
  if (Number.isFinite(streak) && streak > 0) readouts.push({ key: 'sessions.end.streakDay', params: { days: streak } })
  else readouts.push({ key: 'sessions.end.startStreak' })

  const replies = (grants ?? []).filter(Boolean)
  const earned = replies.reduce((sum, reply) => sum + (Number(reply.xp_awarded) || 0), 0)
  if (earned > 0) readouts.push({ key: 'sessions.end.xpEarned', params: { xp: earned } })

  const furthest = replies.reduce(
    (best, reply) => (Number.isFinite(reply.xp_for_next_level) && (!best || reply.new_level >= best.new_level) ? reply : best),
    null
  )
  if (furthest) {
    readouts.push({ key: 'sessions.end.toLevel', params: { xp: furthest.xp_for_next_level, level: (Number(furthest.new_level) || 0) + 1 } })
  }
  return readouts
}

/** The two doors, by state (Board 3). `dueLeft` unknown reads as nothing left. */
const keysFor = ({ state, drillIds, dueLeft }) => {
  const onward = dueLeft > 0 ? { kind: END_KEY.dueToday, count: dueLeft } : { kind: END_KEY.study, done: false }
  switch (state) {
    case END_STATE.nothing:
      return { primary: onward, secondary: null }
    case END_STATE.drill:
      return drillIds.length > 0
        ? { primary: { kind: END_KEY.drill, cardIds: drillIds }, secondary: { kind: END_KEY.study, done: false } }
        : { primary: { kind: END_KEY.study, done: false }, secondary: null }
    case END_STATE.perfect:
      return { primary: dueLeft > 0 ? onward : { kind: END_KEY.study, done: true }, secondary: null }
    default:
      return { primary: { kind: END_KEY.drill, cardIds: drillIds }, secondary: onward }
  }
}

/** Tomorrow's line, against today's session: lighter when fewer are due than were studied. */
const tomorrowLine = ({ dueTomorrow, cards }) => {
  if (!Number.isFinite(dueTomorrow)) return null
  if (dueTomorrow === 0) return { key: 'sessions.end.tomorrowNone' }
  if (cards > 0 && dueTomorrow < cards) return { key: 'sessions.end.tomorrowLighter', params: { count: dueTomorrow } }
  return { key: 'sessions.end.tomorrow', params: { count: dueTomorrow } }
}

/**
 * @param {Object} input
 * @param {Array<{cardId: string, cardTitle: string|null, grade: string, evaluation: string}>} input.answers
 *   One per card graded, as the log endpoint takes them.
 * @param {'deck'|'daily'|'drill'} [input.kind]
 * @param {string|null} [input.deckName] The deck's name, when the session has one deck.
 * @param {number|null} [input.deckCount] Decks drawn from, for a review across decks.
 * @param {Date|string|number|null} [input.startedAt]
 * @param {Date|string|number|null} [input.endedAt]
 * @param {Array|null} [input.attempts] The ledger's rows, when they have answered.
 * @param {number|null} [input.medianThinkMs]
 * @param {number|null} [input.daysSincePrevious]
 * @param {Array|null} [input.grants] The XP replies (session and streak).
 * @param {number|null} [input.streak] Today's streak from the statistics summary.
 * @param {number|null} [input.dueLeft] Cards still due today after this session.
 * @param {number|null} [input.dueTomorrow] Cards due tomorrow, from the forecast.
 */
export function sessionEnd({
  answers = [],
  kind = 'deck',
  deckName = null,
  deckCount = null,
  startedAt = null,
  endedAt = null,
  attempts = null,
  medianThinkMs = null,
  daysSincePrevious = null,
  grants = null,
  streak = null,
  dueLeft = null,
  dueTomorrow = null
} = {}) {
  const graded = latestAnswers(answers)
  const cards = graded.length
  const breakdown = sessionBreakdown({ session: recordOf(graded), attempts, medianThinkMs, daysSincePrevious })
  const held = cards > 0 ? breakdown.held.count : 0
  const drillIds = breakdown.moves.find((move) => move.kind === 'drill')?.cardIds ?? []

  let state
  if (cards === 0) state = END_STATE.nothing
  else if (kind === 'drill') state = END_STATE.drill
  else if (breakdown.slippedCount === 0) state = END_STATE.perfect
  else state = END_STATE.ordinary

  const score = cards > 0 ? Math.round((held / cards) * 100) : null

  let reading = breakdown.reading
  if (state === END_STATE.nothing) reading = { key: kind === 'daily' ? 'sessions.end.nothingDaily' : 'sessions.end.nothing' }

  return {
    state,
    kind,
    title: { text: deckName || null, deckCount: deckName ? null : deckCount },
    cards,
    minutes: cards > 0 ? minutesBetween(startedAt, endedAt) : 0,
    score,
    scoreRole: scoreRole(score),
    // A drill earns nothing (ADR-059 §4), so it has no state line to show.
    readouts: state === END_STATE.ordinary || state === END_STATE.perfect ? stateReadouts({ grants, streak }) : [],
    reading,
    note: state === END_STATE.drill ? { key: 'sessions.end.drillNote' } : null,
    fromLedger: breakdown.fromLedger,
    slipped: breakdown.slipped,
    slippedCount: breakdown.slippedCount,
    held: breakdown.held,
    askFamily: breakdown.moves.find((move) => move.kind === 'askFamily') ?? null,
    keys: keysFor({ state, drillIds, dueLeft }),
    tomorrow: state === END_STATE.drill ? null : tomorrowLine({ dueTomorrow, cards })
  }
}

/**
 * The ending's name, on either client. The deck's, or the review-across-decks
 * line, or the fallback (ADR-058 §1); a drill is named after what it drills.
 */
export const sessionEndTitle = (t, end) => {
  const base = end.title.text
    ? end.title.text
    : end.title.deckCount > 0
      ? t('sessions.dailyReview', { count: end.title.deckCount })
      : t('sessions.unknownTopic')
  return end.kind === 'drill' ? t('sessions.end.drillTitle', { name: base }) : base
}

/** A key's label, from what it does and how many it does it to. */
export const endKeyLabel = (t, key) => {
  if (!key) return null
  if (key.kind === END_KEY.drill) return t('sessions.breakdown.drill', { count: key.cardIds.length })
  if (key.kind === END_KEY.dueToday) return t('sessions.end.dueToday', { count: key.count })
  return t(key.done ? 'sessions.end.done' : 'sessions.end.study')
}

export default sessionEnd
