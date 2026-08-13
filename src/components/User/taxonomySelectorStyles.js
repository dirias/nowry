/**
 * Shared `sx` fragments for the taxonomy selectors (ONB-007).
 *
 * WHY SELECTION IS NOT A TINT
 *
 * The obvious Joy idiom for "this chip is on" is `variant='soft'`, which paints
 * `primary.softBg`. Measured against the surfaces those chips actually sit on,
 * across all seven accent presets `colorSchemeGenerator` ships:
 *
 *   primary.softBg vs background.surface (light) — 1.00:1 … 1.06:1
 *   primary.softBg vs background.surface (dark)  — 1.00:1 … 1.27:1
 *
 * A tint is not a weak signal here, it is no signal. The same measurement rules
 * out borders as the carrier too — `primary.outlinedBorder` reaches only
 * 1.10:1–1.94:1 against the light surface for six of the seven presets, and
 * Joy's `neutral.outlinedBorder` manages 1.38:1 (light) / 1.46:1 (dark). None of
 * those clear the 3:1 that WCAG 2.2 asks of a non-text indicator (NFR-003), and
 * NFR-004 forbids color carrying meaning on its own regardless.
 *
 * So selection is carried by a glyph and by fill inversion, both drawn in
 * `text.primary` — 16.19:1 on the light surface, 14.64:1 on the dark one, and
 * legible in grayscale. Border and weight changes ride along as reinforcement,
 * never as the message.
 */

import { focusRing, touchTarget } from '../Common/Form/formStyles'

/**
 * Off-screen but in the accessibility tree. Used for the explicit localized
 * selection/position text the architecture requires alongside `aria-pressed`,
 * which some screen reader and browser pairings still announce inconsistently.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  p: 0,
  m: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0
}

/**
 * The geometry every selectable option shares.
 *
 * `height: 'auto'` plus `whiteSpace: 'normal'` is what keeps NFR-010 honest:
 * Joy's `Button` is a fixed-height flex row by default, so a German or Japanese
 * label at 200% text zoom would otherwise overflow rather than wrap. Nothing
 * here clamps or ellipsises — an option the user cannot read is an option they
 * cannot choose.
 */
export const optionBase = {
  ...focusRing,
  ...touchTarget,
  height: 'auto',
  maxWidth: '100%',
  justifyContent: 'flex-start',
  textAlign: 'start',
  whiteSpace: 'normal',
  py: 1,
  px: 1.5,
  borderRadius: 'lg',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
}

/**
 * The selected ring. A second inset hairline in `text.primary` rather than a
 * thicker `border`, because growing the border from 1px to 2px reflows every
 * chip after it in the wrap — the row would visibly jump on each toggle.
 *
 * @param   {object} theme Joy theme, injected by `sx`'s callback form.
 * @returns {object}       `sx` fragment for the selected state.
 */
export const selectedOption = (theme) => ({
  borderColor: 'text.primary',
  boxShadow: `inset 0 0 0 1px ${theme.vars?.palette?.text?.primary ?? theme.palette.text.primary}`,
  fontWeight: 600
})

/** The resting state: a quiet hairline, no shadow, regular weight. */
export const unselectedOption = {
  borderColor: 'neutral.outlinedBorder',
  boxShadow: 'none',
  fontWeight: 400
}

/**
 * The house focus ring re-keyed for Joy's overlay `action` slot.
 *
 * An overlay radio puts the real `<input>` under an absolutely-positioned span
 * that covers the whole card, so `&:focus-visible` on the card never fires. The
 * tempting fix, `&:has(:focus-visible)` on the card, is worse than it looks:
 * nwsapi — the selector engine jsdom uses — cannot parse `:has()`, so every
 * `getByRole` query in the suite throws on `getComputedStyle` rather than on
 * anything to do with the component. Joy instead marks that action span with
 * `.Mui-focusVisible`, which is a plain class and universally parseable.
 */
export const overlayFocusRing = {
  '&.Mui-focusVisible': focusRing['&:focus-visible'],
  ...focusRing
}

/**
 * An option refused because the selection limit is reached. Dimmed, but still
 * focusable and still announced — `aria-disabled`, never `disabled`, so the
 * user can reach it and hear why it will not take (FR-017, NFR-001).
 */
export const blockedOption = {
  ...unselectedOption,
  opacity: 0.5,
  cursor: 'not-allowed'
}
