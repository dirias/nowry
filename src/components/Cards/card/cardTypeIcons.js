/**
 * The web client's resolution of the card-type icon keys that
 * `@nowry/core/domain/cardTypes` hands out.
 *
 * The shared module names an icon; this file decides which Material component
 * draws it. The mobile client will keep its own map over lucide-react-native
 * against the same keys (MOB-014).
 */
import ImageIcon from '@mui/icons-material/Image'
import QuizIcon from '@mui/icons-material/Quiz'
import StyleIcon from '@mui/icons-material/Style'
import { iconKeyFor } from '@nowry/core/domain/cardTypes'

const ICONS = {
  cards: StyleIcon,
  quiz: QuizIcon,
  image: ImageIcon
}

/** The icon component for a card type. Unknown types fall back the same way the spec table does. */
export const iconFor = (cardType) => ICONS[iconKeyFor(cardType)] || ICONS.cards
