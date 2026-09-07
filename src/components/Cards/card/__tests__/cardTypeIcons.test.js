/**
 * The icon keys `@nowry/core/domain/cardTypes` hands out must still resolve to
 * the exact Material components the picker drew before MOB-003B moved that
 * module into the shared package. This is the assertion behind "no visual
 * change": the shared layer stopped returning components, and the web client
 * has to land on the same three icons it always did.
 */
import ImageIcon from '@mui/icons-material/Image'
import QuizIcon from '@mui/icons-material/Quiz'
import StyleIcon from '@mui/icons-material/Style'
import { iconKeyFor } from '@nowry/core/domain/cardTypes'
import { iconFor } from '../cardTypeIcons'

describe('card type icons', () => {
  it.each([
    ['flashcard', 'cards', StyleIcon],
    ['quiz', 'quiz', QuizIcon],
    ['visual', 'image', ImageIcon]
  ])('%s names "%s" and draws the icon it always drew', (cardType, key, Expected) => {
    expect(iconKeyFor(cardType)).toBe(key)
    expect(iconFor(cardType)).toBe(Expected)
  })

  it('falls back the same way the spec table does, rather than rendering nothing', () => {
    expect(iconKeyFor('does-not-exist')).toBe('cards')
    expect(iconFor('does-not-exist')).toBe(StyleIcon)
  })
})
