import { useCallback, useRef } from 'react'

/** The single-letter tools (PRD D3). `I` opens the item picker (BOARD-005). */
export const TOOL_KEYS = { v: 'select', h: 'hand', n: 'note', t: 'text', f: 'frame', i: 'item' }

/** One press of an arrow moves 10, with Shift 50. */
export const NUDGE = { step: 10, far: 50 }

const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

/**
 * Keys belong to whatever has focus when that is a field, a menu, a dialog or
 * a button: the canvas never takes a key from them.
 */
export const isOwnedTarget = (target) => {
  if (!target || typeof target.closest !== 'function') return false
  if (target.isContentEditable) return true
  return Boolean(
    target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="menu"], [role="dialog"], [role="listbox"]')
  )
}

/**
 * What a key press means on the board (PRD D3), or null. Pure, so every key
 * in the grammar is tested without a canvas.
 *
 * @param {KeyboardEvent} event
 * @param {{ single: object|null, count: number }} state `single` is the one
 *   selected node, if exactly one is; `count` is how many things are selected.
 */
export const boardKeyAction = (event, { single = null, count = 0 } = {}) => {
  const { key } = event
  const mod = event.metaKey || event.ctrlKey
  if (mod) {
    const lower = key.toLowerCase()
    if (lower === 'z') return { type: event.shiftKey ? 'redo' : 'undo' }
    if (lower === 'y' && event.ctrlKey && !event.metaKey) return { type: 'redo' }
    if (lower === 'a') return { type: 'selectAll' }
    if (lower === 'd') return count ? { type: 'duplicate' } : null
    if (lower === 'g') return count ? { type: 'frameSelection' } : null
    if (key === '=' || key === '+') return { type: 'zoomIn' }
    if (key === '-' || key === '_') return { type: 'zoomOut' }
    if (key === 'Enter') return single?.kind === 'note' ? { type: 'sibling' } : null
    return null
  }
  if (event.altKey) return null
  if (event.shiftKey && event.code === 'Digit1') return { type: 'fitBoard' }
  if (event.shiftKey && event.code === 'Digit2') return { type: 'fitSelection' }
  if (key === 'Escape') return { type: 'escape' }
  if (key === 'Delete' || key === 'Backspace') return count ? { type: 'remove' } : null
  if (ARROWS[key]) {
    if (!count) return null
    const [x, y] = ARROWS[key]
    const by = event.shiftKey ? NUDGE.far : NUDGE.step
    return { type: 'nudge', dx: x * by, dy: y * by }
  }
  if (key === 'Tab') return single?.kind === 'note' && !event.shiftKey ? { type: 'child' } : null
  if (key === 'Enter') return single && ['note', 'text', 'frame'].includes(single.kind) ? { type: 'edit' } : null
  // Select and type: a printable key on the one selected note starts editing with it.
  const typeable = single && (single.kind === 'note' || single.kind === 'text')
  if (typeable && key.length === 1 && key !== ' ') return { type: 'type', char: key }
  if (key === '?') return { type: 'keys' }
  const tool = TOOL_KEYS[key.toLowerCase()]
  return tool ? { type: 'tool', tool } : null
}

/**
 * The board's keys, as one `onKeyDown` for the canvas container (never the
 * window): it fires only while focus is on the canvas, and never while a node
 * is being edited (the editor stops its own keys) or a field, menu or dialog
 * has focus. `getState` and `actions` are read at press time, so the handler
 * is stable.
 */
export default function useBoardKeys(getState, actions) {
  const latest = useRef({ getState, actions })
  latest.current = { getState, actions }

  return useCallback((event) => {
    if (event.defaultPrevented || isOwnedTarget(event.target)) return
    const { getState: read, actions: act } = latest.current
    const state = read()
    if (state.editing) return
    const action = boardKeyAction(event, state)
    if (!action) return
    const run = act[action.type]
    if (!run) return
    event.preventDefault()
    run(action)
  }, [])
}
