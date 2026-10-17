/**
 * Board edits for live items and cards (BOARD-005, BOARD-006). Pure, like
 * `@nowry/core/domain/board/ops`: each takes a board and returns a new one.
 */
import { DEFAULT_SIZES, insert } from '@nowry/core/domain/board'

const ITEM = DEFAULT_SIZES.item

const topZ = (board) => board.nodes.filter((n) => n.kind !== 'frame').reduce((z, n) => Math.max(z, n.z ?? 0), 0)

/** An item tile whose centre sits on `{ x, y }`; the title is kept for the day the item is gone. */
export const addItem = (board, { id, x, y, ref, title = '' }) =>
  insert(board, {
    nodes: [
      {
        id,
        kind: 'item',
        x: Math.round(x - ITEM.w / 2),
        y: Math.round(y - ITEM.h / 2),
        w: null,
        h: null,
        z: topZ(board) + 1,
        text: null,
        color: null,
        size: null,
        title,
        ref,
        cardIds: []
      }
    ]
  })

/**
 * Notes become the tiles of the tasks made from them (Make items): the same
 * node, so every link to it stays; its place and width stay, its text and
 * colour go. `made` is `[{ nodeId, taskId, title }]`.
 */
export const notesToItems = (board, made) => {
  const byNode = new Map(made.map((m) => [m.nodeId, m]))
  let changed = false
  const nodes = board.nodes.map((node) => {
    const m = byNode.get(node.id)
    if (!m || node.kind !== 'note') return node
    changed = true
    return {
      ...node,
      kind: 'item',
      w: node.w ?? DEFAULT_SIZES.note.w,
      h: null,
      text: null,
      color: null,
      size: null,
      title: m.title,
      ref: { kind: 'task', id: m.taskId, goalId: null }
    }
  })
  return changed ? { ...board, nodes } : null
}

/** Each note gains the cards made from it (Make cards). `made` is `[{ nodeId, cardId }]`. */
export const addCardIds = (board, made) => {
  const byNode = new Map()
  made.forEach(({ nodeId, cardId }) => {
    if (!nodeId || !cardId) return
    byNode.set(nodeId, [...(byNode.get(nodeId) ?? []), cardId])
  })
  let changed = false
  const nodes = board.nodes.map((node) => {
    const add = byNode.get(node.id)
    if (!add) return node
    const next = [...(node.cardIds ?? [])]
    add.forEach((cardId) => {
      if (!next.includes(cardId)) next.push(cardId)
    })
    changed = true
    return { ...node, cardIds: next }
  })
  return changed ? { ...board, nodes } : null
}
