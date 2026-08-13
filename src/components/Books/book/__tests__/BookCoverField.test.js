/**
 * FE-B4 — the cover field (BOOKS.md §6).
 *
 * The eight preset swatches were `<Box onClick>`: no role, no tabIndex, no key
 * handling and no accessible name. A keyboard user could not choose a cover
 * colour at all, and a screen-reader user could not perceive that eight choices
 * existed. These pin the fix, and equally pin what must NOT change — the eight
 * hex values are content the user chose, not styling constants, and tokenizing
 * them would repaint someone's book cover when they switched theme.
 *
 * jsdom CANNOT verify: arrow-key movement between the radios. That behaviour
 * comes from the browser's native handling of same-name radio inputs, which
 * jsdom does not implement — what is asserted here is that the structure the
 * browser needs is present (one radiogroup, eight radios, one shared name).
 */
import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))

jest.mock('react-color', () => ({
  SketchPicker: ({ onChangeComplete }) => (
    <button type='button' data-testid='sketch-picker' onClick={() => onChangeComplete({ hex: '#abcdef' })}>
      picker
    </button>
  )
}))

const BookCoverField = require('../BookCoverField').default

const setViewport = (mobile = false) => {
  window.matchMedia = (query) => ({
    matches: mobile && query.includes('max-width: 599px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

const renderField = (props = {}) => {
  const onColorChange = jest.fn()
  const onImageChange = jest.fn()
  const view = render(<BookCoverField color='#0B6BCB' onColorChange={onColorChange} imageUrl='' onImageChange={onImageChange} {...props} />)
  return { ...view, onColorChange, onImageChange }
}

const PRESET_HEXES = ['#0B6BCB', '#C41C1C', '#1F7A1F', '#9A5B13', '#6523cf', '#c41c88', '#000000', '#555555']

beforeEach(() => setViewport(false))

describe('the swatches', () => {
  it('are eight real radios in one group — they used to be unlabelled divs', () => {
    renderField()

    const group = screen.getByRole('radiogroup', { name: 'books.coverColorLabel' })
    expect(within(group).getAllByRole('radio')).toHaveLength(8)
  })

  it('each announce a translated colour name, so colour is not the only channel', () => {
    renderField()

    const names = ['blue', 'red', 'green', 'orange', 'purple', 'pink', 'black', 'grey']
    names.forEach((name) => {
      expect(screen.getByRole('radio', { name: `books.coverColors.${name}` })).toBeInTheDocument()
    })
  })

  it('share one name attribute, which is what gives the browser arrow keys', () => {
    renderField()

    const radios = screen.getAllByRole('radio')
    const groupNames = new Set(radios.map((radio) => radio.getAttribute('name')))
    expect(groupNames.size).toBe(1)
    expect([...groupNames][0]).toBeTruthy()
  })

  it('keeps every preset value exactly as stored — these are content, not tokens', () => {
    renderField()

    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(PRESET_HEXES)
  })

  it('marks the current colour checked, and reports a change by value', () => {
    const { onColorChange } = renderField({ color: '#C41C1C' })

    expect(screen.getByRole('radio', { name: 'books.coverColors.red' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'books.coverColors.blue' })).not.toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: 'books.coverColors.green' }))
    expect(onColorChange).toHaveBeenCalledWith('#1F7A1F')
  })
})

describe('the custom-colour picker', () => {
  it('mounts only once asked for, and reports its state', () => {
    renderField()

    const trigger = screen.getByRole('button', { name: 'books.customColor' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('sketch-picker')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByTestId('sketch-picker')).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on Escape — the old dismissal overlay had no keyboard route out', () => {
    renderField()
    fireEvent.click(screen.getByRole('button', { name: 'books.customColor' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('sketch-picker')).not.toBeInTheDocument()
  })

  it('stores whatever hex the user picked', () => {
    const { onColorChange } = renderField()
    fireEvent.click(screen.getByRole('button', { name: 'books.customColor' }))
    fireEvent.click(screen.getByTestId('sketch-picker'))

    expect(onColorChange).toHaveBeenCalledWith('#abcdef')
  })
})

describe('the cover image', () => {
  it('explains a broken URL instead of rendering a broken glyph', () => {
    renderField({ imageUrl: 'https://example.com/nope.png' })

    const preview = screen.getByRole('img', { name: 'books.coverImageAlt' })
    fireEvent.error(preview)

    expect(screen.getByText('books.coverImageError')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('reserves no preview box when there is no URL', () => {
    renderField()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
