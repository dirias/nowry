/**
 * FE-S3 — FormDeckSelect (UX-CONTRACT §5.6, §10).
 *
 * One control replacing three copies of the same Select and three copies of a
 * ten-line unwrap for a deck_id that arrives populated on some responses and as
 * a bare string on others. The unwrap cases are the ones worth pinning: if it
 * regresses, an edit form silently opens showing no deck for a card that has
 * one, and saving then clears it.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

const FormDeckSelect = require('../FormDeckSelect').default

const DECKS = [
  { _id: 'deck-1', name: 'Spanish verbs' },
  { _id: 'deck-2', name: 'Kanji N5' }
]

const trigger = () => screen.getByRole('combobox')
const open = () => fireEvent.click(trigger())

const renderSelect = (props = {}) => render(<FormDeckSelect decks={DECKS} value='' onChange={jest.fn()} {...props} />)

describe('FormDeckSelect', () => {
  it('labels the control through t()', () => {
    renderSelect()
    expect(screen.getByText('form.deckLabel')).toBeInTheDocument()
  })

  it('shows a translated placeholder when no deck is chosen', () => {
    renderSelect()
    expect(trigger()).toHaveTextContent('form.deckPlaceholder')
  })

  it('lists every deck by name', () => {
    renderSelect()
    open()
    expect(screen.getByRole('option', { name: 'Spanish verbs' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Kanji N5' })).toBeInTheDocument()
  })

  it('reports the chosen deck id back to the caller', () => {
    const onChange = jest.fn()
    renderSelect({ onChange })
    open()
    fireEvent.click(screen.getByRole('option', { name: 'Kanji N5' }))
    expect(onChange).toHaveBeenCalledWith('deck-2')
  })

  describe('the deck_id unwrap — three copies collapsed into one', () => {
    it('shows the current deck when the id arrives as a bare string', () => {
      renderSelect({ value: 'deck-1' })
      expect(trigger()).toHaveTextContent('Spanish verbs')
    })

    it('shows the current deck when the id arrives as a populated object', () => {
      renderSelect({ value: { _id: 'deck-2', name: 'Kanji N5' } })
      expect(trigger()).toHaveTextContent('Kanji N5')
    })

    it('falls back to `id` when the object was serialised without an underscore', () => {
      renderSelect({ value: { id: 'deck-1' } })
      expect(trigger()).toHaveTextContent('Spanish verbs')
    })

    it('matches decks that carry `id` rather than `_id`', () => {
      renderSelect({ decks: [{ id: 'deck-9', name: 'Legacy deck' }], value: 'deck-9' })
      expect(trigger()).toHaveTextContent('Legacy deck')
    })

    it('shows the placeholder rather than crashing when the id is null', () => {
      renderSelect({ value: null })
      expect(trigger()).toHaveTextContent('form.deckPlaceholder')
    })
  })

  describe('no deck', () => {
    it('offers "no deck" by default — a card without a deck is a valid card', () => {
      renderSelect()
      open()
      expect(screen.getByRole('option', { name: 'form.deckNone' })).toBeInTheDocument()
    })

    it('reports an empty string when the user chooses it', () => {
      const onChange = jest.fn()
      renderSelect({ onChange, value: 'deck-1' })
      open()
      fireEvent.click(screen.getByRole('option', { name: 'form.deckNone' }))
      expect(onChange).toHaveBeenCalledWith('')
    })

    it('omits the option when a surface requires a deck', () => {
      renderSelect({ allowNone: false })
      open()
      expect(screen.queryByRole('option', { name: 'form.deckNone' })).not.toBeInTheDocument()
    })
  })

  describe('four states', () => {
    it('renders no loading state — the decks are already in hand from the caller', () => {
      const { container } = renderSelect()
      expect(container.querySelector('.MuiSkeleton-root')).toBeNull()
      expect(container.querySelector('.MuiCircularProgress-root')).toBeNull()
    })

    it('says so when the user has no decks, instead of opening an empty list silently', () => {
      renderSelect({ decks: [] })
      const message = screen.getByText('form.deckEmpty')
      expect(message).toBeInTheDocument()
      expect(trigger()).toHaveAttribute('aria-describedby', message.getAttribute('id'))
    })

    it('drops the empty message once decks exist', () => {
      renderSelect()
      expect(screen.queryByText('form.deckEmpty')).not.toBeInTheDocument()
    })
  })

  it('emits no prop-type warning — Joy rejects a null Option value, and a console full of noise is where real warnings go to hide', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    renderSelect()
    const propTypeWarnings = spy.mock.calls.filter((args) => String(args[0]).includes('Failed prop type'))
    spy.mockRestore()
    expect(propTypeWarnings).toEqual([])
  })

  it('exposes the trigger by ref, so a revealed chip can move focus into it', () => {
    const ref = React.createRef()
    renderSelect({ selectRef: ref })
    expect(ref.current).toBe(trigger())
  })
})
