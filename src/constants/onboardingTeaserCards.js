import MenuBookRounded from '@mui/icons-material/MenuBookRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import QuizRounded from '@mui/icons-material/QuizRounded'
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded'
import PetsRounded from '@mui/icons-material/PetsRounded'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'

/**
 * The six feature cards the pre-onboarding teaser shows (see `OnboardingTeaser`).
 *
 * Config-driven on purpose: adding, reordering or retiring a card is a change to
 * this array alone, never to the carousel that renders it. `i18nKey` is the
 * segment under `onboarding.teaser.cards.<i18nKey>.{title,description}` in the
 * locale bundles.
 *
 * WHY THERE IS NO PER-CARD ACCENT COLOUR
 *
 * A card carries no colour of its own, and the carousel deliberately holds one
 * accent — the user's own `primary.*` — across all six slides. Three reasons:
 *
 * 1. The primary colour is user-selectable at the Welcome screen, so *any*
 *    fixed palette collides with somebody's brand colour. The default
 *    `#2a6971` already sits ~15° from a teal swatch, which made the nav bar,
 *    the card and its title read as one undifferentiated wash.
 * 2. A single hue driving fill, border and title at once produces a glowing
 *    neon outline — right for a literal Post-it (`Blackboard/nodes/
 *    StickyNoteNode.js`), wrong for a premium feature card, and against
 *    DESIGN_GUIDELINES' "Refined Minimalism".
 * 3. It is redundant. Each card is already distinct by its icon, and this is a
 *    one-time LINEAR carousel — two cards are never on screen together, so the
 *    comparative scanning that justifies category colours never happens.
 *
 * `Icon` is a real `@mui/icons-material` component, matching the rest of the
 * app's icon family, and is the card's only differentiator. There is no `image`
 * field: no real product screenshots exist yet, and the carousel renders a
 * shared neutral placeholder frame instead of a per-card asset (see
 * `OnboardingTeaser`'s `TeaserImagePlaceholder`).
 *
 * @typedef {Object} OnboardingTeaserCard
 * @property {string} id - Stable identifier, also used as the React list key.
 * @property {string} i18nKey - Segment of the `onboarding.teaser.cards.*` key.
 * @property {React.ComponentType} Icon
 */

/** @type {OnboardingTeaserCard[]} */
export const ONBOARDING_TEASER_CARDS = [
  { id: 'smart-books', i18nKey: 'smartBooks', Icon: MenuBookRounded },
  { id: 'study-cards', i18nKey: 'studyCards', Icon: StyleRounded },
  { id: 'quizzes', i18nKey: 'quizzes', Icon: QuizRounded },
  { id: 'diagrams', i18nKey: 'diagrams', Icon: AccountTreeRounded },
  { id: 'smartpet', i18nKey: 'smartpet', Icon: PetsRounded },
  { id: 'annual-planning', i18nKey: 'annualPlanning', Icon: CalendarMonthRounded }
]
