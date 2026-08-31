import { TOUCH_TARGET, FONT_WEIGHT } from '../../../theme/tokens'

/**
 * Shared `sx` fragments for every form surface in the app.
 *
 * These began life in `AnnualPlanning/goal/goalStyles.js`, which existed because
 * `focusRing` had been copy-pasted into four files and a focus ring that drifts
 * between surfaces is an accessibility bug that only shows up on the surface
 * nobody re-checked. Now that seven surfaces share one form system, the
 * definition lives here and `goalStyles.js` re-exports it — one definition,
 * pointing the right way round, with none of its thirteen importers touched
 * (UX-CONTRACT §7.4).
 */

// The house focus ring. Never rely on the browser default — Joy resets it.
export const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

// Clamp text to a single line and ellipsise. German and Spanish run roughly 30%
// longer than the English source; without this, one-line contracts (ladder
// rungs, milestone titles) wrap and shift everything below them by a row.
export const oneLine = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}

// Every form label in the system. The goal pass set `fontWeight: 600` inline at
// six call sites; a label weight repeated per-field is a constant wearing a
// prop. The field wrappers (§5.4) apply this so surfaces never restate it.
// Sourced from FONT_WEIGHT.lg (600) rather than the literal, now that
// tokens.js is the app's single source of truth for the weight scale — this
// file routes every other surface through it, so it should too.
export const formLabel = { fontWeight: FONT_WEIGHT.lg }

// The horizontal rhythm shared by a sheet's header, body, banner and footer.
// Declared once so the four regions cannot drift out of alignment — the defect
// is invisible until a banner appears and its left edge misses the body's.
export const sheetInlinePadding = { xs: 2, sm: 3, md: 4 }

// ≥44px at `xs` per WCAG 2.5.5; the number itself now comes from
// `TOUCH_TARGET` in theme/tokens.js so the minimum is stated once for the whole
// app rather than hand-typed here and at 26 other sites. The compact `sm`+ size
// is the pointer-device affordance and stays local — it is a layout choice, not
// an accessibility minimum. Shared by rail chips, tag chips and row controls so
// "touch target" means one number, not five.
export const touchTarget = { minHeight: { xs: TOUCH_TARGET, sm: 32 } }

// The two-dimensional version, for square controls — icon buttons, menu
// buttons, canvas handles. WCAG 2.5.5 is a 44x44 AREA, so a control that is
// 44px tall and 28px wide still fails it; `touchTarget` alone only ever fixed
// half the box. Use this wherever the control has no text to give it width.
export const touchTargetBox = {
  minWidth: { xs: TOUCH_TARGET, sm: 32 },
  minHeight: { xs: TOUCH_TARGET, sm: 32 }
}

// Fixed-width digits, for values that update in place: streaks, counters,
// review intervals, timers. Without it, a countdown re-lays out on every tick
// as digit widths change and the surrounding row twitches.
//
// The theme already applies this to h1–h4 and display-*, where headline numbers
// live. This fragment is the opt-in for everything below heading level, which
// is deliberately left proportional because proportional figures read better in
// prose.
export const tabularNums = { fontVariantNumeric: 'tabular-nums' }

// The reading serif's ONLY entry point. `fontFamily: 'reading'` resolves to
// FONT_FAMILY.reading (Literata) and `lineHeight: 'xl'` (1.66667) gives
// long-form prose the extra leading it wants.
//
// Apply this to long-form prose only — book pages, editor preview, card
// front/back — and never below 1rem, and never to UI chrome. A serif at 14px on
// a low-DPI Android reads worse than Inter, and that is the specific way this
// choice fails. The three surfaces that may use it are also the three that
// import the font (see Books/Page, Books/Editor, Cards/StudySession).
export const readingSurface = { fontFamily: 'reading', lineHeight: 'xl' }

/**
 * The container of a segmented control — two or more controls of the SAME class
 * fused into one object, split by a hairline (DESIGN_GUIDELINES §15.2).
 *
 * The rule it exists to serve: the eye reads *same shape ⇒ same class of
 * thing*, so filters over one list belong in one container rather than beside
 * each other as loose chips. Two chips assert no relationship; a container with
 * a divider says "these are the same kind of control" without a word of copy.
 *
 * Lives here rather than in either of its call sites because it now governs two
 * unrelated surfaces — the study session's Browse filters and the Public
 * Library's toolbar — and a grammar that drifts between surfaces is exactly the
 * defect `focusRing` moved here to prevent.
 */
export const segmentedGroup = {
  display: 'flex',
  alignItems: 'stretch',
  borderRadius: 'md',
  borderColor: 'divider',
  bgcolor: 'background.level1',
  overflow: 'hidden'
}

/**
 * One segment of a {@link segmentedGroup}.
 *
 * State is a GROUND, never a hue (§15.5): `background.level2` means engaged, so
 * hover moves the label and leaves the ground alone — a hover that borrowed the
 * ground would impersonate the state. The hover grounds are pinned through
 * Joy's own variant variables rather than an `&:hover` override, which loses to
 * Joy's specificity.
 *
 * `radius.xs` rather than a raw 0: the container clips with `overflow: hidden`,
 * so the segments only need to stop being pills, and a raw radius is forbidden
 * by lint.
 *
 * @param {boolean} active - whether this segment is engaged
 * @param {boolean} first - whether it is the first, and so needs no divider
 */
export const segment = (active, first) => ({
  borderRadius: 'xs',
  borderLeft: first ? 0 : '1px solid',
  borderColor: 'divider',
  minHeight: { xs: TOUCH_TARGET, sm: 36 },
  px: 1.5,
  fontSize: 'sm',
  fontWeight: 'md',
  whiteSpace: 'nowrap',
  bgcolor: active ? 'background.level2' : 'transparent',
  color: active ? 'text.primary' : 'text.secondary',
  '--variant-plainHoverBg': active ? 'var(--joy-palette-background-level2)' : 'transparent',
  '--variant-plainActiveBg': active ? 'var(--joy-palette-background-level2)' : 'transparent',
  '&:hover': { color: 'text.primary' },
  ...focusRing,
  // The ring is INSET here, and only here. The group clips with
  // `overflow: hidden`, so the shared +2 offset would be cropped away on every
  // segment — a focus indicator that exists in the stylesheet and not on the
  // screen. Same colour, same width; only the offset changes.
  '&:focus-visible': { ...focusRing['&:focus-visible'], outlineOffset: '-2px' }
})
