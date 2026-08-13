/**
 * FE-S3 — FormTagInput (UX-CONTRACT §5.7, §6.2).
 *
 * Four surfaces collect tags as a comma-separated string today. The chip
 * version wins, and these pin the two behaviours that make it worth converging
 * on: a tag can be removed without re-editing a sentence, and a tag typed but
 * never Entered is not silently thrown away by the save the user just clicked.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key),
    i18n: { language: 'en' }
  })
}))

const FormTagInput = require('../FormTagInput').default

const input = () => screen.getByRole('textbox')
const type = (text) => fireEvent.change(input(), { target: { value: text } })
const pressEnter = () => fireEvent.keyDown(input(), { key: 'Enter' })

const renderTags = (props = {}) => render(<FormTagInput value={[]} onChange={jest.fn()} {...props} />)

describe('FormTagInput', () => {
  it('renders one chip per tag', () => {
    renderTags({ value: ['verbs', 'tenses'] })
    expect(screen.getByText('verbs')).toBeInTheDocument()
    expect(screen.getByText('tenses')).toBeInTheDocument()
  })

  it('labels the field and the input separately, so neither is an unnamed control', () => {
    renderTags()
    expect(screen.getByText('form.tagsLabel')).toBeInTheDocument()
    expect(input()).toHaveAttribute('aria-label', 'form.tagAddAria')
  })

  it('translates its placeholder', () => {
    renderTags()
    expect(input()).toHaveAttribute('placeholder', 'form.tagPlaceholder')
  })

  describe('adding', () => {
    it('adds the typed tag on Enter', () => {
      const onChange = jest.fn()
      renderTags({ onChange })
      type('verbs')
      pressEnter()
      expect(onChange).toHaveBeenCalledWith(['verbs'])
    })

    it('appends to the existing tags rather than replacing them', () => {
      const onChange = jest.fn()
      renderTags({ value: ['verbs'], onChange })
      type('tenses')
      pressEnter()
      expect(onChange).toHaveBeenCalledWith(['verbs', 'tenses'])
    })

    it('trims whitespace', () => {
      const onChange = jest.fn()
      renderTags({ onChange })
      type('  verbs  ')
      pressEnter()
      expect(onChange).toHaveBeenCalledWith(['verbs'])
    })

    it('ignores an empty or whitespace-only entry instead of adding a blank chip', () => {
      const onChange = jest.fn()
      renderTags({ onChange })
      type('   ')
      pressEnter()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('refuses a duplicate — two identical chips give no way to tell which delete removes which', () => {
      const onChange = jest.fn()
      renderTags({ value: ['verbs'], onChange })
      type('verbs')
      pressEnter()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('clears the input after a successful add, so the next tag starts empty', () => {
      renderTags()
      type('verbs')
      pressEnter()
      expect(input()).toHaveValue('')
    })

    it('swallows the Enter key, so it can never reach a submit handler (§5.9)', () => {
      renderTags()
      type('verbs')
      const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      input().dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    })

    it('leaves other keys alone', () => {
      const onChange = jest.fn()
      renderTags({ onChange })
      type('verbs')
      fireEvent.keyDown(input(), { key: 'a' })
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('removing', () => {
    it('removes only the chip that was deleted', () => {
      const onChange = jest.fn()
      renderTags({ value: ['verbs', 'tenses'], onChange })
      fireEvent.click(screen.getByRole('button', { name: 'form.tagRemoveAria:{"tag":"tenses"}' }))
      expect(onChange).toHaveBeenCalledWith(['verbs'])
    })

    it('names each delete control with the tag it removes, interpolated through t()', () => {
      renderTags({ value: ['verbs'] })
      expect(screen.getByRole('button', { name: 'form.tagRemoveAria:{"tag":"verbs"}' })).toBeInTheDocument()
    })
  })

  describe('the pending tag', () => {
    it('commits on blur, so clicking Save does not discard what was typed', () => {
      const onChange = jest.fn()
      renderTags({ onChange })
      type('verbs')
      fireEvent.blur(input())
      expect(onChange).toHaveBeenCalledWith(['verbs'])
    })

    it('exposes commitPending() by ref, because a tap on Save does not reliably blur first', () => {
      const ref = React.createRef()
      const onChange = jest.fn()
      render(<FormTagInput ref={ref} value={['verbs']} onChange={onChange} />)
      type('tenses')
      ref.current.commitPending()
      expect(onChange).toHaveBeenCalledWith(['verbs', 'tenses'])
    })

    it('commitPending() is a no-op when nothing is pending', () => {
      const ref = React.createRef()
      const onChange = jest.fn()
      render(<FormTagInput ref={ref} value={[]} onChange={onChange} />)
      ref.current.commitPending()
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('four states', () => {
    it('renders the input alone when empty — no chip row, and no fixed-height empty box', () => {
      const { container } = renderTags({ value: [] })
      expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(0)
      expect(input()).toBeInTheDocument()
    })

    it('renders a helper line when the caller supplies one', () => {
      renderTags({ helperKey: 'cards.tagsHelp' })
      expect(screen.getByText('cards.tagsHelp')).toBeInTheDocument()
    })
  })

  it('has a display name, so it is not "ForwardRef" in a stack trace', () => {
    expect(FormTagInput.displayName).toBe('FormTagInput')
  })
})
