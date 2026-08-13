/**
 * FE-S2 — FormSheet (UX-CONTRACT §4.2, §4.3, §4.6).
 *
 * The properties pinned here are the ones seven hand-rolled shells got wrong:
 * a footer inside the scroll region, a height in `vh` that does not shrink for
 * the on-screen keyboard, and a Close control that could scroll away.
 *
 * What jsdom CANNOT verify, and therefore still needs a real 375px browser:
 *   - that `100dvh` actually tracks the visual viewport when the keyboard opens
 *   - that `env(safe-area-inset-bottom)` resolves to a non-zero inset
 *   - that the footer is visually above the keyboard without scrolling
 *   - that the body actually scrolls (jsdom has no layout, so every element
 *     reports zero height and nothing overflows)
 *   - focus restoration to the invoking control on close
 * These assert the *declarations* that produce those behaviours instead.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'

import { cssFor, injectedCss } from '../__testHelpers__/cssRules'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

const FormSheet = require('../FormSheet').default

const setViewport = (mobile) => {
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

const renderSheet = (props = {}) =>
  render(
    <FormSheet open onClose={jest.fn()} titleKey='cards.newFlashcard' {...props}>
      <input aria-label='front' />
    </FormSheet>
  )

describe('FormSheet', () => {
  beforeEach(() => setViewport(false))

  describe('header', () => {
    it('names the sheet through t() and wires the dialog to it with aria-labelledby', () => {
      renderSheet()
      const heading = screen.getByText('cards.newFlashcard')
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', heading.getAttribute('id'))
      expect(heading.getAttribute('id')).toBeTruthy()
    })

    it('gives two open sheets distinct title ids, so neither steals the other label', () => {
      const { unmount } = renderSheet()
      const first = screen.getByText('cards.newFlashcard').getAttribute('id')
      unmount()
      renderSheet()
      const second = screen.getByText('cards.newFlashcard').getAttribute('id')
      expect(first).not.toEqual(second)
    })

    it('renders the subtitle only when one is supplied', () => {
      const { unmount } = renderSheet()
      expect(screen.queryByText('cards.editSubtitle')).not.toBeInTheDocument()
      unmount()
      renderSheet({ subtitleKey: 'cards.editSubtitle' })
      expect(screen.getByText('cards.editSubtitle')).toBeInTheDocument()
    })

    it('offers a Close control with a translated accessible name — never a bare icon', () => {
      renderSheet()
      const close = screen.getByRole('button', { name: 'common.close' })
      expect(close.tagName).toBe('BUTTON')
    })

    it('calls onClose from the Close control', () => {
      const onClose = jest.fn()
      renderSheet({ onClose })
      screen.getByRole('button', { name: 'common.close' }).click()
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('renders a header accessory (the add-mode card type selector) when given one', () => {
      renderSheet({ headerAccessory: <button type='button'>type-selector</button> })
      expect(screen.getByText('type-selector')).toBeInTheDocument()
    })
  })

  describe('structure — the defect that made Save unreachable', () => {
    it('puts the footer OUTSIDE the scrolling body, as a sibling and not its last child', () => {
      renderSheet({ footer: <button type='button'>save</button> })
      const body = screen.getByLabelText('front').closest('div')
      const footer = screen.getByText('save').closest('div')
      expect(body.contains(screen.getByText('save'))).toBe(false)
      expect(footer.parentElement).toBe(body.parentElement)
    })

    it('orders the regions header → body → banner → footer', () => {
      renderSheet({ banner: <p>banner</p>, footer: <button type='button'>save</button> })
      const dialog = screen.getByRole('dialog')
      const order = ['cards.newFlashcard', 'front', 'banner', 'save']
      const positions = order.map((label) => {
        const node = screen.queryByText(label) || screen.getByLabelText(label)
        return Array.from(dialog.querySelectorAll('*')).indexOf(node)
      })
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    })

    it('renders no banner region at all when there is no error — no empty box, no residual gap', () => {
      renderSheet({ footer: <button type='button'>save</button> })
      expect(screen.queryByText('banner')).not.toBeInTheDocument()
    })

    it('renders no footer region when a surface has none (Variant E autosaves)', () => {
      renderSheet()
      expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument()
    })

    it('declares the flex column that makes the sticky footer work', () => {
      renderSheet({ footer: <button type='button'>save</button> })
      const css = injectedCss()
      expect(css).toContain('flex-direction:column')
      expect(css).toMatch(/min-height:0/)
      expect(css).toMatch(/overflow-y:auto/)
    })
  })

  describe('sm and up — the dialog', () => {
    it('renders a ModalDialog, not a Drawer', () => {
      renderSheet()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(document.querySelector('.MuiDrawer-root')).toBeNull()
      expect(cssFor(screen.getByRole('dialog'))).not.toContain('100dvh')
    })

    it.each([
      ['simple', '560px'],
      ['standard', '700px'],
      ['wide', '900px']
    ])('sizes the %s variant at %s — three widths, not the five that shipped', (width, expected) => {
      renderSheet({ width })
      expect(cssFor(screen.getByRole('dialog'))).toContain(`max-width:${expected}`)
    })

    it('falls back to the standard width for an unknown variant rather than collapsing', () => {
      renderSheet({ width: 'enormous' })
      expect(cssFor(screen.getByRole('dialog'))).toContain('max-width:700px')
    })

    it('keeps height auto so a collapsed form does not reserve space it is not using', () => {
      renderSheet()
      const css = cssFor(screen.getByRole('dialog'))
      expect(css).toContain('height:auto')
      expect(css).toContain('max-height:90vh')
    })
  })

  describe('xs — the bottom sheet', () => {
    beforeEach(() => setViewport(true))

    const sheetContent = () => document.querySelector('.MuiDrawer-content')

    it('uses 100dvh and never 100vh, so the sheet shrinks when the keyboard opens', () => {
      renderSheet({ footer: <button type='button'>save</button> })
      const css = cssFor(sheetContent())
      expect(css).toContain('height:100dvh')
      expect(injectedCss()).not.toContain('height:100vh')
    })

    it('goes full-bleed — no centred dialog losing width where there is least of it', () => {
      renderSheet()
      const css = cssFor(sheetContent())
      expect(css).toContain('width:100vw')
      expect(css).toContain('border-radius:0')
    })

    it('pads the footer past the home indicator with env(safe-area-inset-bottom)', () => {
      renderSheet({ footer: <button type='button'>save</button> })
      expect(injectedCss()).toContain('env(safe-area-inset-bottom)')
    })

    it('still labels the sheet for a screen reader', () => {
      renderSheet()
      const labelled = document.querySelector('[aria-labelledby]')
      expect(labelled).toBeTruthy()
      expect(document.getElementById(labelled.getAttribute('aria-labelledby'))).toHaveTextContent('cards.newFlashcard')
    })
  })

  describe('focus', () => {
    // The defect class this guards: a Close control now precedes the first
    // field in the DOM, and Joy's focus trap runs after mount. If the trap
    // reclaimed focus, every surface would open with the cursor on Close
    // instead of the field — passing review and failing for every real user.
    it('leaves an autoFocused field focused rather than surrendering it to the trap or to Close', () => {
      render(
        <FormSheet open onClose={jest.fn()} titleKey='cards.newFlashcard' footer={<button type='button'>save</button>}>
          <input aria-label='front' autoFocus />
        </FormSheet>
      )
      expect(document.activeElement).toBe(screen.getByLabelText('front'))
    })

    it('does not trap focus onto the Close control when nothing autofocuses', () => {
      renderSheet()
      expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'common.close' }))
    })
  })

  describe('four states', () => {
    it('renders nothing when closed', () => {
      renderSheet({ open: false })
      expect(screen.queryByText('cards.newFlashcard')).not.toBeInTheDocument()
    })

    it('adds no skeleton of its own — six of seven surfaces fetch nothing on open', () => {
      const { container } = renderSheet()
      expect(within(document.body).queryByRole('progressbar')).not.toBeInTheDocument()
      expect(container.querySelector('.MuiSkeleton-root')).toBeNull()
    })
  })
})
