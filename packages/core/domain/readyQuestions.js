/**
 * The ready questions a chat offers for its subject (CHAT-005, ADR-055 §4).
 *
 * A blank field asks the learner to do the hardest part — form a question —
 * at the moment they know least. These are the questions instead: a fixed,
 * reviewed set of study moves, chosen per subject by its field, what the card
 * asks of the learner, which side is showing and how it was last graded. The
 * model never writes them, so none can give a hidden answer away and every
 * label is reviewed in every language.
 *
 * Each move is an id; its label is `agent.ready.<id>`. What is sent is the
 * label with the subject named (`agent.ready.send`), so the server's memory
 * and the model both see which card the question is about.
 */

/** The fields a deck can be (CHAT-009); `general` is the fallback. */
export const FIELDS = ['language', 'math', 'science', 'certification', 'concept', 'general']

/** Moves per field: `front` before the answer is shown, `back` after. */
const SETS = {
  language: {
    front: ['hint', 'inSentence', 'breakDown'],
    back: ['examples', 'hook', 'similar', 'check']
  },
  math: {
    front: ['whichRule', 'solvedSimilar', 'whereSlip'],
    back: ['stepByStep', 'oneToTry', 'whyRuleWorks']
  },
  science: {
    front: ['hint', 'whatHelps'],
    back: ['explainSimply', 'misconception', 'realWorld']
  },
  certification: {
    front: ['whatAsking', 'ruleOutOne'],
    back: ['whyCorrect', 'whyNot', 'examTrap', 'similarScenario']
  },
  concept: {
    front: ['hint'],
    back: ['checkExplanation', 'giveCase', 'connects']
  },
  general: {
    front: ['hint'],
    back: ['explainSimply', 'giveExample', 'connects']
  }
}

/** After Again, the card keeps slipping: the questions are about the miss. */
const AFTER_AGAIN = ['whyMissing', 'hook', 'similar']

/** Moves that need the back to be showing; never offered on the front. */
const NEEDS_BACK = new Set([
  'examples',
  'similar',
  'check',
  'stepByStep',
  'whyRuleWorks',
  'whyCorrect',
  'whyNot',
  'examTrap',
  'checkExplanation'
])

/** Moves that open the composer for the learner's own words (CHAT-007). */
export const COMPOSE_MOVES = new Set(['check', 'checkExplanation'])

const HAN = /[\u3400-\u9fff]/

/**
 * The field a card subject is in: the deck's (CHAT-009), else a language when
 * the card has one, else a multiple-choice card is an exam question.
 */
export function subjectField(subject) {
  if (subject?.field && FIELDS.includes(subject.field)) return subject.field
  if (subject?.language) return 'language'
  if (subject?.cardType === 'quiz') return 'certification'
  return 'general'
}

/** The moves for a card subject, in order, before any have been used. */
function movesFor(subject) {
  const field = subjectField(subject)
  const flipped = Boolean(subject?.isFlipped)
  if (flipped && subject?.lastGrade === 'again') return AFTER_AGAIN
  const set = SETS[field][flipped ? 'back' : 'front']
  return set.filter((id) => flipped || !NEEDS_BACK.has(id)).filter((id) => id !== 'breakDown' || HAN.test(String(subject?.front ?? '')))
}

/**
 * The questions to offer: three on an empty chat, two follow-ups after.
 *
 * @param {object|null} subject — the chat's context (a `studyCardContext`).
 * @param {{used?: string[]}} [state] — moves already sent in this chat.
 * @returns {Array<{id: string, labelKey: string, compose: boolean}>}
 */
export function readyQuestions(subject, { used = [] } = {}) {
  if (!subject || subject.page !== 'study_session') return []
  const fresh = movesFor(subject).filter((id) => !used.includes(id))
  return fresh.slice(0, used.length > 0 ? 2 : 3).map((id) => ({ id, labelKey: `agent.ready.${id}`, compose: COMPOSE_MOVES.has(id) }))
}

/**
 * The words sent for a move: its label, with the subject named.
 *
 * @param {(key: string, params?: object) => string} t
 */
export function readyMessage(t, question, subject) {
  const label = t(question.labelKey)
  const name = subject?.front ? String(subject.front).slice(0, 80) : ''
  return name ? t('agent.ready.send', { question: label, subject: name }) : label
}

export default readyQuestions
