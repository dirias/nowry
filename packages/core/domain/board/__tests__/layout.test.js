/**
 * BOARD-002 — automatic layout: no two nodes overlap, layers run left to
 * right, frames wrap their members. No DOM.
 */
import { layoutGraph, layoutTree, layoutSize, overlaps, parseMermaid, fromParsed, FRAME_PADDING } from '../index'

const note = (id, text = id) => ({ id, kind: 'note', text, w: null, h: null })
const rect = (n) => ({ x: n.x, y: n.y, ...layoutSize(n) })

const expectNoOverlap = (nodes) => {
  const rects = nodes.map(rect)
  rects.forEach((a, i) =>
    rects.slice(i + 1).forEach((b, j) => {
      if (overlaps(a, b)) throw new Error(`${nodes[i].id} overlaps ${nodes[i + 1 + j].id}`)
    })
  )
}

const centreOf = (nodes) => {
  const xs = nodes.flatMap((n) => [n.x, n.x + layoutSize(n).w])
  const ys = nodes.flatMap((n) => [n.y, n.y + layoutSize(n).h])
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

describe('layoutTree', () => {
  // root → 3 children → 6 grandchildren: 10 nodes, one with a long text.
  const nodes = ['r', 'a', 'b', 'c', 'a1', 'a2', 'a3', 'b1', 'c1', 'c2'].map((id) =>
    note(id, id === 'b1' ? 'A long note whose text wraps over several lines when it is drawn on the board' : id)
  )
  const links = [
    ['r', 'a'],
    ['r', 'b'],
    ['r', 'c'],
    ['a', 'a1'],
    ['a', 'a2'],
    ['a', 'a3'],
    ['b', 'b1'],
    ['c', 'c1'],
    ['c', 'c2']
  ].map(([from, to]) => ({ from, to }))

  it('places a 10-node tree without overlaps, depth to the right, centred on the origin', () => {
    const { nodes: laid } = layoutTree({ nodes, links })
    expect(laid).toHaveLength(10)
    expectNoOverlap(laid)
    const at = Object.fromEntries(laid.map((n) => [n.id, n]))
    expect(at.a.x).toBeGreaterThan(at.r.x)
    expect(at.a1.x).toBeGreaterThan(at.a.x)
    expect(at.a.x).toBe(at.c.x)
    // the root sits centred beside its children
    const kids = [at.a, at.b, at.c]
    const span = (Math.min(...kids.map((k) => k.y)) + Math.max(...kids.map((k) => k.y + layoutSize(k).h))) / 2
    expect(Math.abs(at.r.y + layoutSize(at.r).h / 2 - span)).toBeLessThanOrEqual(1)
    const c = centreOf(laid)
    expect(Math.abs(c.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(c.y)).toBeLessThanOrEqual(1)
  })

  it('survives a cycle and a forest', () => {
    const { nodes: laid } = layoutTree({
      nodes: [note('x'), note('y'), note('z'), note('lone')],
      links: [
        { from: 'x', to: 'y' },
        { from: 'y', to: 'z' },
        { from: 'z', to: 'x' }
      ]
    })
    expect(laid).toHaveLength(4)
    expectNoOverlap(laid)
  })
})

describe('layoutGraph', () => {
  const flowchart = `flowchart LR
  A[Start] --> B[Read]
  B --> C{Understood?}
  C -->|yes| D[Cards]
  C -->|no| B
  subgraph Review
    E[Quiz] --> F[Score]
  end
  D --> E
  F --> G[Done]
  F --> H[Again]`

  it('places an 8-node flowchart with a subgraph without overlaps; LR increases x by layer', () => {
    const parsed = parseMermaid(flowchart)
    expect(parsed.nodes).toHaveLength(8)
    const nodes = parsed.nodes.map((n) => note(n.id, n.text))
    const { nodes: laid, frames } = layoutGraph({ nodes, links: parsed.links, frames: parsed.frames }, { direction: 'LR' })
    expectNoOverlap(laid)
    const at = Object.fromEntries(laid.map((n) => [n.id, n]))
    const chain = ['A', 'B', 'C', 'D', 'E', 'F']
    chain.slice(1).forEach((id, i) => expect(at[id].x).toBeGreaterThan(at[chain[i]].x))
    expect(at.G.x).toBe(at.H.x)

    const [review] = frames
    ;['E', 'F'].forEach((id) => {
      const n = at[id]
      expect(n.x).toBeGreaterThanOrEqual(review.x + FRAME_PADDING)
      expect(n.x + layoutSize(n).w).toBeLessThanOrEqual(review.x + review.w)
      expect(n.y).toBeGreaterThan(review.y)
      expect(n.y + layoutSize(n).h).toBeLessThanOrEqual(review.y + review.h)
    })
    // the frame holds no one else
    ;['A', 'B', 'C', 'D', 'G', 'H'].forEach((id) => expect(overlaps(rect(at[id]), review)).toBe(false))
  })

  it('runs top to bottom on TB', () => {
    const nodes = ['a', 'b', 'c'].map((id) => note(id))
    const { nodes: laid } = layoutGraph(
      {
        nodes,
        links: [
          { from: 'a', to: 'b' },
          { from: 'a', to: 'c' }
        ]
      },
      { direction: 'TB' }
    )
    const at = Object.fromEntries(laid.map((n) => [n.id, n]))
    expect(at.b.y).toBeGreaterThan(at.a.y)
    expect(at.b.y).toBe(at.c.y)
    expectNoOverlap(laid)
  })

  it('fromParsed keeps the layout and centres it on the origin', () => {
    const { nodes } = fromParsed(parseMermaid(flowchart), { origin: { x: 1000, y: -500 } })
    expectNoOverlap(nodes.filter((n) => n.kind !== 'frame'))
    const c = centreOf(nodes)
    expect(Math.abs(c.x - 1000)).toBeLessThanOrEqual(1)
    expect(Math.abs(c.y + 500)).toBeLessThanOrEqual(1)
  })
})
