/**
 * FE-S3 — FormTextField / FormTextArea (UX-CONTRACT §5.4, §8.2).
 *
 * The wrappers exist for one reason: `aria-invalid` plus `aria-describedby`
 * wired to the helper's id is the most-forgotten detail in the codebase, and
 * five of seven surfaces omit it — so their errors are conveyed by colour alone.
 * Both wrappers are held to the identical contract here, because a difference
 * between them is a defect that would only show on whichever surface used the
 * other one.
 *
 * jsdom CANNOT verify that the announcement actually reaches a screen reader,
 * only that the wiring a screen reader reads is present and correct.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

const FormTextField = require('../FormTextField').default
const FormTextArea = require('../FormTextArea').default

const control = () => screen.getByRole('textbox')

const CASES = [
  ['FormTextField', FormTextField, 'inputRef'],
  ['FormTextArea', FormTextArea, 'textareaRef']
]

describe.each(CASES)('%s', (name, Field, refProp) => {
  const renderField = (props = {}) => render(<Field labelKey='cards.front' value='' onChange={jest.fn()} {...props} />)

  it('labels the control through t(), and the label is its accessible name', () => {
    renderField()
    expect(screen.getByRole('textbox', { name: /cards.front/ })).toBeInTheDocument()
  })

  it('translates the placeholder — never a bare English literal', () => {
    renderField({ placeholderKey: 'cards.frontPlaceholder' })
    expect(control()).toHaveAttribute('placeholder', 'cards.frontPlaceholder')
  })

  it('renders no placeholder attribute when none was asked for', () => {
    renderField()
    expect(control()).not.toHaveAttribute('placeholder')
  })

  it('reports its value and every change back to the caller as a plain string', () => {
    const onChange = jest.fn()
    renderField({ value: 'hola', onChange })
    expect(control()).toHaveValue('hola')
    fireEvent.change(control(), { target: { value: 'hola mundo' } })
    expect(onChange).toHaveBeenCalledWith('hola mundo')
  })

  describe('validation', () => {
    it('is never disabled — a dead control that cannot explain itself is the silent dead end this replaces', () => {
      renderField({ errorKey: 'form.requiredField' })
      expect(control()).not.toBeDisabled()
    })

    it('sets aria-invalid and points aria-describedby at the rendered reason', () => {
      renderField({ errorKey: 'form.requiredField' })
      expect(control()).toHaveAttribute('aria-invalid', 'true')
      const describedBy = control().getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy)).toHaveTextContent('form.requiredField')
    })

    it('renders the reason as text, so the error is not conveyed by colour alone', () => {
      renderField({ errorKey: 'cards.backRequired' })
      expect(screen.getByText('cards.backRequired')).toBeInTheDocument()
    })

    it('sets no aria-invalid when valid', () => {
      renderField()
      expect(control()).not.toHaveAttribute('aria-invalid')
      expect(control()).not.toHaveAttribute('aria-describedby')
    })

    it('shows the helper text when there is no error, and the error replaces it when there is', () => {
      const { rerender } = renderField({ helperKey: 'cards.frontHelp' })
      expect(screen.getByText('cards.frontHelp')).toBeInTheDocument()
      rerender(<Field labelKey='cards.front' value='' onChange={jest.fn()} helperKey='cards.frontHelp' errorKey='form.requiredField' />)
      expect(screen.getByText('form.requiredField')).toBeInTheDocument()
      expect(screen.queryByText('cards.frontHelp')).not.toBeInTheDocument()
    })

    it('describes a plain helper too, so a hint is announced and not merely shown', () => {
      renderField({ helperKey: 'cards.frontHelp' })
      const describedBy = control().getAttribute('aria-describedby')
      expect(document.getElementById(describedBy)).toHaveTextContent('cards.frontHelp')
    })

    it('gives two fields on one form distinct message ids', () => {
      render(
        <>
          <Field labelKey='cards.front' value='' onChange={jest.fn()} errorKey='form.requiredField' />
          <Field labelKey='cards.back' value='' onChange={jest.fn()} errorKey='form.requiredField' />
        </>
      )
      const [first, second] = screen.getAllByRole('textbox')
      expect(first.getAttribute('aria-describedby')).not.toEqual(second.getAttribute('aria-describedby'))
    })
  })

  describe('focus', () => {
    it('exposes the underlying element by ref, so the state core can focus the first invalid field', () => {
      const ref = React.createRef()
      renderField({ [refProp]: ref })
      expect(ref.current).toBe(control())
      ref.current.focus()
      expect(document.activeElement).toBe(control())
    })

    it('autoFocuses on request', () => {
      renderField({ autoFocus: true })
      expect(document.activeElement).toBe(control())
    })

    it('does not autoFocus by default — only one control per sheet may claim the cursor', () => {
      renderField()
      expect(document.activeElement).not.toBe(control())
    })
  })

  it('marks a required field as required for assistive technology', () => {
    renderField({ required: true })
    expect(control()).toBeRequired()
  })
})

describe('FormTextField specifics', () => {
  it('supports a scoped onKeyDown, which is how Variant A′ binds Enter without restoring a <form>', () => {
    const onKeyDown = jest.fn()
    render(<FormTextField labelKey='books.title' value='' onChange={jest.fn()} onKeyDown={onKeyDown} />)
    fireEvent.keyDown(control(), { key: 'Enter' })
    expect(onKeyDown).toHaveBeenCalled()
  })

  it('renders a date input when asked, rather than forcing a second wrapper for it', () => {
    render(<FormTextField labelKey='goal.targetDate' type='date' value='' onChange={jest.fn()} />)
    expect(document.querySelector('input[type="date"]')).toBeTruthy()
  })
})

describe('FormTextArea specifics', () => {
  it('grows without a maxRows cap by default — no scroll region nested inside the sheet scroll', () => {
    render(<FormTextArea labelKey='cards.back' value='' onChange={jest.fn()} />)
    expect(control()).not.toHaveAttribute('maxrows')
  })
})
