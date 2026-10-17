/**
 * Undo and redo, fifty steps (PRD D3). Immutable: every helper returns a new
 * history. A snapshot is `{ nodes, links }`; the name and the viewport never
 * enter history.
 */
import { HISTORY_LIMIT } from './kinds'

export const createHistory = (limit = HISTORY_LIMIT) => ({ past: [], future: [], limit })

const snap = (board) => ({ nodes: board?.nodes ?? [], links: board?.links ?? [] })

/** Records the state before a change. A new change clears what could be redone. */
export const push = (history, snapshot) => ({
  ...history,
  past: [...history.past, snap(snapshot)].slice(-history.limit),
  future: []
})

export const canUndo = (history) => history.past.length > 0
export const canRedo = (history) => history.future.length > 0

/** The state to return to, and the history with `current` ready to be redone; null when there is none. */
export const undo = (history, current) => {
  if (!canUndo(history)) return null
  const snapshot = history.past[history.past.length - 1]
  return {
    history: { ...history, past: history.past.slice(0, -1), future: [snap(current), ...history.future] },
    snapshot
  }
}

export const redo = (history, current) => {
  if (!canRedo(history)) return null
  const [snapshot, ...future] = history.future
  return {
    history: { ...history, past: [...history.past, snap(current)].slice(-history.limit), future },
    snapshot
  }
}
