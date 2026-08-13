/**
 * FE-C1 — the card sheet's action row (UX-CONTRACT §9.3, CARDS.md §6).
 *
 * `Save & next` is the point of this ticket, so what is pinned here is that it
 * is the primary action in add mode, that it is *last* in DOM order — the
 * keyboard path ends on the action the loop repeats, and at `xs` that puts it
 * against the bottom edge — and that the escape route stays enabled while a
 * save is in flight.
 *
 * jsdom CANNOT verify that the count is actually announced by a screen reader,
 * only that the region it would be announced from is present and polite; nor
 * that the two German labels fit side by side at 375px (they are stacked at
 * `xs` precisely so they do not have to).
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count === undefined ? key : `${key}:${options.count}`),
    i18n: { language: 'en' }
  })
}))

const CardAuthorFooter = require('../CardAuthorFooter').default

const renderFooter = (props = {}) => {
  const handlers = { onSaveAndNext: jest.fn(), onSaveAndClose: jest.fn(), onCancel: jest.fn() }
  const view = render(<CardAuthorFooter isEdit={false} saving={false} savedCount={0} {...handlers} {...props} />)
  return { ...view, ...handlers }
}

const buttonLabels = () => screen.getAllByRole('button').map((button) => button.textContent)

describe('CardAuthorFooter', () => {
  describe('add mode', () => {
    it('offers both outcomes, each button saying which one it is', () => {
      renderFooter()
      expect(buttonLabels()).toEqual(['form.saveAndClose', 'form.saveAndNext'])
    })

    it('puts Save & next last, so the keyboard path ends on the repeated action', () => {
      renderFooter()
      expect(buttonLabels()[buttonLabels().length - 1]).toBe('form.saveAndNext')
    })

    it('keeps the sheet open on the primary action', () => {
      const { onSaveAndNext, onSaveAndClose } = renderFooter()
      screen.getByRole('button', { name: 'form.saveAndNext' }).click()
      expect(onSaveAndNext).toHaveBeenCalledTimes(1)
      expect(onSaveAndClose).not.toHaveBeenCalled()
    })

    it('closes on the secondary action', () => {
      const { onSaveAndClose } = renderFooter()
      screen.getByRole('button', { name: 'form.saveAndClose' }).click()
      expect(onSaveAndClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('edit mode', () => {
    it('offers Save and Cancel, and no loop', () => {
      renderFooter({ isEdit: true })
      expect(buttonLabels()).toEqual(['common.cancel', 'common.save'])
    })

    it('saves and closes from the primary action', () => {
      const { onSaveAndClose, onSaveAndNext } = renderFooter({ isEdit: true })
      screen.getByRole('button', { name: 'common.save' }).click()
      expect(onSaveAndClose).toHaveBeenCalledTimes(1)
      expect(onSaveAndNext).not.toHaveBeenCalled()
    })

    it('reuses the shared cancel and save strings rather than minting card-local ones', () => {
      renderFooter({ isEdit: true })
      expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument()
    })
  })

  describe('the count', () => {
    it('says nothing at zero', () => {
      renderFooter()
      expect(screen.queryByText(/form.addedCount/)).not.toBeInTheDocument()
    })

    it('counts up as the loop runs', () => {
      renderFooter({ savedCount: 3 })
      expect(screen.getByText('form.addedCount:3')).toBeInTheDocument()
    })

    it('announces politely, from a region that was already there at zero', () => {
      const { container, rerender } = renderFooter()
      const live = container.querySelector('[aria-live]')
      expect(live).toHaveAttribute('aria-live', 'polite')

      rerender(<CardAuthorFooter isEdit={false} saving={false} savedCount={1} onSaveAndNext={jest.fn()} onSaveAndClose={jest.fn()} />)
      expect(container.querySelector('[aria-live]')).toBe(live)
    })

    it('never counts in edit mode', () => {
      renderFooter({ isEdit: true, savedCount: 0 })
      expect(screen.queryByText(/form.addedCount/)).not.toBeInTheDocument()
    })
  })

  describe('while saving', () => {
    it('marks only the primary action busy', () => {
      renderFooter({ saving: true })
      expect(screen.getByRole('button', { name: 'form.saveAndNext' })).toBeDisabled()
    })

    it('leaves the escape route enabled, so a stuck request is escapable', () => {
      renderFooter({ saving: true })
      expect(screen.getByRole('button', { name: 'form.saveAndClose' })).not.toBeDisabled()
    })

    it('leaves Cancel enabled in edit mode too', () => {
      renderFooter({ isEdit: true, saving: true })
      expect(screen.getByRole('button', { name: 'common.cancel' })).not.toBeDisabled()
    })
  })

  it('carries no emoji — the old buttons read "💾 Save" and "✨ Create"', () => {
    const { container } = renderFooter()
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })
})
