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
export const formLabel = { fontWeight: 600 }

// The horizontal rhythm shared by a sheet's header, body, banner and footer.
// Declared once so the four regions cannot drift out of alignment — the defect
// is invisible until a banner appears and its left edge misses the body's.
export const sheetInlinePadding = { xs: 2, sm: 3, md: 4 }

// ≥44px at `xs` per WCAG 2.5.5 / UX-CONTRACT §4.7; the compact `sm`+ size is
// the pointer-device affordance. Shared by rail chips, tag chips and row
// controls so "touch target" means one number, not five.
export const touchTarget = { minHeight: { xs: 44, sm: 32 } }
