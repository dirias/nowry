import { NOTE_COLORS } from '@nowry/core/domain/board'

/**
 * A note's five colours (PRD D2) on the theme's sticky palette. The palette
 * keeps its historical ids, so the board's `grey` is the palette's `slate`.
 * Every value is a CSS variable, so a note follows light and dark with no
 * code of its own.
 */
const PALETTE_ID = { yellow: 'yellow', green: 'green', blue: 'blue', pink: 'pink', grey: 'slate' }

export const BOARD_NOTE_COLORS = NOTE_COLORS

/** `part` is `bg` (the tint), `border` (the dot) or `text` (the ink drawn on the tint). */
export const noteVar = (color, part = 'bg') => `var(--joy-palette-stickyNote-${PALETTE_ID[color] ?? 'yellow'}-${part})`
