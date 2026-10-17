/**
 * Text out (PRD D9): a Markdown outline, a JSON Canvas file, plain text for
 * the clipboard. The board itself is never changed.
 */
import { nodesInFrame } from './ops'
import { layoutSize } from './kinds'

const CANVAS_COLORS = { yellow: '3', green: '4', blue: '5', pink: '1', grey: '#9e9e9e' }

/** An item's words: its title, else what the node carries. The caller may pass the live title. */
const defaultItemTitle = (node) => node.title ?? node.text ?? ''

/** What a node says, whatever its kind. */
export const nodeText = (node, { itemTitle = defaultItemTitle } = {}) => {
  if (node.kind === 'frame') return node.title ?? ''
  if (node.kind === 'item') return itemTitle(node) ?? ''
  return node.text ?? ''
}

const byPosition = (a, b) => a.y - b.y || a.x - b.x

const area = (node) => {
  const { w, h } = layoutSize(node)
  return w * h
}

/** Each node's frame: the smallest frame its centre lies in, among the frames given. */
const frameMembership = (board, frames) => {
  const owner = new Map()
  ;[...frames].sort((a, b) => area(b) - area(a)).forEach((frame) => nodesInFrame(board, frame.id).forEach((n) => owner.set(n.id, frame.id)))
  return owner
}

/**
 * The board (or `selection`, a list of ids) as a Markdown outline. Roots are
 * the nodes no link points to; each frame is a `## title` heading with its
 * members beneath; children follow links; a note's first line is its bullet
 * and its further lines sit indented under it. A node reached twice is
 * written once, so a cycle ends.
 */
export const toOutline = (board, { selection = null, untitled = 'Untitled', itemTitle } = {}) => {
  const chosen = selection ? new Set(selection) : null
  const all = board.nodes.filter((n) => !chosen || chosen.has(n.id))
  const frames = all.filter((n) => n.kind === 'frame').sort(byPosition)
  const nodes = all.filter((n) => n.kind !== 'frame')
  const ids = new Set(nodes.map((n) => n.id))
  const links = board.links.filter((l) => ids.has(l.from) && ids.has(l.to) && l.from !== l.to)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const hasParent = new Set(links.map((l) => l.to))
  const childrenOf = (id) =>
    links
      .filter((l) => l.from === id)
      .map((l) => byId.get(l.to))
      .sort(byPosition)
  const owner = frameMembership(board, frames)
  const visited = new Set()

  const write = (node, depth, out) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    const pad = '  '.repeat(depth)
    const [first, ...more] = nodeText(node, { itemTitle }).split('\n')
    out.push(`${pad}- ${first.trim()}`.trimEnd())
    more.filter((l) => l.trim()).forEach((l) => out.push(`${pad}  ${l.trim()}`))
    childrenOf(node.id).forEach((child) => write(child, depth + 1, out))
  }

  const sections = [null, ...frames].map((frame) => ({
    frame,
    members: nodes.filter((n) => (owner.get(n.id) ?? null) === (frame?.id ?? null)).sort(byPosition),
    lines: []
  }))
  // Roots first, across every section, so a node is written under its parent
  // wherever that parent is; then what no root reaches (a ring of notes),
  // each from its top-left note.
  sections.forEach((s) => s.members.filter((n) => !hasParent.has(n.id)).forEach((n) => write(n, 0, s.lines)))
  sections.forEach((s) => s.members.forEach((n) => write(n, 0, s.lines)))

  const out = []
  sections.forEach(({ frame, lines }) => {
    if (frame) {
      if (out.length) out.push('')
      out.push(`## ${nodeText(frame).trim() || untitled}`, '')
    }
    out.push(...lines)
  })
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}

/**
 * The board as a JSON Canvas file (https://jsoncanvas.org): notes and text as
 * text nodes, frames as groups with their title as label, items as text
 * with their kind before their title; edges carry no sides.
 */
export const toJsonCanvas = (board, { selection = null, itemTitle = defaultItemTitle } = {}) => {
  const chosen = selection ? new Set(selection) : null
  const nodes = board.nodes
    .filter((n) => !chosen || chosen.has(n.id))
    .sort((a, b) => ((a.kind === 'frame') === (b.kind === 'frame') ? (a.z ?? 0) - (b.z ?? 0) : a.kind === 'frame' ? -1 : 1))
  const ids = new Set(nodes.map((n) => n.id))
  const canvasNodes = nodes.map((n) => {
    const { w, h } = layoutSize(n)
    const base = { id: n.id, x: Math.round(n.x), y: Math.round(n.y), width: Math.round(w), height: Math.round(h) }
    if (n.kind === 'frame') return { ...base, type: 'group', ...(n.title ? { label: n.title } : {}) }
    if (n.kind === 'item') {
      const kind = n.ref?.kind ? `${n.ref.kind[0].toUpperCase()}${n.ref.kind.slice(1)}` : 'Item'
      return { ...base, type: 'text', text: `${kind}: ${itemTitle(n) ?? ''}` }
    }
    const color = n.kind === 'note' ? CANVAS_COLORS[n.color] : undefined
    return { ...base, type: 'text', text: n.text ?? '', ...(color ? { color } : {}) }
  })
  const edges = board.links
    .filter((l) => ids.has(l.from) && ids.has(l.to))
    .map((l) => ({ id: l.id, fromNode: l.from, toNode: l.to, ...(l.label ? { label: l.label } : {}) }))
  return JSON.stringify({ nodes: canvasNodes, edges }, null, 2)
}

/** Nodes as plain text for the clipboard: one per line, top to bottom. */
export const toPlainText = (nodes, { itemTitle } = {}) =>
  [...nodes]
    .sort(byPosition)
    .map((n) => nodeText(n, { itemTitle }).trim())
    .filter(Boolean)
    .join('\n')
