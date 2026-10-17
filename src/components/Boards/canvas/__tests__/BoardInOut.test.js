/**
 * BOARD-008 / BOARD-009 — in and out on the canvas (PRD D9): paste of
 * Mermaid, an outline and plain lines; the 500-node refusal; copy, cut and
 * paste between boards; Import a file…; and the four exports. The library is
 * the stand-in BoardCanvas.test.js uses; the strings are the English draft,
 * so the status lines read as a person reads them.
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import { toJsonCanvas } from '@nowry/core/domain/board'
import { toPng, toSvg } from 'html-to-image'
import BoardCanvas from '../BoardCanvas'
import { BOARD_MIME, MAX_IMPORT_BYTES, resetLastCopy } from '../useBoardClipboard'

jest.mock('react-i18next', () => {
  const en = require('@nowry/core/locales/en/translation.json')
  const base = { boards: { ...en.boards, untitled: 'Untitled board', frame: { untitled: 'Untitled frame' } } }
  const lookup = (key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), base)
  const t = (key, options = {}) => {
    const plural = options.count !== undefined ? lookup(`${key}_${options.count === 1 ? 'one' : 'other'}`) : undefined
    const text = plural ?? lookup(key)
    return typeof text === 'string' ? text.replace(/{{(\w+)}}/g, (_, name) => String(options[name])) : key
  }
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) }
})

jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,iVBORw0KGgo=')),
  toSvg: jest.fn(() => Promise.resolve('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E'))
}))

let mockFlowProps = null
const mockFlow = {
  screenToFlowPosition: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  fitView: jest.fn(),
  getNodesBounds: jest.fn()
}

jest.mock('@xyflow/react', () => {
  const ReactMod = require('react')
  const h = ReactMod.createElement
  return {
    __esModule: true,
    ReactFlowProvider: ({ children }) => children,
    ReactFlow: (props) => {
      mockFlowProps = props
      return h(
        'div',
        { 'data-testid': 'rf' },
        h(
          'div',
          { className: 'react-flow__viewport', 'data-testid': 'viewport' },
          props.nodes.map((n) => {
            const Node = props.nodeTypes[n.type]
            return h(
              'div',
              { key: n.id, className: 'react-flow__node', 'data-id': n.id, 'data-testid': `rf-node-${n.id}` },
              h(Node, { id: n.id, data: n.data, selected: n.selected })
            )
          })
        ),
        props.children
      )
    },
    Background: () => null,
    BackgroundVariant: { Dots: 'dots' },
    ConnectionMode: { Loose: 'loose' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
    useReactFlow: () => mockFlow,
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    useInternalNode: () => null,
    Handle: ({ children, onClick, className, role, ...rest }) =>
      h('div', { onClick, className, role, 'aria-label': rest['aria-label'] }, children),
    NodeResizer: () => null,
    NodeToolbar: ({ children, isVisible }) => (isVisible ? h('div', { 'data-testid': 'node-toolbar' }, children) : null),
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }) => children,
    getBezierPath: () => ['', 0, 0],
    getViewportForBounds: (bounds, width, height) => ({
      x: width / 2 - (bounds.x + bounds.width / 2),
      y: height / 2 - (bounds.y + bounds.height / 2),
      zoom: 1
    })
  }
})

/** The canvas board's Mermaid example (InOut.dc.html). */
const MERMAID = `flowchart LR
  P[Photosynthesis]
  P --> L[Light reactions]
  P --> C[Calvin cycle]
  L -->|releases| O[Oxygen]
  C -->|makes| G[Glucose]
  subgraph Inputs
    W[Water] --> P
    D[CO₂] --> P
  end`

const note = (id, x = 0, y = 0, extra = {}) => ({
  id,
  kind: 'note',
  x,
  y,
  w: null,
  h: null,
  z: 1,
  text: `Note ${id}`,
  color: 'yellow',
  size: null,
  title: null,
  ref: null,
  cardIds: [],
  ...extra
})

let latest = null
const spies = {}

function Harness({ initial, commandsRef }) {
  const ref = React.useRef(initial)
  const [board, setBoard] = React.useState(initial)
  latest = ref
  const apply = React.useCallback((updater, options) => {
    spies.apply(options)
    const next = updater({ nodes: ref.current.nodes, links: ref.current.links })
    if (!next) return
    ref.current = { ...ref.current, nodes: next.nodes, links: next.links }
    setBoard(ref.current)
  }, [])
  return (
    <BoardCanvas
      board={board}
      apply={apply}
      checkpoint={jest.fn()}
      undo={spies.undo}
      redo={jest.fn()}
      setViewport={jest.fn()}
      onStatus={spies.status}
      onError={spies.error}
      commandsRef={commandsRef}
    />
  )
}

const BOARD = (nodes = [], links = []) => ({ id: 'b1', name: 'Photo: synthesis?', nodes, links, viewport: { x: 0, y: 0, zoom: 1 } })

const commands = React.createRef()
const mount = (board = BOARD()) =>
  render(
    <CssVarsProvider>
      <Harness initial={board} commandsRef={commands} />
    </CssVarsProvider>
  )
const nodes = () => latest.current.nodes
const links = () => latest.current.links
const canvas = () => screen.getByTestId('board-canvas')
const selected = () => mockFlowProps.nodes.filter((n) => n.selected).map((n) => n.id)
const select = (...ids) => act(() => mockFlowProps.onNodesChange(ids.map((id) => ({ type: 'select', id, selected: true }))))
const lastStatus = () => spies.status.mock.calls[spies.status.mock.calls.length - 1]?.[0]

/** A clipboard as the browser hands it to a paste or a copy. */
const clipboard = (items = {}) => {
  const store = { ...items }
  return { getData: (type) => store[type] ?? '', setData: (type, value) => (store[type] = value), store }
}

const paste = (text, target = canvas(), extra = {}) => {
  act(() => target.focus())
  fireEvent.paste(target, { clipboardData: clipboard({ 'text/plain': text, ...extra }) })
}

beforeEach(() => {
  mockFlowProps = null
  latest = null
  resetLastCopy()
  Object.assign(spies, { apply: jest.fn(), undo: jest.fn(), status: jest.fn(), error: jest.fn() })
  mockFlow.screenToFlowPosition.mockImplementation(({ x, y }) => ({ x: x + 1000, y: y + 2000 }))
  mockFlow.getNodesBounds.mockImplementation(() => ({ x: 100, y: 50, width: 400, height: 200 }))
  toPng.mockImplementation(() => Promise.resolve('data:image/png;base64,iVBORw0KGgo='))
  toSvg.mockImplementation(() => Promise.resolve('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E'))
})

describe('paste (BOARD-008)', () => {
  it('pastes the Mermaid example as 7 notes, 6 links and a frame: one step, selected, named, with Undo', () => {
    mount(BOARD([note('a', 0, 0)]))
    paste(MERMAID)

    const added = nodes().slice(1)
    expect(added.filter((n) => n.kind === 'note')).toHaveLength(7)
    expect(added.filter((n) => n.kind === 'frame')).toHaveLength(1)
    expect(links()).toHaveLength(6)
    expect(
      links()
        .map((l) => l.label)
        .filter(Boolean)
    ).toEqual(['releases', 'makes'])
    expect(spies.apply).toHaveBeenCalledTimes(1)
    expect(spies.apply).toHaveBeenCalledWith(undefined)
    expect(selected().sort()).toEqual(added.map((n) => n.id).sort())
    expect(lastStatus()).toEqual({ text: 'Pasted 7 notes, 6 links and a frame from Mermaid', undo: true })
  })

  it('centres what comes in on the visible canvas', () => {
    mount()
    paste(MERMAID)
    const xs = nodes().map((n) => n.x)
    // The stand-in projection puts the view's centre near (1000, 2000) in flow coordinates.
    expect(Math.min(...xs)).toBeLessThan(1000)
    expect(Math.max(...xs)).toBeGreaterThan(1000)
  })

  it('pastes an outline as a tree of linked notes, its heading a text block', () => {
    mount()
    paste('# Cells\n- Nucleus\n  - DNA\n- Membrane')
    expect(nodes().map((n) => [n.kind, n.text])).toEqual([
      ['text', 'Cells'],
      ['note', 'Nucleus'],
      ['note', 'DNA'],
      ['note', 'Membrane']
    ])
    expect(links()).toHaveLength(3)
    expect(lastStatus().text).toBe('Pasted 3 notes, 1 text block and 3 links from an outline')
  })

  it('pastes other text as one note per line, in a column', () => {
    mount()
    paste('Light\n\nWater\nCarbon dioxide')
    expect(nodes().map((n) => n.text)).toEqual(['Light', 'Water', 'Carbon dioxide'])
    expect(new Set(nodes().map((n) => n.x)).size).toBe(1)
    expect(links()).toEqual([])
    expect(lastStatus().text).toBe('Pasted 3 notes from text')
  })

  it('refuses a paste that would pass 500 nodes, and adds nothing', () => {
    const full = Array.from({ length: 495 }, (_, i) => note(`n${i}`, i * 10, 0))
    mount(BOARD(full))
    paste(MERMAID)
    expect(nodes()).toHaveLength(495)
    expect(spies.apply).not.toHaveBeenCalled()
    expect(lastStatus()).toEqual({ text: 'That would make 503 notes; a board holds 500.' })
  })

  it('says which Mermaid it cannot read', () => {
    mount()
    paste('sequenceDiagram\n  A->>B: hi')
    expect(nodes()).toEqual([])
    expect(lastStatus()).toEqual({ text: 'Only Mermaid flowcharts and mind maps can be read.' })
  })

  it('leaves a paste to the field while a note is being edited', () => {
    mount(BOARD([note('a')]))
    act(() => mockFlowProps.onNodeDoubleClick({ target: document.body }, { id: 'a', type: 'note' }))
    paste('Light\nWater', screen.getByTestId('board-editor-a'))
    expect(nodes()).toHaveLength(1)
    expect(spies.status).not.toHaveBeenCalled()
  })

  it('ignores a paste when the canvas does not have focus', () => {
    mount()
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    paste('Light', outside)
    expect(nodes()).toEqual([])
    outside.remove()
  })
})

describe('copy, cut and paste between boards', () => {
  const copyOn = (type = 'copy') => {
    const data = clipboard()
    act(() => canvas().focus())
    fireEvent[type](canvas(), { clipboardData: data })
    return data
  }

  it('copy writes plain text and the board format; pasting it back makes fresh copies, 24 px on', () => {
    mount(
      BOARD(
        [note('a', 0, 0, { text: 'Light' }), note('b', 300, 0, { text: 'Sugar' }), note('c', 0, 300)],
        [{ id: 'l1', from: 'a', to: 'b', label: 'makes' }]
      )
    )
    select('a', 'b')
    const data = copyOn()
    expect(data.store['text/plain']).toBe('Light\nSugar')
    expect(JSON.parse(data.store[BOARD_MIME]).nodes.map((n) => n.id)).toEqual(['a', 'b'])

    // Another tab's browser may drop the custom type: the plain text alone still finds the copy.
    paste('Light\nSugar')
    const copies = nodes().slice(3)
    expect(copies.map((n) => n.text)).toEqual(['Light', 'Sugar'])
    expect(copies.map((n) => n.id)).not.toContain('a')
    expect(copies.map((n) => [n.x, n.y])).toEqual([
      [24, 24],
      [324, 24]
    ])
    expect(links()).toHaveLength(2)
    expect(links()[1]).toMatchObject({ from: copies[0].id, to: copies[1].id, label: 'makes' })
    expect(links()[1].id).not.toBe('l1')
    expect(selected().sort()).toEqual(copies.map((n) => n.id).sort())
    expect(lastStatus()).toEqual({ text: 'Pasted 2 notes and 1 link', undo: true })

    // A second paste steps on again.
    paste('Light\nSugar')
    expect(
      nodes()
        .slice(5)
        .map((n) => [n.x, n.y])
    ).toEqual([
      [48, 48],
      [348, 48]
    ])
  })

  it('pastes the board format from another board', () => {
    mount(BOARD([note('x')]))
    const fragment = { nodes: [note('q', 10, 10, { text: 'Water', cardIds: ['card1'] })], links: [] }
    paste('Water', canvas(), { [BOARD_MIME]: JSON.stringify(fragment) })
    const copy = nodes()[1]
    expect(copy).toMatchObject({ text: 'Water', x: 34, y: 34, cardIds: [] })
    expect(copy.id).not.toBe('q')
  })

  it('cut copies, then removes the selection as one undo step', () => {
    mount(BOARD([note('a', 0, 0, { text: 'Light' }), note('b', 300, 0)], [{ id: 'l1', from: 'a', to: 'b', label: '' }]))
    select('a')
    const data = copyOn('cut')
    expect(data.store['text/plain']).toBe('Light')
    expect(nodes().map((n) => n.id)).toEqual(['b'])
    expect(links()).toEqual([])
    expect(spies.apply).toHaveBeenCalledTimes(1)
  })

  it('copies nothing without a selection, leaving the browser its copy', () => {
    mount(BOARD([note('a')]))
    const data = copyOn()
    expect(data.store).toEqual({})
  })
})

describe('Import a file… (BOARD-008)', () => {
  const file = (text, name) => new File([text], name, { type: 'text/plain' })

  it('reads a .mmd file as Mermaid and names it imported', async () => {
    mount()
    await act(() => commands.current.importFile(file(MERMAID, 'photosynthesis.mmd')))
    expect(nodes()).toHaveLength(8)
    expect(lastStatus()).toEqual({ text: 'Imported 7 notes, 6 links and a frame from Mermaid', undo: true })
  })

  it('reads a .canvas file as JSON Canvas: the same notes, links and frames come back', async () => {
    const original = BOARD(
      [
        { ...note('f1', -40, -60), kind: 'frame', text: null, color: null, title: 'Inputs', w: 600, h: 300, z: -1 },
        note('a', 0, 0, { text: 'Water', color: 'blue' }),
        note('b', 300, 0, { text: 'Glucose', color: 'green' })
      ],
      [{ id: 'l1', from: 'a', to: 'b', label: 'becomes' }]
    )
    mount()
    await act(() => commands.current.importFile(file(toJsonCanvas(original), 'cells.canvas')))
    expect(nodes().map((n) => [n.kind, n.text ?? n.title])).toEqual([
      ['frame', 'Inputs'],
      ['note', 'Water'],
      ['note', 'Glucose']
    ])
    expect(nodes().map((n) => n.color)).toEqual([null, 'blue', 'green'])
    expect(links()).toEqual([expect.objectContaining({ from: nodes()[1].id, to: nodes()[2].id, label: 'becomes' })])
    expect(lastStatus().text).toBe('Imported 2 notes, 1 link and a frame from JSON Canvas')
  })

  it('reads a .md file by what it says', async () => {
    mount()
    await act(() => commands.current.importFile(file('- One\n  - Two', 'notes.md')))
    expect(nodes().map((n) => n.text)).toEqual(['One', 'Two'])
    expect(lastStatus().text).toBe('Imported 2 notes and 1 link from an outline')
  })

  it('refuses a file over 1 MB before reading it', async () => {
    mount()
    const big = file('x', 'big.md')
    Object.defineProperty(big, 'size', { value: MAX_IMPORT_BYTES + 1 })
    await act(() => commands.current.importFile(big))
    expect(nodes()).toEqual([])
    expect(lastStatus()).toEqual({ text: 'This file is over 1 MB; a board takes files up to 1 MB.' })
  })

  it('says when a file cannot be read or holds nothing', async () => {
    mount()
    await act(() => commands.current.importFile(file('{ not json', 'broken.canvas')))
    expect(lastStatus()).toEqual({ text: 'This file could not be read.' })
    await act(() => commands.current.importFile(file('   \n', 'empty.txt')))
    expect(lastStatus()).toEqual({ text: 'There is nothing in this file to add.' })
    expect(nodes()).toEqual([])
  })
})

describe('Export (BOARD-009)', () => {
  let saved
  let clickSpy

  beforeEach(() => {
    saved = []
    global.URL.createObjectURL = jest.fn((blob) => {
      saved.push({ blob })
      return `blob:${saved.length}`
    })
    global.URL.revokeObjectURL = jest.fn()
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      saved[saved.length - 1].name = this.download
    })
  })
  afterEach(() => clickSpy.mockRestore())

  const blobText = (blob) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsText(blob)
    })

  const twoNotes = () =>
    BOARD([note('a', 0, 0, { text: 'Light' }), note('b', 300, 0, { text: 'Sugar' })], [{ id: 'l1', from: 'a', to: 'b', label: '' }])

  it('downloads the board as a Markdown outline named after it', async () => {
    mount(twoNotes())
    await act(() => commands.current.exportAs('outline'))
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Photo synthesis.md')
    expect(saved[0].blob.type).toBe('text/markdown;charset=utf-8')
    expect(await blobText(saved[0].blob)).toBe('- Light\n  - Sugar\n')
  })

  it('exports only the selection when there is one, as JSON Canvas', async () => {
    mount(twoNotes())
    select('b')
    await act(() => commands.current.exportAs('canvas'))
    expect(saved[0].name).toBe('Photo synthesis.canvas')
    expect(saved[0].blob.type).toBe('application/json;charset=utf-8')
    const doc = JSON.parse(await blobText(saved[0].blob))
    expect(doc.nodes.map((n) => n.text)).toEqual(['Sugar'])
    expect(doc.edges).toEqual([])
  })

  it('draws a PNG of the viewport at 2× with the fitting transform and the canvas colour', async () => {
    mount(twoNotes())
    await act(() => commands.current.exportAs('png'))
    expect(mockFlow.getNodesBounds).toHaveBeenCalledWith(['a', 'b'])
    const [element, options] = toPng.mock.calls[0]
    expect(element).toBe(screen.getByTestId('viewport'))
    expect(options).toMatchObject({ width: 464, height: 264, pixelRatio: 2 })
    expect(options.style.transform).toBe('translate(-68px, -18px) scale(1)')
    expect(options.backgroundColor).toBe(window.getComputedStyle(canvas()).backgroundColor)
    expect(saved[0]).toMatchObject({ name: 'Photo synthesis.png' })
    expect(saved[0].blob.type).toBe('image/png')
  })

  it('draws an SVG of the selection only, its selection back after', async () => {
    mount(twoNotes())
    select('a')
    toSvg.mockImplementation((_el, options) => {
      const keepA = options.filter(screen.getByTestId('rf-node-a'))
      const keepB = options.filter(screen.getByTestId('rf-node-b'))
      return Promise.resolve(keepA && !keepB ? 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E' : 'data:,wrong')
    })
    await act(() => commands.current.exportAs('svg'))
    expect(mockFlow.getNodesBounds).toHaveBeenCalledWith(['a'])
    expect(selected()).toEqual(['a'])
    expect(saved[0].name).toBe('Photo synthesis.svg')
    expect(saved[0].blob.type).toBe('image/svg+xml')
  })

  it('says so when the image cannot be made, and on an empty board', async () => {
    mount(twoNotes())
    toPng.mockImplementation(() => Promise.reject(new Error('tainted')))
    await act(() => commands.current.exportAs('png'))
    expect(spies.error).toHaveBeenCalledWith('The image could not be made. Try again.')
  })

  it('exports nothing from an empty board', async () => {
    mount()
    await act(() => commands.current.exportAs('outline'))
    expect(saved).toEqual([])
    expect(lastStatus()).toEqual({ text: 'There is nothing on the board to export.' })
  })
})
