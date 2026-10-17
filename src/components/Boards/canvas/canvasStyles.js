/**
 * The library's parts in the house's tokens: one `sx` block on the canvas
 * container, reaching the classes `@xyflow/react` renders. No stylesheet of
 * our own; the library's own `style.css` stays as its baseline.
 */
const PLUS_OFFSET = -13

export const canvasSx = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  isolation: 'isolate',
  bgcolor: 'background.level1',
  outline: 'none',
  '& .react-flow': {
    '--xy-background-color': 'var(--joy-palette-background-level1)',
    '--xy-selection-background-color': 'var(--joy-palette-primary-softBg)',
    '--xy-selection-border': '1px solid var(--joy-palette-primary-outlinedBorder)',
    '--xy-edge-stroke': 'var(--joy-palette-text-tertiary)',
    '--xy-connectionline-stroke': 'var(--joy-palette-primary-solidBg)',
    '--xy-resize-background-color': 'var(--joy-palette-primary-solidBg)'
  },
  // The box xyflow draws round a box-selection would sit over the notes and
  // take their clicks; a dragged selection moves with any of its nodes anyway.
  '& .react-flow__nodesselection-rect': { display: 'none' },
  // A frame's body is empty canvas: only its title and resize handles take the pointer.
  '& .react-flow__node-frame': { pointerEvents: 'none !important' },
  '& .react-flow__node-frame .board-frame-title, & .react-flow__node-frame .react-flow__resize-control': { pointerEvents: 'all' },

  // Handles: hidden at rest, accent dots on hover and on the selection.
  '& .react-flow__handle': {
    opacity: 0,
    transition: 'opacity var(--nowry-motion-quick) var(--nowry-motion-standard)'
  },
  '& .react-flow__handle.board-handle': {
    width: 10,
    height: 10,
    minWidth: 0,
    minHeight: 0,
    bgcolor: 'primary.solidBg',
    border: '2px solid',
    borderColor: 'background.surface',
    borderRadius: 'full'
  },
  '& .react-flow__node:hover .board-handle, & .react-flow__node.selected .board-handle, & .react-flow__handle.connectingto': { opacity: 1 },
  '& .react-flow__handle.board-handle-off': { opacity: 0, pointerEvents: 'none' },

  // The four "+" on the single selected note.
  '& .react-flow__handle.board-plus': {
    opacity: 1,
    width: 22,
    height: 22,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'background.surface',
    color: 'primary.solidBg',
    border: '1.5px solid',
    borderColor: 'primary.solidBg',
    borderRadius: 'full',
    boxShadow: 'sm',
    cursor: 'pointer',
    '& svg': { width: 16, height: 16, pointerEvents: 'none' },
    '&:hover': { bgcolor: 'primary.softBg' }
  },
  '& .react-flow__handle-top.board-plus': { top: PLUS_OFFSET },
  '& .react-flow__handle-bottom.board-plus': { bottom: PLUS_OFFSET, top: 'auto' },
  '& .react-flow__handle-left.board-plus': { left: PLUS_OFFSET },
  '& .react-flow__handle-right.board-plus': { right: PLUS_OFFSET, left: 'auto' },

  // Resize: small square handles in the accent; the selection ring is the line.
  '& .react-flow__resize-control.board-resize-handle': {
    width: 8,
    height: 8,
    bgcolor: 'background.surface',
    border: '1.5px solid',
    borderColor: 'primary.solidBg',
    borderRadius: 'xs'
  },
  '& .react-flow__resize-control.board-resize-line': { borderColor: 'transparent' },

  '@media (prefers-reduced-motion: reduce)': {
    '& .react-flow__handle': { transition: 'none' }
  }
}

/** The quiet two lines under a new board's first note (D1). */
export const hintSx = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 24,
  px: 2,
  textAlign: 'center',
  pointerEvents: 'none',
  zIndex: 'floating'
}
