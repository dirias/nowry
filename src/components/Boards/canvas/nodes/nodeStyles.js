/**
 * What every node on the board shares: the selection ring, the way a new one
 * arrives, and the editor's plain ground. `sx` fragments only.
 */

/** The selected ring: the accent, outside the node, so the tint stays the tint. */
export const selectedRing = (selected) => ({
  outline: selected ? '2px solid' : 'none',
  outlineColor: 'primary.solidBg',
  outlineOffset: '3px'
})

/**
 * A new note scales in from 96% over the quick duration on the standard curve
 * (MOTION.md §2, Grammar board). Under reduced motion it is simply there (§4).
 */
export const appear = {
  '@keyframes boardNodeIn': {
    from: { transform: 'scale(0.96)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 }
  },
  animation: 'boardNodeIn var(--nowry-motion-quick) var(--nowry-motion-standard)',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
}

/** Joy's textarea with nothing of its own: the node's type, the node's ink, no ground, no ring. */
export const plainEditor = {
  font: 'inherit',
  color: 'inherit',
  bgcolor: 'transparent',
  border: 0,
  boxShadow: 'none',
  p: 0,
  minHeight: 0,
  '--Textarea-focusedThickness': '0px',
  '--Textarea-paddingInline': '0px',
  '--Textarea-paddingBlock': '0px',
  '&::before': { display: 'none' },
  '& textarea': { font: 'inherit', color: 'inherit' },
  '& textarea::placeholder': { color: 'text.tertiary', opacity: 1 }
}

/** Long words wrap inside the node instead of running out of it. */
export const wrapText = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'inherit' }
