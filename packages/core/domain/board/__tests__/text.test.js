/**
 * BOARD-002 — text in and out: Mermaid, outlines, JSON Canvas, plain lines;
 * the outline and JSON Canvas serializers; fromParsed and the limits. No DOM.
 */
import {
  parseMermaid,
  parseOutline,
  parseJsonCanvas,
  parseLines,
  parseText,
  detectFormat,
  nearestNoteColor,
  toOutline,
  toJsonCanvas,
  toPlainText,
  fromParsed,
  limitCheck,
  readNode,
  MAX_NODES
} from '../index'

const PHOTOSYNTHESIS = `flowchart LR
  P[Photosynthesis]
  P --> L[Light reactions]
  P --> C[Calvin cycle]
  L -->|releases| O[Oxygen]
  C -->|makes| G[Glucose]
  subgraph Inputs
    W[Water] --> P
    D[CO₂] --> P
  end`

const MINDMAP = `mindmap
  root((Photosynthesis))
    Light reactions
      Oxygen
      ::icon(fa fa-leaf)
    Calvin cycle
      Glucose
    Inputs
      [Water]
      (CO₂)
      ))Sunlight((
      {{Chlorophyll}}`

const OUTLINE = `# Photosynthesis
- Light reactions
  - Oxygen
    released into the air
- Calvin cycle
  * Glucose
## Inputs
1. Water
2. CO₂
# Respiration
\t- Mitochondria`

const textOf = (parsed, id) => parsed.nodes.find((n) => n.id === id)?.text

describe('parseMermaid — flowchart', () => {
  it('reads the photosynthesis fixture: 7 nodes, 6 links (two labelled), one frame holding Water and CO₂', () => {
    const parsed = parseMermaid(PHOTOSYNTHESIS)
    expect(parsed.type).toBe('flowchart')
    expect(parsed.direction).toBe('LR')
    expect(parsed.nodes).toHaveLength(7)
    expect(parsed.nodes.map((n) => n.text).sort()).toEqual(
      ['Calvin cycle', 'CO₂', 'Glucose', 'Light reactions', 'Oxygen', 'Photosynthesis', 'Water'].sort()
    )
    expect(parsed.links).toHaveLength(6)
    expect(parsed.links.map((l) => `${l.from}>${l.to}`).sort()).toEqual(['C>G', 'D>P', 'L>O', 'P>C', 'P>L', 'W>P'])
    expect(parsed.links.filter((l) => l.label).map((l) => l.label)).toEqual(['releases', 'makes'])
    expect(parsed.frames).toHaveLength(1)
    expect(parsed.frames[0]).toMatchObject({ title: 'Inputs', members: ['W', 'D'] })
    expect(parsed.frames[0].members.map((id) => textOf(parsed, id))).toEqual(['Water', 'CO₂'])
  })

  it('reads shapes, quoted labels, chains, edge kinds and both label forms', () => {
    const parsed = parseMermaid(`graph TD
  %% a comment
  A((Circle)) --> B(Round) --> C{Choice}
  C -- yes --> D>Flag]
  C -.-> E["Quoted (with) brackets"]
  D ==> F
  E --o F
  F --x G[[Sub]]
  G --- H
  H -->|"quoted label"| I
  classDef hot fill:#f00
  class A hot
  style B fill:#0f0
  click A callback
  A:::hot --> I`)
    expect(parsed.direction).toBe('TB')
    expect(textOf(parsed, 'A')).toBe('Circle')
    expect(textOf(parsed, 'B')).toBe('Round')
    expect(textOf(parsed, 'C')).toBe('Choice')
    expect(textOf(parsed, 'D')).toBe('Flag')
    expect(textOf(parsed, 'E')).toBe('Quoted (with) brackets')
    expect(textOf(parsed, 'F')).toBe('F')
    expect(textOf(parsed, 'G')).toBe('Sub')
    const pairs = parsed.links.map((l) => `${l.from}>${l.to}${l.label ? `:${l.label}` : ''}`)
    expect(pairs).toEqual(['A>B', 'B>C', 'C>D:yes', 'C>E', 'D>F', 'E>F', 'F>G', 'G>H', 'H>I:quoted label', 'A>I'])
    expect(parsed.links.find((l) => l.from === 'C' && l.to === 'E').style).toBe('dotted')
    expect(parsed.links.find((l) => l.from === 'D').style).toBe('thick')
    expect(parsed.links.find((l) => l.from === 'E').head).toBe('circle')
    expect(parsed.links.find((l) => l.from === 'F').head).toBe('cross')
    expect(parsed.links.find((l) => l.from === 'G').head).toBe('none')
  })

  it('reads arrows written without spaces, `&` groups and titled subgraphs', () => {
    const parsed = parseMermaid(`flowchart LR
  A-->B & C
  subgraph s1 [Two words]
    X
  end
  subgraph "Quoted title"
    Y-->Z
  end`)
    expect(parsed.links.map((l) => `${l.from}>${l.to}`)).toEqual(['A>B', 'A>C', 'Y>Z'])
    expect(parsed.frames.map((f) => [f.title, f.members])).toEqual([
      ['Two words', ['X']],
      ['Quoted title', ['Y', 'Z']]
    ])
  })

  it('strips a code fence and defaults to top to bottom', () => {
    const parsed = parseMermaid('```mermaid\nflowchart\n  A --> B\n```')
    expect(parsed.direction).toBe('TB')
    expect(parsed.links).toHaveLength(1)
  })

  it('refuses other diagrams and empty text', () => {
    expect(parseMermaid('sequenceDiagram\n  A->>B: hi')).toEqual({ error: 'unsupported', kind: 'sequenceDiagram' })
    expect(parseMermaid('classDiagram\n  A <|-- B')).toEqual({ error: 'unsupported', kind: 'classDiagram' })
    expect(parseMermaid('   \n  ')).toEqual({ error: 'empty' })
  })
})

describe('parseMermaid — mindmap', () => {
  it('reads the indentation tree and its shapes; icons are ignored', () => {
    const parsed = parseMermaid(MINDMAP)
    expect(parsed.type).toBe('mindmap')
    expect(parsed.nodes.map((n) => n.text)).toEqual([
      'Photosynthesis',
      'Light reactions',
      'Oxygen',
      'Calvin cycle',
      'Glucose',
      'Inputs',
      'Water',
      'CO₂',
      'Sunlight',
      'Chlorophyll'
    ])
    expect(parsed.nodes[0].shape).toBe('circle')
    expect(parsed.nodes.find((n) => n.text === 'Sunlight').shape).toBe('bang')
    expect(parsed.links).toHaveLength(9)
    expect(parsed.links.every((l) => l.tree)).toBe(true)
    const parentOf = (text) => {
      const id = parsed.nodes.find((n) => n.text === text).id
      const from = parsed.links.find((l) => l.to === id).from
      return parsed.nodes.find((n) => n.id === from).text
    }
    expect(parentOf('Oxygen')).toBe('Light reactions')
    expect(parentOf('Calvin cycle')).toBe('Photosynthesis')
    expect(parentOf('Chlorophyll')).toBe('Inputs')
  })
})

describe('parseOutline', () => {
  it('reads headings as text roots, bullets as a tree, and continuation lines into their note', () => {
    const parsed = parseOutline(OUTLINE)
    const byText = Object.fromEntries(parsed.nodes.map((n) => [n.text.split('\n')[0], n]))
    expect(byText.Photosynthesis).toMatchObject({ kind: 'text', level: 1 })
    expect(byText.Inputs).toMatchObject({ kind: 'text', level: 2 })
    expect(byText.Respiration).toMatchObject({ kind: 'text', level: 1 })
    expect(byText.Oxygen.text).toBe('Oxygen\nreleased into the air')
    const parentOf = (text) => {
      const link = parsed.links.find((l) => l.to === byText[text].id)
      return link ? parsed.nodes.find((n) => n.id === link.from).text : null
    }
    expect(parentOf('Photosynthesis')).toBeNull()
    expect(parentOf('Light reactions')).toBe('Photosynthesis')
    expect(parentOf('Oxygen')).toBe('Light reactions')
    expect(parentOf('Glucose')).toBe('Calvin cycle')
    expect(parentOf('Inputs')).toBe('Photosynthesis')
    expect(parentOf('Water')).toBe('Inputs')
    expect(parentOf('CO₂')).toBe('Inputs')
    expect(parentOf('Respiration')).toBeNull()
    expect(parentOf('Mitochondria')).toBe('Respiration')
  })

  it('reads a bare indented outline', () => {
    const parsed = parseOutline('Cell\n  Nucleus\n    DNA\n  Membrane')
    expect(parsed.nodes).toHaveLength(4)
    expect(parsed.links.map((l) => `${l.from}>${l.to}`)).toEqual(['o1>o2', 'o2>o3', 'o1>o4'])
    expect(parseOutline('\n \n')).toEqual({ error: 'empty' })
  })
})

describe('JSON Canvas', () => {
  const CANVAS = JSON.stringify({
    nodes: [
      { id: 'g', type: 'group', x: -20, y: -60, width: 600, height: 300, label: 'Inputs' },
      { id: 'a', type: 'text', x: 0, y: 0, width: 220, height: 100, text: 'Water', color: '4' },
      { id: 'b', type: 'text', x: 300, y: 0, width: 220, height: 100, text: 'CO₂', color: '#3366ff' },
      { id: 'c', type: 'file', x: 0, y: 400, width: 220, height: 100, file: 'notes/leaf.md' },
      { id: 'd', type: 'link', x: 300, y: 400, width: 220, height: 100, url: 'https://example.org', color: '1' }
    ],
    edges: [
      { id: 'e1', fromNode: 'a', toNode: 'c', label: 'feeds' },
      { id: 'e2', fromNode: 'b', toNode: 'd', fromSide: 'bottom', toSide: 'top' },
      { id: 'e3', fromNode: 'a', toNode: 'missing' }
    ]
  })

  it('parses nodes, groups, files, links and colours', () => {
    const parsed = parseJsonCanvas(CANVAS)
    expect(parsed.type).toBe('canvas')
    const at = Object.fromEntries(parsed.nodes.map((n) => [n.id, n]))
    expect(at.g).toMatchObject({ kind: 'frame', title: 'Inputs', x: -20, y: -60, w: 600, h: 300, z: -1 })
    expect(at.a).toMatchObject({ kind: 'note', text: 'Water', color: 'green', w: 220, h: 100 })
    expect(at.b.color).toBe('blue')
    expect(at.c).toMatchObject({ kind: 'note', text: 'notes/leaf.md', color: 'yellow' })
    expect(at.d).toMatchObject({ text: 'https://example.org', color: 'pink' })
    expect(parsed.links).toEqual([
      { id: 'e1', from: 'a', to: 'c', label: 'feeds' },
      { id: 'e2', from: 'b', to: 'd', label: '' }
    ])
    expect(parseJsonCanvas('{nope')).toEqual({ error: 'invalid' })
  })

  it('maps colours to the nearest of the five', () => {
    expect(['1', '2', '3', '4', '5', '6'].map(nearestNoteColor)).toEqual(['pink', 'yellow', 'yellow', 'green', 'blue', 'blue'])
    expect(nearestNoteColor('#888888')).toBe('grey')
    expect(nearestNoteColor(undefined)).toBe('yellow')
    expect(nearestNoteColor('bogus')).toBe('yellow')
  })

  it('round-trips: serialize → parse gives the same board', () => {
    const board = parseJsonCanvas(CANVAS)
    const again = parseJsonCanvas(toJsonCanvas(board))
    expect(again.nodes).toEqual(board.nodes)
    expect(again.links).toEqual(board.links)
  })

  it('writes items with their kind and leaves sides off edges', () => {
    const board = {
      nodes: [
        readNode({ id: 'i', kind: 'item', x: 0, y: 0, z: 1, ref: { kind: 'task', id: 't1' } }),
        readNode({ id: 'n', kind: 'note', x: 0, y: 200, z: 2, text: 'Plan', color: 'grey' })
      ],
      links: [{ id: 'l', from: 'n', to: 'i', label: '' }]
    }
    const doc = JSON.parse(toJsonCanvas(board, { itemTitle: () => 'Essay' }))
    expect(doc.nodes[0]).toEqual({ id: 'i', type: 'text', x: 0, y: 0, width: 256, height: 56, text: 'Task: Essay' })
    expect(doc.nodes[1].color).toBe('#9e9e9e')
    expect(doc.edges).toEqual([{ id: 'l', fromNode: 'n', toNode: 'i' }])
  })
})

describe('toOutline', () => {
  it('writes the photosynthesis board as a Markdown outline: the frame as a heading, children by links', () => {
    const board = fromParsed(parseMermaid(PHOTOSYNTHESIS), { idPrefix: 'p' })
    expect(toOutline(board)).toBe(
      [
        '## Inputs',
        '',
        '- Water',
        '  - Photosynthesis',
        '    - Light reactions',
        '      - Oxygen',
        '    - Calvin cycle',
        '      - Glucose',
        '- CO₂',
        ''
      ].join('\n')
    )
  })

  it('writes further lines under the bullet, visits a cycle once, honours a selection', () => {
    const n = (id, x, y, text) => readNode({ id, kind: 'note', x, y, text })
    const board = {
      nodes: [n('a', 0, 0, 'Alpha\nmore about alpha'), n('b', 300, 0, 'Beta'), n('c', 0, 300, 'Gamma'), n('d', 0, 600, 'Delta')],
      links: [
        { id: '1', from: 'a', to: 'b' },
        { id: '2', from: 'b', to: 'a' },
        { id: '3', from: 'c', to: 'd' }
      ]
    }
    expect(toOutline(board)).toBe('- Gamma\n  - Delta\n- Alpha\n  more about alpha\n  - Beta\n')
    expect(toOutline(board, { selection: ['c'] })).toBe('- Gamma\n')
    const back = parseOutline(toOutline(board))
    expect(back.nodes.map((x) => x.text)).toEqual(['Gamma', 'Delta', 'Alpha\nmore about alpha', 'Beta'])
  })

  it('names an untitled frame with the caller’s word', () => {
    const board = {
      nodes: [
        readNode({ id: 'f', kind: 'frame', x: 0, y: 0, w: 400, h: 300 }),
        readNode({ id: 'a', kind: 'note', x: 50, y: 50, text: 'In' })
      ],
      links: []
    }
    expect(toOutline(board, { untitled: 'Sans titre' })).toBe('## Sans titre\n\n- In\n')
  })
})

describe('toPlainText', () => {
  it('writes one node per line, top to bottom', () => {
    const nodes = [
      readNode({ id: 'b', kind: 'note', x: 0, y: 200, text: 'Second' }),
      readNode({ id: 'a', kind: 'text', x: 0, y: 0, text: 'First' }),
      readNode({ id: 'f', kind: 'frame', x: 0, y: 400, title: 'Third' })
    ]
    expect(toPlainText(nodes)).toBe('First\nSecond\nThird')
  })
})

describe('detectFormat and parseText', () => {
  it('tells the formats apart', () => {
    expect(detectFormat(PHOTOSYNTHESIS)).toBe('mermaid')
    expect(detectFormat(MINDMAP)).toBe('mermaid')
    expect(detectFormat('```mermaid\ngraph TD\nA-->B\n```')).toBe('mermaid')
    expect(detectFormat('%% note\nsequenceDiagram\nA->>B: x')).toBe('mermaid')
    expect(detectFormat('{"nodes": [], "edges": []}')).toBe('canvas')
    expect(detectFormat(OUTLINE)).toBe('outline')
    expect(detectFormat('Cell\n  Nucleus')).toBe('outline')
    expect(detectFormat('Water\nLight\nCO₂')).toBe('lines')
    expect(detectFormat('{ not json')).toBe('lines')
  })

  it('reads plain lines one note each', () => {
    expect(parseText('Water\n\nLight\n').nodes.map((n) => n.text)).toEqual(['Water', 'Light'])
    expect(parseLines('')).toEqual({ error: 'empty' })
  })
})

describe('fromParsed', () => {
  it('gives fresh ids, links between them, roots yellow and the rest green, frames behind', () => {
    const { nodes, links } = fromParsed(parseMermaid(PHOTOSYNTHESIS), { origin: { x: 0, y: 0 }, idPrefix: 'imp' })
    expect(nodes).toHaveLength(8)
    const frame = nodes.find((n) => n.kind === 'frame')
    expect(frame).toMatchObject({ title: 'Inputs', z: -1 })
    const notes = nodes.filter((n) => n.kind === 'note')
    notes.forEach((n) => expect(n.id).toMatch(/^imp-/))
    const colour = Object.fromEntries(notes.map((n) => [n.text, n.color]))
    expect(colour).toMatchObject({ Water: 'yellow', 'CO₂': 'yellow', Photosynthesis: 'green', Glucose: 'green' })
    expect(links).toHaveLength(6)
    const ids = new Set(nodes.map((n) => n.id))
    links.forEach((l) => expect(ids.has(l.from) && ids.has(l.to)).toBe(true))
    expect(links.find((l) => l.label === 'releases')).toBeTruthy()
  })

  it('lays out a mindmap and an outline as trees; headings become sized text', () => {
    const mind = fromParsed(parseMermaid(MINDMAP))
    expect(mind.nodes).toHaveLength(10)
    const outline = fromParsed(parseOutline(OUTLINE))
    const heading = outline.nodes.find((n) => n.text === 'Photosynthesis')
    expect(heading).toMatchObject({ kind: 'text', size: 'xl', color: null })
    expect(outline.nodes.find((n) => n.text === 'Inputs').size).toBe('lg')
  })

  it('keeps a JSON Canvas arrangement, with new ids', () => {
    const parsed = parseJsonCanvas(
      JSON.stringify({
        nodes: [
          { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'A' },
          { id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 100, text: 'B' }
        ],
        edges: [{ id: 'e', fromNode: 'a', toNode: 'b' }]
      })
    )
    const { nodes, links } = fromParsed(parsed, { origin: { x: 500, y: 500 } })
    expect(nodes[1].x - nodes[0].x).toBe(200)
    expect(nodes[0]).toMatchObject({ x: 350, y: 450 })
    expect(links[0]).toMatchObject({ from: nodes[0].id, to: nodes[1].id })
    expect(fromParsed({ error: 'empty' })).toEqual({ nodes: [], links: [] })
  })
})

describe('limitCheck', () => {
  it('refuses what would pass 500 nodes or 1,000 links', () => {
    const board = { nodes: Array.from({ length: 490 }, (_, i) => ({ id: `n${i}` })), links: [] }
    const ten = { nodes: Array.from({ length: 10 }, (_, i) => ({ id: `x${i}` })), links: [] }
    expect(limitCheck(board, ten)).toMatchObject({ ok: true, nodes: MAX_NODES })
    expect(limitCheck(board, { ...ten, nodes: [...ten.nodes, { id: 'y' }] })).toMatchObject({ ok: false, nodes: 501 })
    expect(limitCheck({ nodes: [], links: Array.from({ length: 1000 }) }, { nodes: [], links: [{}] }).ok).toBe(false)
  })
})
