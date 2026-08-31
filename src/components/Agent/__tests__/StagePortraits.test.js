/**
 * PET-014 — StagePortraits.
 *
 * Generating used to overwrite: each stage held one portrait, so a Pro user
 * with three generations a month kept only the third and the other two were
 * paid for and destroyed. Keeping them makes generation additive, and this
 * picker is how the user gets the value back.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const StagePortraits = require('../StagePortraits').default

const URLS = ['https://x/a.png', 'https://x/b.png', 'https://x/c.png']

const renderPicker = (props = {}) => render(<StagePortraits stage={3} portraits={URLS} wornUrl={URLS[1]} onWear={jest.fn()} {...props} />)

const options = () => screen.queryAllByRole('radio')

describe('StagePortraits', () => {
  it('offers every portrait generated for the form', () => {
    renderPicker()
    expect(options()).toHaveLength(3)
  })

  it('marks exactly the worn one', () => {
    renderPicker()
    const checked = options().filter((o) => o.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0].querySelector('img').getAttribute('src')).toBe(URLS[1])
  })

  // A picker offering one option is not a choice, it is clutter.
  it('renders nothing when there is nothing to choose between', () => {
    const { container } = renderPicker({ portraits: [URLS[0]] })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the user has generated nothing at all', () => {
    const { container: a } = renderPicker({ portraits: [] })
    expect(a).toBeEmptyDOMElement()
    const { container: b } = renderPicker({ portraits: undefined })
    expect(b).toBeEmptyDOMElement()
  })

  it('reports the stage and the chosen portrait', () => {
    const onWear = jest.fn()
    renderPicker({ onWear })
    fireEvent.click(options()[2])
    expect(onWear).toHaveBeenCalledWith(3, URLS[2])
  })

  it('does nothing when the worn portrait is clicked again', () => {
    const onWear = jest.fn()
    renderPicker({ onWear })
    fireEvent.click(options()[1])
    expect(onWear).not.toHaveBeenCalled()
  })

  it('is reachable by keyboard, not mouse only', () => {
    const onWear = jest.fn()
    renderPicker({ onWear })
    fireEvent.keyDown(options()[0], { key: 'Enter' })
    expect(onWear).toHaveBeenCalledWith(3, URLS[0])
  })

  it('ignores input while disabled', () => {
    const onWear = jest.fn()
    renderPicker({ onWear, disabled: true })
    fireEvent.click(options()[2])
    fireEvent.keyDown(options()[0], { key: 'Enter' })
    expect(onWear).not.toHaveBeenCalled()
  })
})
