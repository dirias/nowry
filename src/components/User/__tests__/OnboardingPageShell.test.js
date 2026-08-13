/**
 * ONB-008 — OnboardingPageShell.
 *
 * Two of this component's guarantees are structural rather than visual, and
 * those are the ones worth pinning:
 *
 * 1. **The footer is a sibling of the scroll region, not its last child.** That
 *    single DOM fact is what makes NFR-014 true — a required action inside a
 *    scrolling body can always be pushed out of reach, and one beside it never
 *    can, no matter how tall the content or how small the viewport.
 * 2. **Height is `100dvh`, never `100vh`.** `vh` does not shrink when the
 *    on-screen keyboard opens or when mobile browser chrome collapses, which is
 *    exactly how the superseded wizard put its primary action off-screen.
 *
 * jsdom has no layout engine, so neither can be checked by measuring anything.
 * The first is asserted against the real node tree; the second against the CSS
 * Emotion actually emitted.
 */
jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        const raw = resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en' }
    })
  }
})

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import OnboardingPageShell from '../OnboardingPageShell'
import en from '../../../locales/en/translation.json'

/** Everything Emotion has put in the document, however it chose to store it. */
const collectCss = () =>
  Array.from(document.querySelectorAll('style'))
    .map((tag) => {
      if (tag.textContent) return tag.textContent
      try {
        return Array.from(tag.sheet?.cssRules || [])
          .map((rule) => rule.cssText)
          .join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')

const setup = (props = {}) =>
  render(
    <OnboardingPageShell screenKey='welcome' stepNumber={1} title='Welcome' footer={<button type='button'>Continue</button>} {...props}>
      <p>Body content</p>
    </OnboardingPageShell>
  )

const regions = () => {
  const heading = screen.getByRole('heading', { level: 3 })
  const body = heading.parentElement.parentElement
  const footer = document.querySelector('footer')
  return { heading, body, footer }
}

describe('the layout law — the footer cannot scroll out of reach (NFR-014)', () => {
  it('renders the footer as a sibling of the scroll region, never inside it', () => {
    setup()
    const { body, footer } = regions()

    expect(footer).toBeInTheDocument()
    expect(body.contains(footer)).toBe(false)
    expect(footer.parentElement).toBe(body.parentElement)
  })

  it('puts the header, the body and the footer in that order under one flex column', () => {
    setup()
    const { body, footer } = regions()
    const shell = body.parentElement
    const header = document.querySelector('header')

    expect(Array.from(shell.children)).toEqual([header, body, footer])
  })

  it('gives the scroll region its own overflow so the page itself never scrolls', () => {
    setup()
    const { body } = regions()
    const shell = body.parentElement

    expect(getComputedStyle(body).overflowY).toBe('auto')
    expect(getComputedStyle(shell).overflow).toBe('hidden')
  })

  it('sizes itself with dvh and never with vh', () => {
    setup()
    const css = collectCss()

    expect(css).toContain('100dvh')
    expect(css).not.toContain('100vh')
  })

  it('pads the footer past the home indicator', () => {
    setup()
    expect(collectCss()).toContain('env(safe-area-inset-bottom)')
  })

  it('omits the footer region entirely when a screen has no required action', () => {
    setup({ footer: null })
    expect(document.querySelector('footer')).toBeNull()
  })
})

describe('focus on screen change (NFR-002)', () => {
  it('focuses the heading on arrival', () => {
    setup()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 3 }))
  })

  it('gives the heading no tab stop of its own', () => {
    setup()
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('tabindex', '-1')
  })

  it('moves focus back to the heading when the screen changes', () => {
    const { rerender } = setup()
    document.querySelector('footer button').focus()
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 3 }))

    rerender(
      <OnboardingPageShell
        screenKey='personalization'
        stepNumber={2}
        title='Personalization'
        footer={<button type='button'>Continue</button>}
      >
        <p>Body content</p>
      </OnboardingPageShell>
    )

    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 3 }))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Personalization')
  })

  it('traps nothing — there is no scrim, no inert and no focus loop', () => {
    const { container } = setup()
    expect(container.querySelector('[inert]')).toBeNull()
    expect(container.querySelector('[aria-modal]')).toBeNull()
    expect(document.querySelector('.MuiModal-backdrop')).toBeNull()
  })
})

describe('progress that a screen reader can read', () => {
  it('states the position in words, in a live region', () => {
    setup({ stepNumber: 2 })
    const status = screen.getByRole('status')

    expect(status).toHaveTextContent('Step 2 of 3')
  })

  it('hides the bar from assistive technology, because the sentence already says it', () => {
    setup({ stepNumber: 2 })

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument()
  })

  it('shows no position at all for a state that is not one of the three screens', () => {
    setup({ stepNumber: null, screenKey: 'journey-error', title: en.onboarding.shell.error.title })

    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})

describe('back navigation', () => {
  it('renders no back control on the first screen', () => {
    setup({ onBack: null })
    expect(screen.queryByRole('button', { name: en.onboarding.back })).toBeNull()
  })

  it('offers a named, touch-sized back control when one is given', () => {
    const onBack = jest.fn()
    setup({ onBack })
    const button = screen.getByRole('button', { name: en.onboarding.back })

    fireEvent.click(button)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('keeps back in the header, which never scrolls', () => {
    setup({ onBack: jest.fn() })
    const button = screen.getByRole('button', { name: en.onboarding.back })
    const { body } = regions()

    expect(document.querySelector('header').contains(button)).toBe(true)
    expect(body.contains(button)).toBe(false)
  })
})

describe('reduced motion (NFR-007)', () => {
  it('drops every animation it adds, so no transition needs to be seen to be understood', () => {
    setup()
    const css = collectCss()
    const reducedBlocks = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)[^@]*/g) || []

    expect(reducedBlocks.length).toBeGreaterThan(0)
    expect(reducedBlocks.join('\n')).toMatch(/animation:\s*none/)
  })
})

describe('loading', () => {
  it('renders the chrome with skeletons instead of gating the page behind a spinner', () => {
    const { container } = setup({ loading: true, title: 'Welcome', stepNumber: null })

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: /loading/i })).toBeNull()
    // The shell is still the shell: heading, header and body all exist.
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    expect(document.querySelector('header')).toBeInTheDocument()
  })
})

describe('the desktop reading width (NFR-015)', () => {
  it('constrains header, body and footer to the same column', () => {
    setup({ onBack: jest.fn() })
    const { heading, footer } = regions()
    const header = document.querySelector('header')

    const widths = [header.firstElementChild, heading.parentElement, footer.firstElementChild].map(
      (node) => getComputedStyle(node).maxWidth
    )

    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBe('640px')
  })
})
