/**
 * ONB-007 — the shared selector `sx` fragments.
 *
 * These assertions look trivial and are not. Each one is a regression guard for
 * an accessibility promise that is invisible in jsdom and expensive to catch by
 * eye: text that must wrap rather than ellipsise under a long German string or
 * 200% zoom (NFR-010), and a touch target that must stay ≥44px at `xs`
 * (NFR-006, WCAG 2.5.5). A future "tidy-up" that adds `noWrap` or shrinks the
 * min-height breaks a requirement, not a preference — so it breaks a test.
 */
import { optionBase, selectedOption, unselectedOption, blockedOption, overlayFocusRing, visuallyHidden } from '../taxonomySelectorStyles'
import { focusRing, touchTarget } from '../../Common/Form/formStyles'

describe('taxonomySelectorStyles — enlarged and wrapped text', () => {
  it('lets a translated label wrap instead of clamping it to one line', () => {
    expect(optionBase.whiteSpace).toBe('normal')
    expect(optionBase.height).toBe('auto')
  })

  it('never truncates an option label', () => {
    expect(optionBase.textOverflow).toBeUndefined()
    expect(optionBase.WebkitLineClamp).toBeUndefined()
    expect(optionBase.overflow).toBeUndefined()
  })
})

describe('taxonomySelectorStyles — touch and focus', () => {
  it('reuses the house touch target rather than inventing a second number', () => {
    expect(optionBase.minHeight).toEqual(touchTarget.minHeight)
    expect(optionBase.minHeight.xs).toBeGreaterThanOrEqual(44)
  })

  it('reuses the house focus ring rather than relying on the browser default Joy resets', () => {
    expect(optionBase['&:focus-visible']).toEqual(focusRing['&:focus-visible'])
  })

  it('drops its transition under prefers-reduced-motion', () => {
    expect(optionBase['@media (prefers-reduced-motion: reduce)']).toEqual({ transition: 'none' })
  })

  it('reaches an overlay control through a class, never through :has()', () => {
    // nwsapi, the selector engine jsdom uses, cannot parse `:has()`. A single
    // `:has()` rule in the document makes every `getByRole` in the suite throw
    // from `getComputedStyle`, a failure that points nowhere near its cause.
    expect(overlayFocusRing['&.Mui-focusVisible']).toEqual(focusRing['&:focus-visible'])
    expect(Object.keys(overlayFocusRing).some((key) => key.includes(':has('))).toBe(false)
  })
})

describe('taxonomySelectorStyles — selection is carried by form, not hue', () => {
  it('draws the selected ring from text.primary, the only token measured above 14:1 in both modes', () => {
    const theme = { vars: { palette: { text: { primary: 'var(--text-primary)' } } } }
    const selected = selectedOption(theme)

    expect(selected.borderColor).toBe('text.primary')
    expect(selected.boxShadow).toBe('inset 0 0 0 1px var(--text-primary)')
    expect(selected.fontWeight).toBe(600)
  })

  it('keeps the ring inset so toggling never reflows the wrapped row', () => {
    const theme = { palette: { text: { primary: '#1c1c1c' } } }

    expect(selectedOption(theme).boxShadow).toMatch(/^inset /)
    expect(selectedOption(theme).borderWidth).toBeUndefined()
    expect(unselectedOption.boxShadow).toBe('none')
  })

  it('dims a blocked option without turning it into a color-only signal', () => {
    expect(blockedOption.opacity).toBe(0.5)
    expect(blockedOption.borderColor).toBe(unselectedOption.borderColor)
  })
})

describe('taxonomySelectorStyles — visuallyHidden', () => {
  it('hides text from the page without hiding it from the accessibility tree', () => {
    expect(visuallyHidden.clip).toBe('rect(0 0 0 0)')
    expect(visuallyHidden.width).toBe('1px')
    // `display: none` / `visibility: hidden` would remove it from the
    // accessible name, which is the entire point of the element.
    expect(visuallyHidden.display).toBeUndefined()
    expect(visuallyHidden.visibility).toBeUndefined()
  })
})
