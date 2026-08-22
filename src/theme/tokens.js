/**
 * Nowry's design tokens — the single source of truth for every non-colour
 * dimension of the design system.
 *
 * This module has ZERO imports on purpose. It must be loadable by a test with
 * no React and no Joy in scope, so that the scales can be asserted on directly
 * rather than only through a rendered tree.
 *
 * Colour is NOT here. It is generated per-user from the chosen theme colour by
 * `colorSchemeGenerator.js` and merged in `DynamicThemeProvider`; those two
 * files remain the source of truth for palette.
 *
 * BACKWARD COMPATIBILITY: this ticket adds scales, it does not remove any. The
 * ~569 raw `fontSize` and ~254 raw `fontWeight` overrides already in the app
 * keep working unchanged — Joy resolves a raw value the same way it always did.
 * Migrating those call sites is a separate pass.
 */

// ---------------------------------------------------------------------------
// FONT FAMILY
// ---------------------------------------------------------------------------

/**
 * The system stack. This is a real Joy scale key (`fontFamily-fallback`), and
 * `body` / `display` reference it via `getCssVar('fontFamily-fallback')`, which
 * is exactly what makes deleting the `body { font-family: … }` rule from
 * index.css a zero-risk change: before Inter finishes loading, the rendered
 * stack is functionally identical to what index.css was declaring.
 *
 * (index.css also listed Oxygen / Ubuntu / Cantarell / Fira Sans / Droid Sans.
 * No target device reaches those before matching an earlier entry, so their
 * absence is unobservable.)
 */
const fallback =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'

export const FONT_FAMILY = {
  fallback,

  // The UI face. Self-hosted variable Inter — see public/fonts + index.html.
  body: `'Inter Variable', ${fallback}`,

  // Deliberately the SAME face as `body` today. It exists as a separate token
  // so a display face can be introduced post-launch by editing this one line,
  // instead of hunting every heading in the app.
  display: `'Inter Variable', ${fallback}`,

  // Long-form prose only — book pages, editor preview, card front/back. Loaded
  // lazily from the reading surfaces themselves, never on the critical path.
  // Applied exclusively through the `readingSurface` fragment in formStyles.js.
  reading: `'Literata Variable', Georgia, 'Times New Roman', serif`,

  code: `'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`
}

// ---------------------------------------------------------------------------
// FLUID TYPE — the derivation, so future tokens are computed and not guessed
// ---------------------------------------------------------------------------

/**
 * Viewport anchors for every fluid value below: 360px (small phone) to 1200px
 * (laptop). Below 360 the clamp holds at its minimum; above 1200 it holds at
 * its maximum.
 */
export const FLUID_MIN_VW = 360
export const FLUID_MAX_VW = 1200

/**
 * Derivation for `clamp(min, intercept + slope·vw, max)`, with 1rem = 16px:
 *
 *   range   = (FLUID_MAX_VW - FLUID_MIN_VW) / 16   = 52.5rem
 *   slopeVw = (maxRem - minRem) / range * 100      → the vw coefficient
 *   intercept (rem) = minRem - (maxRem - minRem) / range * (FLUID_MIN_VW / 16)
 *
 * Worked example, xl4 (28px → 36px, i.e. 1.75rem → 2.25rem):
 *   slopeVw   = (2.25 - 1.75) / 52.5 * 100 = 0.952… → 0.95vw
 *   intercept = 1.75 - (0.5 / 52.5) * 22.5 = 1.535… → 1.536rem
 *   ⇒ clamp(1.75rem, 1.536rem + 0.95vw, 2.25rem)
 *
 * NEVER express the middle term as bare `vw`. A bare-vw clamp ignores the root
 * font size entirely, so a user at 200% text zoom gets no increase at all —
 * a direct WCAG 1.4.4 failure. The `rem +` half is what keeps zoom working.
 */

// ---------------------------------------------------------------------------
// FONT SIZE — mobile-first: the phone is the base and the scale grows UPWARD
// ---------------------------------------------------------------------------

/**
 * xs–xl are STATIC, and that is a decision rather than an omission:
 *
 *  - `md` (1rem) is the size Joy gives Input and Textarea. Anything fluid there
 *    renders below 16px on a phone, and iOS Safari auto-zooms the page on every
 *    focus of a sub-16px field.
 *  - Joy's Button / Chip / Input geometry is derived from xs–xl. Fluid values
 *    there produce fluid control heights, which breaks both the 4px grid and
 *    the 44px touch-target arithmetic.
 *
 * xl2 and above are used by headings only, so fluidity there is contained to
 * type and cannot leak into component sizing.
 */
export const FONT_SIZE = {
  xs: '0.75rem', //  12px — body-xs. Static: the legibility floor.
  sm: '0.875rem', // 14px — body-sm, title-sm.
  md: '1rem', //     16px — body-md, title-md. Static: the iOS input floor.
  lg: '1.125rem', // 18px — body-lg, title-lg.
  xl: '1.25rem', //  20px — h4.

  xl2: 'clamp(1.25rem, 1.143rem + 0.48vw, 1.5rem)', //   20 → 24px — h3
  xl3: 'clamp(1.5rem, 1.339rem + 0.71vw, 1.875rem)', //  24 → 30px — h2
  xl4: 'clamp(1.75rem, 1.536rem + 0.95vw, 2.25rem)', //  28 → 36px — h1
  xl5: 'clamp(2.25rem, 1.929rem + 1.43vw, 3rem)', //     36 → 48px — display-md
  xl6: 'clamp(2.5rem, 1.857rem + 2.86vw, 4rem)' //       40 → 64px — display-lg
}

// ---------------------------------------------------------------------------
// FONT WEIGHT — four steps, and every weight literal in the app lands on one
// ---------------------------------------------------------------------------

/**
 * The four steps absorb all 254 raw weight literals currently in `src`:
 *   sm ← 400 (×6), 'normal' (×2)
 *   md ← 500 (×38), 'md' (×2)
 *   lg ← 600 (×135)
 *   xl ← 700 (×46), 'bold' (×13), 800 (×11), 'xl' (×1)
 *
 * `sm` is 400, NOT Joy's default of 300. Two reasons, and the second is the
 * real one: we have six literal 400s that would otherwise have nowhere to land,
 * and 300 is a weight this app has never used. Today's system fonts mostly
 * synthesise 300 back to 400, but Inter Variable covers 100–900 and would
 * render it as genuine Light — so keeping 300 would make a weight appear on
 * screen that has never appeared before.
 *
 * Folding 800 into 700 at eleven sites is an intentional, small reduction in
 * visual weight rather than an accident.
 */
export const FONT_WEIGHT = {
  sm: 400,
  md: 500,
  lg: 600,
  xl: 700
}

// ---------------------------------------------------------------------------
// LINE HEIGHT — Joy's values, verbatim. A deliberate non-change.
// ---------------------------------------------------------------------------

/**
 * Recorded here so the decision is not relitigated every time someone opens the
 * theme: 1.5 for body is correct for a reading app, and the reading surfaces
 * that want more air take `xl` (1.66667) through the `readingSurface` fragment.
 * There is no defect behind changing these, so they are not changed.
 */
export const LINE_HEIGHT = {
  xs: '1.33334',
  sm: '1.42858',
  md: '1.5',
  lg: '1.55556',
  xl: '1.66667'
}

// ---------------------------------------------------------------------------
// LETTER SPACING — new; not a Joy scale key, applied inside theme.typography
// ---------------------------------------------------------------------------

/**
 * Joy applies a blanket -0.025em to h1–h4. That was tuned for its default
 * stack; Inter has narrower sidebearings, so -0.02em is the correction — the
 * larger negative value makes Inter headings look cramped.
 *
 * These four values replace 31 ad-hoc `letterSpacing` overrides scattered
 * across components.
 */
export const LETTER_SPACING = {
  display: '-0.02em', // h1, h2, display-lg, display-md
  heading: '-0.01em', // h3, h4
  normal: '0', //        every title-* and body-* level
  wide: '0.04em' //      ALL-CAPS badges ONLY, per DESIGN_GUIDELINES §4.4
}

// ---------------------------------------------------------------------------
// RADIUS — Joy's five, verbatim, plus one addition
// ---------------------------------------------------------------------------

/**
 * The five existing steps are unchanged. Regridding xs 2→4 and sm 6→8 would be
 * a taste change with a 193-site blast radius and no defect behind it; all 440
 * call sites use them correctly today.
 *
 * `full` is new and fixes a live bug. Four components already write
 * `borderRadius: 'full'` (StudySession, ImportDeckModal ×2, QuarterReportDetail).
 * Joy has no such token, so those emit invalid CSS and render SQUARE in
 * production right now. Defining the token repairs them where they stand,
 * without touching a call site.
 */
export const RADIUS = {
  xs: '2px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px'
}

// ---------------------------------------------------------------------------
// SPACING
// ---------------------------------------------------------------------------

/**
 * 8px base. This is already Joy's default, so setting it explicitly in the
 * theme changes nothing today — which is the entire point. Without it written
 * down, a future "let's move to a 4px base" edit would silently halve every gap
 * across roughly 600 uses, with no build error and no failing test.
 */
export const SPACING_BASE = 8

/**
 * Reference only — the `sx` scale as documented in DESIGN_GUIDELINES §3.1.
 * Exported so documentation can be generated from the tokens rather than
 * transcribed alongside them and left to drift.
 */
export const SPACING_SCALE = {
  0.5: 4,
  1: 8,
  1.5: 12,
  2: 16,
  3: 24,
  4: 32,
  6: 48,
  8: 64
}

// ---------------------------------------------------------------------------
// LAYOUT MINIMUMS
// ---------------------------------------------------------------------------

/**
 * WCAG 2.5.5 minimum touch target, in px. Replaces 26 hand-typed 44s and, at
 * four sites, an illegal 28.
 *
 * This is the NUMBER ONLY. The composed `sx` fragment lives in
 * `components/Common/Form/formStyles.js` as `touchTarget`, which already has
 * 13+ importers and correctly relaxes to 32 at `sm`+ for pointer devices.
 * Do not add a competing fragment here — one touch target, one definition.
 */
export const TOUCH_TARGET = 44

/**
 * The smallest type allowed on a handheld: 12px. Identical to `FONT_SIZE.xs`,
 * and not by coincidence — xs IS the floor. The test asserts every static size
 * and every fluid clamp MINIMUM sits at or above this.
 */
export const MIN_FONT_SIZE = '0.75rem'
