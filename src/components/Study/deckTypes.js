import QuizRounded from '@mui/icons-material/QuizRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded'

import { DECK_TYPES as SHARED, deckType as sharedDeckType } from '@nowry/core/domain/deckTypes'

/**
 * The web's view of the shared deck-type table.
 *
 * Label and colour moved to `@nowry/core/domain/deckTypes` so the mobile client
 * reads the same ones; this file adds the only part that cannot be shared, the
 * Material component for each type. The label key is still looked up rather
 * than built from the type string — `study.types.${type}s` printed a raw
 * `study.types.quizs` on every quiz deck (PRD E8).
 */
const ICONS = { flashcard: StyleRounded, quiz: QuizRounded, visual: AccountTreeRounded }

export const DECK_TYPES = Object.fromEntries(Object.entries(SHARED).map(([type, entry]) => [type, { ...entry, Icon: ICONS[type] }]))

export const deckType = (type) => DECK_TYPES[type] || DECK_TYPES.flashcard

export { sharedDeckType }
