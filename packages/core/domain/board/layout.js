/**
 * Automatic layout for what comes in from outside (PRD D9): a layered layout
 * for flowcharts and a tidy tree for mind maps and outlines. Both return the
 * nodes with `x`/`y` set and the frames sized around their members, the
 * whole centred on (0, 0); the caller moves it to the view.
 *
 * Input nodes need an `id` and a kind (for their size); frames are
 * `{ id, title, members: [id] }`. Positions are top-left corners.
 */
import { DEFAULT_SIZES, FRAME_PADDING, FRAME_TITLE_BAND, layoutSize } from './kinds'

const DEFAULT_FRAME = DEFAULT_SIZES.frame

/** Every node's frame (the innermost one that lists it). */
const frameOf = (frames = []) => {
  const map = new Map()
  frames.forEach((f) => (f.members ?? []).forEach((id) => map.set(id, f.id)))
  return map
}

/** Edges among known nodes, without self-loops and with the back edges of cycles dropped. */
const acyclicEdges = (ids, links) => {
  const known = new Set(ids)
  const out = new Map(ids.map((id) => [id, []]))
  const indegree = new Map(ids.map((id) => [id, 0]))
  links.forEach((l) => {
    if (!known.has(l.from) || !known.has(l.to) || l.from === l.to) return
    out.get(l.from).push(l.to)
    indegree.set(l.to, indegree.get(l.to) + 1)
  })
  const state = new Map()
  const kept = []
  const visit = (start) => {
    // Iterative DFS: a board can hold 500 nodes in one chain.
    const stack = [[start, 0]]
    state.set(start, 'open')
    while (stack.length) {
      const top = stack[stack.length - 1]
      const [id, i] = top
      const targets = out.get(id)
      if (i >= targets.length) {
        state.set(id, 'done')
        stack.pop()
        continue
      }
      top[1] += 1
      const to = targets[i]
      if (state.get(to) === 'open') continue // a back edge: ignored
      kept.push([id, to])
      if (!state.has(to)) {
        state.set(to, 'open')
        stack.push([to, 0])
      }
    }
  }
  ids.filter((id) => indegree.get(id) === 0).forEach((id) => !state.has(id) && visit(id))
  ids.forEach((id) => !state.has(id) && visit(id))
  return kept
}

/** Longest path from the roots: a node sits one layer past its deepest parent. */
const assignLayers = (ids, edges) => {
  const parents = new Map(ids.map((id) => [id, []]))
  const children = new Map(ids.map((id) => [id, []]))
  edges.forEach(([from, to]) => {
    parents.get(to).push(from)
    children.get(from).push(to)
  })
  const layer = new Map()
  const pending = new Map(ids.map((id) => [id, parents.get(id).length]))
  const queue = ids.filter((id) => pending.get(id) === 0)
  queue.forEach((id) => layer.set(id, 0))
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i]
    children.get(id).forEach((child) => {
      layer.set(child, Math.max(layer.get(child) ?? 0, layer.get(id) + 1))
      pending.set(child, pending.get(child) - 1)
      if (pending.get(child) === 0) queue.push(child)
    })
  }
  return { layer, parents, children }
}

const barycentre = (neighbours, position, fallback) =>
  neighbours.length ? neighbours.reduce((sum, id) => sum + position.get(id), 0) / neighbours.length : fallback

/** Orders each layer by the mean position of its neighbours in the layer before, sweeping down, up and down again. */
const orderLayers = (layers, parents, children) => {
  const position = new Map()
  layers.forEach((layer) => layer.forEach((id, i) => position.set(id, i)))
  const sortLayer = (layer, neighboursOf) => {
    const key = new Map(layer.map((id, i) => [id, barycentre(neighboursOf(id), position, i)]))
    const sorted = [...layer].sort((a, b) => key.get(a) - key.get(b))
    sorted.forEach((id, i) => position.set(id, i))
    return sorted
  }
  let ordered = layers
  const down = () => (ordered = ordered.map((layer) => sortLayer(layer, (id) => parents.get(id))))
  const up = () =>
    (ordered = [...ordered]
      .reverse()
      .map((layer) => sortLayer(layer, (id) => children.get(id)))
      .reverse())
  down()
  up()
  down()
  return ordered
}

/** Frames sized to wrap their members, with room on every side and a title band above. */
export const wrapFrames = (nodes, frames = []) => {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return frames.map((frame) => {
    const members = (frame.members ?? []).map((id) => byId.get(id)).filter(Boolean)
    if (!members.length) return { ...frame, x: 0, y: 0, w: 300, h: 300 }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    members.forEach((n) => {
      const { w, h } = layoutSize(n)
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + w)
      maxY = Math.max(maxY, n.y + h)
    })
    return {
      ...frame,
      x: minX - FRAME_PADDING,
      y: minY - FRAME_PADDING - FRAME_TITLE_BAND,
      w: maxX - minX + FRAME_PADDING * 2,
      h: maxY - minY + FRAME_PADDING * 2 + FRAME_TITLE_BAND
    }
  })
}

/** Moves nodes and frames together so their box is centred on (0, 0). */
const centre = (nodes, frames) => {
  const rects = [...nodes.map((n) => ({ x: n.x, y: n.y, ...layoutSize(n) })), ...frames]
  if (!rects.length) return { nodes, frames }
  const minX = Math.min(...rects.map((r) => r.x))
  const minY = Math.min(...rects.map((r) => r.y))
  const maxX = Math.max(...rects.map((r) => r.x + r.w))
  const maxY = Math.max(...rects.map((r) => r.y + r.h))
  const dx = -(minX + maxX) / 2
  const dy = -(minY + maxY) / 2
  const shift = (r) => ({ ...r, x: Math.round(r.x + dx), y: Math.round(r.y + dy) })
  return { nodes: nodes.map(shift), frames: frames.map(shift) }
}

/**
 * Boxes `{ id, w, h }` in layers along `direction`, each layer centred
 * across. Returns top-left corners with the whole starting at (0, 0), and
 * the size it takes.
 */
const layered = (boxes, links, { direction, gapX, gapY }) => {
  const ids = boxes.map((b) => b.id)
  const byId = new Map(boxes.map((b) => [b.id, b]))
  const { layer, parents, children } = assignLayers(ids, acyclicEdges(ids, links))
  const layers = []
  ids.forEach((id) => {
    const l = layer.get(id) ?? 0
    layers[l] = layers[l] ?? []
    layers[l].push(id)
  })
  const across = direction === 'TB' ? 'w' : 'h'
  const along = direction === 'TB' ? 'h' : 'w'

  const placed = new Map()
  let offset = 0
  orderLayers(layers.filter(Boolean), parents, children).forEach((layerIds) => {
    const sizes = layerIds.map((id) => byId.get(id))
    const depth = Math.max(...sizes.map((s) => s[along]))
    let cursor = 0
    const starts = layerIds.map((id, i) => {
      if (i > 0) cursor += gapY
      const start = cursor
      cursor += sizes[i][across]
      return start
    })
    layerIds.forEach((id, i) => {
      const a = starts[i] - cursor / 2
      const b = offset + (depth - sizes[i][along]) / 2
      placed.set(id, direction === 'TB' ? { x: a, y: b } : { x: b, y: a })
    })
    offset += depth + gapX
  })
  const rects = ids.map((id) => ({ ...placed.get(id), w: byId.get(id).w, h: byId.get(id).h }))
  if (!rects.length) return { placed, w: 0, h: 0 }
  const minX = Math.min(...rects.map((r) => r.x))
  const minY = Math.min(...rects.map((r) => r.y))
  placed.forEach((p, id) => placed.set(id, { x: p.x - minX, y: p.y - minY }))
  return {
    placed,
    w: Math.max(...rects.map((r) => r.x + r.w)) - minX,
    h: Math.max(...rects.map((r) => r.y + r.h)) - minY
  }
}

/** Where a node or frame sits: the frame that holds it, or null on the board itself. */
const containerFinder = (frames) => {
  const frameById = new Map(frames.map((f) => [f.id, f]))
  const nodeFrame = frameOf(frames)
  return (id) => {
    const parent = frameById.has(id) ? frameById.get(id).parent : nodeFrame.get(id)
    return parent && frameById.has(parent) && parent !== id ? parent : null
  }
}

/**
 * A layered layout (PRD D9: left to right for a flowchart). A frame is laid
 * out first, in its own direction if it has one, and then placed as one block
 * beside its neighbours, so frames never overlap and a link to a frame (or to
 * something inside it) places the whole frame. `gapX` is the room between
 * layers, `gapY` between neighbours in a layer, whichever way the layers run.
 *
 * @returns {{ nodes: object[], frames: object[] }}
 */
export const layoutGraph = ({ nodes = [], links = [], frames = [] }, { direction = 'LR', gapX = 80, gapY = 32 } = {}) => {
  const containerOf = containerFinder(frames)
  // The node or frame that stands for `id` among the things directly in `scope`.
  const unitIn = (id, scope) => {
    for (let cur = id, guard = 0; cur && guard <= frames.length; cur = containerOf(cur), guard += 1) {
      if (containerOf(cur) === scope) return cur
    }
    return null
  }
  const at = new Map()

  // Lays out what `scope` holds; positions land in `at` relative to the scope's top-left.
  const block = (scope, dir) => {
    const inner = new Map()
    const boxes = [
      ...nodes.filter((n) => containerOf(n.id) === scope).map((n) => ({ id: n.id, ...layoutSize(n) })),
      ...frames
        .filter((f) => containerOf(f.id) === scope)
        .map((f) => {
          const content = block(f.id, f.direction ?? dir)
          inner.set(f.id, content)
          if (!content.w) return { id: f.id, w: DEFAULT_FRAME.w, h: DEFAULT_FRAME.h }
          return { id: f.id, w: content.w + FRAME_PADDING * 2, h: content.h + FRAME_PADDING * 2 + FRAME_TITLE_BAND }
        })
    ]
    const unitLinks = links
      .map((l) => ({ from: unitIn(l.from, scope), to: unitIn(l.to, scope) }))
      .filter((l) => l.from && l.to && l.from !== l.to)
    const laid = layered(boxes, unitLinks, { direction: dir, gapX, gapY })
    boxes.forEach((b) => {
      const p = laid.placed.get(b.id)
      at.set(b.id, { ...p, w: b.w, h: b.h })
      // Move what the frame holds from its own origin to inside the frame.
      inner.get(b.id)?.members.forEach((id) => {
        const m = at.get(id)
        at.set(id, { ...m, x: m.x + p.x + FRAME_PADDING, y: m.y + p.y + FRAME_PADDING + FRAME_TITLE_BAND })
      })
    })
    return { w: laid.w, h: laid.h, members: [...at.keys()].filter((id) => unitIn(id, scope)) }
  }
  block(null, direction)

  const laid = nodes.map((n) => ({ ...n, x: at.get(n.id).x, y: at.get(n.id).y }))
  const placedFrames = frames.map((f) => ({ ...f, ...at.get(f.id) }))
  return centre(laid, placedFrames)
}

/** The tree in a set of links: each node's first incoming link is its parent; other links do not shape it. */
const treeOf = (ids, links) => {
  const known = new Set(ids)
  const parent = new Map()
  const children = new Map(ids.map((id) => [id, []]))
  links.forEach((l) => {
    if (!known.has(l.from) || !known.has(l.to) || l.from === l.to || parent.has(l.to)) return
    // Refuse a link that would close a loop: walk up from the parent.
    for (let p = l.from; p !== undefined; p = parent.get(p)) if (p === l.to) return
    parent.set(l.to, l.from)
    children.get(l.from).push(l.to)
  })
  return { roots: ids.filter((id) => !parent.has(id)), children }
}

/**
 * A tidy tree, left to right, for mind maps and outlines: each parent sits
 * centred beside its children, and no subtree overlaps another. `links`
 * gives the tree (a node's first incoming link is its parent).
 *
 * @returns {{ nodes: object[], frames: object[] }}
 */
export const layoutTree = ({ nodes = [], links = [], frames = [] }, { gapX = 80, gapY = 24 } = {}) => {
  const ids = nodes.map((n) => n.id)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const { roots, children } = treeOf(ids, links)
  const depthOf = new Map()
  const widest = []
  const top = new Map()

  const walkDepth = (id, depth) => {
    depthOf.set(id, depth)
    widest[depth] = Math.max(widest[depth] ?? 0, layoutSize(byId.get(id)).w)
    children.get(id).forEach((c) => walkDepth(c, depth + 1))
  }
  roots.forEach((r) => walkDepth(r, 0))

  const shift = (id, dy) => {
    top.set(id, top.get(id) + dy)
    children.get(id).forEach((c) => shift(c, dy))
  }
  // Places a subtree from `start` down; returns where it ends.
  const place = (id, start) => {
    const { h } = layoutSize(byId.get(id))
    const kids = children.get(id)
    if (!kids.length) {
      top.set(id, start)
      return start + h
    }
    let cursor = start
    kids.forEach((c, i) => {
      cursor = place(c, cursor + (i > 0 ? gapY : 0))
    })
    // Centred on its children; a parent taller than them pushes them down.
    const last = kids[kids.length - 1]
    let y = (top.get(kids[0]) + top.get(last) + layoutSize(byId.get(last)).h) / 2 - h / 2
    if (y < start) {
      kids.forEach((c) => shift(c, start - y))
      cursor += start - y
      y = start
    }
    top.set(id, y)
    return Math.max(cursor, y + h)
  }
  let cursor = 0
  roots.forEach((r, i) => {
    cursor = place(r, cursor + (i > 0 ? gapY * 2 : 0))
  })

  const columnX = []
  widest.forEach((w, d) => (columnX[d] = d === 0 ? 0 : columnX[d - 1] + widest[d - 1] + gapX))
  const laid = nodes.map((n) => ({ ...n, x: columnX[depthOf.get(n.id)] ?? 0, y: top.get(n.id) ?? 0 }))
  return centre(laid, wrapFrames(laid, frames))
}
