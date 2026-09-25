/**
 * What every drawn frame shares (ADR-035 §1).
 *
 * A frame is an illustration of a surface, built from the same tokens the
 * surface is built from, so it wears the visitor's mode and accent. It is
 * `aria-hidden`: the copy beside it carries the meaning. Numbers inside are
 * fixed sample content, never data.
 */

/** The outer window of a frame: a bordered surface on the page ground, radius `lg`. */
export const frameShell = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 'lg',
  border: '1px solid',
  borderColor: 'neutral.outlinedBorder',
  bgcolor: 'background.body',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}

/** A card inside a frame: a surface with a hairline, radius `md`. */
export const framePanel = {
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.surface'
}

/** The frame-sized measure: a 3px track on `level2`, the fill in the accent (§15.11). */
export const frameTrack = {
  height: 3,
  borderRadius: 'full',
  bgcolor: 'background.level2',
  overflow: 'hidden'
}

export const frameFill = (pct) => ({
  width: `${Math.min(100, Math.max(0, pct))}%`,
  height: '100%',
  borderRadius: 'full',
  bgcolor: 'primary.solidBg'
})

/** The solid readout chip the summary object carries ("Study · 30"). */
export const frameSolidChip = {
  px: 1,
  py: 0.5,
  borderRadius: 'sm',
  bgcolor: 'primary.solidBg',
  color: 'primary.solidColor',
  whiteSpace: 'nowrap'
}
