import { AccountTree, Quiz as QuizIcon, Style } from '@mui/icons-material'

/**
 * The deck-type accent: a colour, an icon **and** a text label.
 *
 * Three signals for one fact, and it stays that way deliberately (§6.4). The
 * icon is the non-colour channel, so a user who cannot distinguish the warning
 * and success palettes still reads the type — colour is never the only signal.
 */
export const getDeckAccent = (deckType) => {
  if (deckType === 'quiz') return { color: 'warning', Icon: QuizIcon }
  if (deckType === 'visual') return { color: 'success', Icon: AccountTree }
  return { color: 'primary', Icon: Style }
}

export default getDeckAccent
