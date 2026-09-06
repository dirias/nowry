import QuizRounded from '@mui/icons-material/QuizRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded'

/**
 * One map for a deck's type (PRD FR-007). The label key is looked up here, not
 * built from the type string — `study.types.${type}s` printed a raw
 * `study.types.quizs` on every quiz deck (PRD E8).
 *
 * `color` is the identity tile's colour (§15.8, §15.11): full strength on a
 * 16px area, never on a card or a chip.
 */
export const DECK_TYPES = {
  flashcard: { labelKey: 'study.types.flashcards', color: 'primary.solidBg', Icon: StyleRounded },
  quiz: { labelKey: 'study.types.quizzes', color: 'warning.solidBg', Icon: QuizRounded },
  visual: { labelKey: 'study.types.visual', color: 'success.solidBg', Icon: AccountTreeRounded }
}

export const deckType = (type) => DECK_TYPES[type] || DECK_TYPES.flashcard
