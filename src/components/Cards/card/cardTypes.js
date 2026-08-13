import { extractDeckId, parseTagInput } from '../../Common/Form/formUtils'

/**
 * The three card variants, declared once.
 *
 * Everything that differed between FlashcardModal, QuizCardModal and
 * VisualCardModal — the header title, the required rule, the disclosure
 * groups, the payload — is data here rather than a third copy of the same
 * component. `CreateCardModal` reads a spec and renders the matching body;
 * `useCardForm` reads the same spec and validates and persists from it.
 *
 * Variants B, C and D are genuinely different shapes (UX-CONTRACT §3), so the
 * *bodies* stay separate components. Only the parts that are the same shape in
 * all three collapse into this table.
 */

const trimmed = (value) => String(value ?? '').trim()

/** The wire format keeps `correct_answer` a string (§8); the index is client-side only. */
const filledOptions = (options = []) => options.map(trimmed).filter(Boolean)

/** Chips name their payload, never the control that holds it (§S2). */
export const RAIL_LABELS = {
  explanation: 'cards.quiz.addExplanation',
  description: 'cards.visual.addDescription',
  tags: 'cards.common.addTags',
  deck: 'cards.common.chooseDeck'
}

export const CARD_TYPES = ['flashcard', 'quiz', 'visual']

/** One shape across all three, so switching type keeps the fields they share (§4.4). */
export const emptyCardValues = (deckId = '') => ({
  title: '',
  content: '',
  diagramCode: '',
  options: ['', ''],
  correctIndex: null,
  explanation: '',
  tags: [],
  deckId
})

export const cardToFormState = (card) => ({
  ...emptyCardValues(extractDeckId(card?.deck_id)),
  title: card?.title || '',
  content: card?.content || '',
  diagramCode: card?.diagram_code || '',
  // A stored card may hold fewer than two options; the editor's floor is two.
  options: card?.options?.length >= 2 ? [...card.options] : [...(card?.options || []), '', ''].slice(0, 2),
  correctIndex: card?.options?.indexOf(card?.correct_answer) >= 0 ? card.options.indexOf(card.correct_answer) : null,
  explanation: card?.explanation || '',
  tags: parseTagInput(card?.tags)
})

/**
 * `deck_id: null`, never `undefined`. JSON.stringify drops an undefined value,
 * so the PATCH body loses the key entirely and the server's
 * `if "deck_id" in updates` branch never runs — which is why clearing a card's
 * deck has always been a silent no-op. The server already accepts null and
 * detaches the card on it.
 */
const deckField = (values) => ({ deck_id: values.deckId || null })

const shared = (values) => ({ title: trimmed(values.title), tags: values.tags, ...deckField(values) })

/** Groups whose content is already written open on load — edit never hides it (§S3). */
const contentPredicates = {
  tags: (card) => parseTagInput(card?.tags).length > 0,
  deck: (card) => Boolean(extractDeckId(card?.deck_id)),
  explanation: (card) => trimmed(card?.explanation) !== '',
  description: (card) => trimmed(card?.content) !== ''
}

const pickPredicates = (groups) => Object.fromEntries(groups.map((group) => [group, contentPredicates[group]]))

export const CARD_TYPE_SPECS = {
  // Variant B — paired required fields. Neither half is "the title": a card
  // with a question and no answer is not a partial card, it is not a card.
  flashcard: {
    width: 'standard',
    nameKey: 'cards.common.typeFlashcard',
    createTitleKey: 'cards.flashcard.createTitle',
    editTitleKey: 'cards.flashcard.editTitle',
    groups: ['tags', 'deck'],
    firstRequired: 'title',
    ownFields: ['content'],
    continueResets: ['title', 'content'],
    requiredFields: [
      { field: 'title', errorKey: 'cards.flashcard.frontRequired' },
      { field: 'content', errorKey: 'cards.flashcard.backRequired' }
    ],
    validate: null,
    buildPayload: (values) => ({ ...shared(values), content: trimmed(values.content), card_type: 'flashcard' })
  },

  // Variant C — a required set with a designated member. Validity is a
  // relation, not a list of field checks.
  quiz: {
    width: 'standard',
    nameKey: 'cards.common.typeQuiz',
    createTitleKey: 'cards.quiz.createTitle',
    editTitleKey: 'cards.quiz.editTitle',
    groups: ['explanation', 'tags', 'deck'],
    firstRequired: 'title',
    ownFields: ['options', 'correctIndex', 'explanation'],
    continueResets: ['title', 'options', 'correctIndex', 'explanation'],
    requiredFields: [{ field: 'title', errorKey: 'cards.quiz.questionRequired' }],
    validate: (values) => {
      if (filledOptions(values.options).length < 2) return { field: 'options', errorKey: 'cards.quiz.needTwoOptions' }
      if (trimmed(values.options[values.correctIndex]) === '') return { field: 'correctIndex', errorKey: 'cards.quiz.needCorrectAnswer' }
      return null
    },
    buildPayload: (values) => ({
      ...shared(values),
      // `content` is required by the server model and QuizCardModal never sent
      // it, unlike every other quiz-creating surface in the app.
      content: trimmed(values.explanation),
      options: filledOptions(values.options),
      correct_answer: trimmed(values.options[values.correctIndex]),
      explanation: trimmed(values.explanation),
      card_type: 'quiz'
    })
  },

  // Variant D — a required artifact whose validity is decided by a renderer.
  // The preview is the validation surface, so it never joins the rail.
  visual: {
    width: 'wide',
    nameKey: 'cards.common.typeVisual',
    createTitleKey: 'cards.visual.createTitle',
    editTitleKey: 'cards.visual.editTitle',
    groups: ['description', 'tags', 'deck'],
    firstRequired: 'title',
    ownFields: ['diagramCode', 'content'],
    continueResets: ['title', 'diagramCode', 'content'],
    requiredFields: [
      { field: 'title', errorKey: 'cards.visual.titleRequired' },
      { field: 'diagramCode', errorKey: 'cards.visual.codeRequired' }
    ],
    validate: null,
    buildPayload: (values) => ({
      ...shared(values),
      diagram_code: trimmed(values.diagramCode),
      content: trimmed(values.content),
      card_type: 'visual'
    })
  }
}

/** `hasContent` for the spec's own groups, so S3 needs no per-surface wiring. */
export const contentPredicatesFor = (cardType) => pickPredicates(CARD_TYPE_SPECS[cardType].groups)

export const specFor = (cardType) => CARD_TYPE_SPECS[cardType] || CARD_TYPE_SPECS.flashcard
