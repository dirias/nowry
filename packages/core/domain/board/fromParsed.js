/**
 * A parsed text → board nodes ready to add (PRD D9): fresh ids, laid out,
 * centred on the view, roots yellow and what grows from them green, frames
 * behind. And the check that keeps a board within its limits (PRD D10).
 */
import { MAX_LINKS, MAX_NODES } from './kinds'
import { layoutGraph, layoutTree } from './layout'
import { bounds, nextId } from './ops'

const HEADING_SIZES = { 1: 'xl', 2: 'lg' }

const boardNode = (node, { id, color, z }) => {
  const text = node.kind === 'text'
  return {
    id,
    kind: text ? 'text' : 'note',
    x: 0,
    y: 0,
    w: null,
    h: null,
    z,
    text: node.text ?? '',
    color: text ? null : color,
    size: text ? (HEADING_SIZES[node.level] ?? 'md') : null,
    title: null,
    ref: null,
    cardIds: []
  }
}

const offsetTo = (nodes, origin) => {
  const box = bounds(nodes)
  if (!box) return nodes
  const dx = Math.round(origin.x - (box.x + box.w / 2))
  const dy = Math.round(origin.y - (box.y + box.h / 2))
  return nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))
}

/** JSON Canvas comes positioned: new ids, the same arrangement, centred on the origin. */
const fromCanvas = (parsed, { origin, idPrefix }) => {
  const ids = new Map(parsed.nodes.map((n) => [n.id, nextId(n.kind === 'frame' ? 'f' : idPrefix)]))
  const nodes = parsed.nodes.map((n) => ({ ...n, id: ids.get(n.id) }))
  const links = parsed.links.map((l) => ({ id: nextId('l'), from: ids.get(l.from), to: ids.get(l.to), label: l.label ?? '' }))
  return { nodes: offsetTo(nodes, origin), links }
}

/**
 * @param {object} parsed  what `parseMermaid`, `parseOutline`, `parseLines` or `parseJsonCanvas` returned
 * @param {object} [options]  `{ origin: { x, y }, idPrefix, zBase }`; zBase is the board's top z, so what comes in lies above it
 * @returns {{ nodes: object[], links: object[] }}
 */
export const fromParsed = (parsed, { origin = { x: 0, y: 0 }, idPrefix = 'n', zBase = 0 } = {}) => {
  if (!parsed || parsed.error || !parsed.nodes?.length) return { nodes: [], links: [] }
  if (parsed.type === 'canvas') return fromCanvas(parsed, { origin, idPrefix })

  const ids = new Map(parsed.nodes.map((n) => [n.id, nextId(idPrefix)]))
  const frameIds = new Map((parsed.frames ?? []).map((f) => [f.id, nextId('f')]))
  const endOf = (id) => ids.get(id) ?? frameIds.get(id)
  const links = parsed.links
    .filter((l) => endOf(l.from) && endOf(l.to))
    .map((l) => ({ id: nextId('l'), from: endOf(l.from), to: endOf(l.to), label: l.label ?? '' }))
  const hasParent = new Set(links.map((l) => l.to))
  const nodes = parsed.nodes.map((n, i) => {
    const id = ids.get(n.id)
    return boardNode(n, { id, color: hasParent.has(id) ? 'green' : 'yellow', z: zBase + 1 + i })
  })
  const frames = (parsed.frames ?? []).map((f) => ({
    id: frameIds.get(f.id),
    title: f.title ?? '',
    members: (f.members ?? []).map((m) => ids.get(m)).filter(Boolean)
  }))

  // Links to a frame do not shape the layout; only node-to-node links do.
  const nodeLinks = links.filter((l) => !frameIds.has(l.from) && !frameIds.has(l.to))
  const nodeIdSet = new Set(nodes.map((n) => n.id))
  const layoutLinks = nodeLinks.filter((l) => nodeIdSet.has(l.from) && nodeIdSet.has(l.to))
  const laid =
    parsed.type === 'flowchart'
      ? layoutGraph({ nodes, links: layoutLinks, frames }, { direction: parsed.direction ?? 'LR' })
      : layoutTree({ nodes, links: layoutLinks, frames })

  const frameNodes = laid.frames.map((f) => ({
    id: f.id,
    kind: 'frame',
    x: f.x,
    y: f.y,
    w: f.w,
    h: f.h,
    z: -1,
    text: null,
    color: null,
    size: null,
    title: f.title,
    ref: null,
    cardIds: []
  }))
  const all = [...frameNodes, ...laid.nodes]
  return { nodes: offsetTo(all, origin), links }
}

/** Whether a board can take what is coming in: the totals after, against 500 nodes and 1,000 links. */
export const limitCheck = (board, incoming) => {
  const nodes = (board?.nodes?.length ?? 0) + (incoming?.nodes?.length ?? 0)
  const links = (board?.links?.length ?? 0) + (incoming?.links?.length ?? 0)
  return { ok: nodes <= MAX_NODES && links <= MAX_LINKS, nodes, links, maxNodes: MAX_NODES, maxLinks: MAX_LINKS }
}
