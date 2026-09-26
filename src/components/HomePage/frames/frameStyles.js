/**
 * What every drawn frame shares (ADR-035 §1, SITE-014).
 *
 * A frame is an illustration of a surface, built beside the surface's own
 * component from the same tokens, so it wears the visitor's mode and accent
 * and matches the page element for element. It is `aria-hidden`: the copy
 * beside it carries the meaning. Numbers inside are fixed sample content.
 */

/** The outer window of a frame: a bordered ground, radius `lg`. */
export const frameShell = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 'lg',
  border: '1px solid',
  borderColor: 'neutral.outlinedBorder',
  bgcolor: 'background.body',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  // Sized by content (SITE-014 fix): a locale's longer copy makes the frame taller, never clipped.
  height: 'auto'
}

/** A surface inside a frame, radius `md`. */
export const framePanel = {
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.surface'
}

/** The row-sized measure (formStyles.measureTrack at frame scale): 3px on `level2`, the fill in the accent. */
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

/** The house button's two tones at frame scale: the one solid key, and a soft neutral secondary. */
export const frameSolidChip = {
  px: 1,
  py: 0.5,
  borderRadius: 'sm',
  bgcolor: 'primary.solidBg',
  color: 'primary.solidColor',
  whiteSpace: 'nowrap',
  boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-primary-solidActiveBg)'
}

export const frameSoftChip = {
  px: 1,
  py: 0.5,
  borderRadius: 'sm',
  bgcolor: 'background.level1',
  color: 'text.secondary',
  whiteSpace: 'nowrap',
  boxShadow: 'inset 0 -2px 0 0 var(--joy-palette-neutral-outlinedBorder)'
}

/** The segmented group (formStyles.segmentedGroup / segment) at frame scale. */
export const frameSegment = {
  display: 'inline-flex',
  borderRadius: 'md',
  bgcolor: 'background.level1',
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden'
}

export const frameSegmentItem = (active, first) => ({
  px: 1,
  py: 0.5,
  borderLeft: first ? 0 : '1px solid',
  borderColor: 'divider',
  bgcolor: active ? 'background.level2' : 'transparent',
  color: active ? 'text.primary' : 'text.secondary',
  fontWeight: 'md',
  whiteSpace: 'nowrap'
})
