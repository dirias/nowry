/**
 * Shared `sx` fragments for the goal feature.
 *
 * Both of these were copy-pasted across the goal surfaces — `focusRing` in four
 * places (GoalsTabView, GoalNextAction, GoalDetailDrawer, and inline in
 * GoalMilestoneStepper), `oneLine` in one. A focus ring that drifts between
 * surfaces is an accessibility bug that only shows up on the surface nobody
 * re-checked, so there is exactly one definition now.
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
