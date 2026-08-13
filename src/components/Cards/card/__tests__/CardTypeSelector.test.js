/**
 * FE-C5 — the card type selector (CARDS.md §4.4).
 *
 * The point of the control is that it is a real one: the shipped app decides
 * the type before the modal opens and offers no way back, and the pattern this
 * replaces elsewhere in the codebase is a `<Box onClick>` with no role, no
 * tabIndex and no accessible name.
 *
 * jsdom CANNOT verify that the three segments are 44 CSS pixels tall, or that
 * the German labels fit three-across at 375px.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

const CardTypeSelector = require('../CardTypeSelector').default

const renderSelector = (props = {}) => {
  const onChange = jest.fn()
  const view = render(<CardTypeSelector value='flashcard' onChange={onChange} {...props} />)
  return { ...view, onChange }
}

describe('CardTypeSelector', () => {
  it('announces as one named set of choices, not three loose controls', () => {
    renderSelector()
    expect(screen.getByRole('radiogroup', { name: 'cards.common.typeSelectorAria' })).toBeInTheDocument()
  })

  it('offers all three variants, each with a translated name', () => {
    renderSelector()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['flashcard', 'quiz', 'visual'])
    expect(screen.getByRole('radio', { name: 'cards.common.typeFlashcard' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'cards.common.typeQuiz' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'cards.common.typeVisual' })).toBeInTheDocument()
  })

  it('marks the current type as the selected one', () => {
    renderSelector({ value: 'visual' })
    expect(screen.getByRole('radio', { name: 'cards.common.typeVisual' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'cards.common.typeFlashcard' })).not.toBeChecked()
  })

  it('reports the requested type rather than switching on its own', () => {
    const { onChange } = renderSelector()
    fireEvent.click(screen.getByRole('radio', { name: 'cards.common.typeQuiz' }))
    expect(onChange).toHaveBeenCalledWith('quiz')
  })

  it('is keyboard-operable, unlike the Box-onClick pattern it replaces', () => {
    renderSelector()
    const radio = screen.getByRole('radio', { name: 'cards.common.typeQuiz' })
    radio.focus()
    expect(radio).toHaveFocus()
  })
})
