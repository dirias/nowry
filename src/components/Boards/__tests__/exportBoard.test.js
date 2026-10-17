/**
 * BOARD-009 — the export helpers: file names, the image's size and view, what
 * the picture leaves out, and the download itself. html-to-image is mocked;
 * the library's own `getViewportForBounds` is the real one.
 */
import { toPng, toSvg } from 'html-to-image'
import {
  IMAGE_PADDING,
  MAX_IMAGE_SIDE,
  REVOKE_AFTER,
  dataUrlToBlob,
  download,
  downloadText,
  fileName,
  imageFilter,
  imageSize,
  imageViewport,
  pngPixelRatio,
  renderImage,
  transformOf
} from '../exportBoard'

jest.mock('html-to-image', () => ({ toPng: jest.fn(), toSvg: jest.fn() }))

const el = (className, attrs = {}) => {
  const node = document.createElement('div')
  node.className = className
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v))
  return node
}

describe('fileName', () => {
  it('keeps a plain name and adds the extension', () => {
    expect(fileName('Photosynthesis', 'png')).toBe('Photosynthesis.png')
  })

  it('drops what a file system refuses, leading dots and extra space', () => {
    expect(fileName('  Cells: a/b?  *notes*  ', 'md')).toBe('Cells a b notes.md')
    expect(fileName('..hidden', 'svg')).toBe('hidden.svg')
  })

  it('falls back when nothing is left, and keeps a long name to 100 characters', () => {
    expect(fileName('///', 'canvas')).toBe('board.canvas')
    expect(fileName(null, 'md', 'Untitled board')).toBe('Untitled board.md')
    expect(fileName('x'.repeat(300), 'png')).toBe(`${'x'.repeat(100)}.png`)
  })
})

describe('the image size and view', () => {
  it('is the bounds with 32 px all round, drawn at full size', () => {
    const size = imageSize({ x: 100, y: 50, width: 400, height: 200 })
    expect(size).toMatchObject({ width: 464, height: 264, scale: 1 })
    expect(size.box).toEqual({ x: 100 - IMAGE_PADDING, y: 50 - IMAGE_PADDING, width: 464, height: 264 })
    expect(transformOf(imageViewport(size))).toBe('translate(-68px, -18px) scale(1)')
  })

  it('scales a big board down so neither side passes 4096 px, keeping its shape', () => {
    const size = imageSize({ x: 0, y: 0, width: 8128, height: 1000 })
    expect(size.width).toBe(MAX_IMAGE_SIDE)
    expect(size.height).toBe(Math.ceil(1064 / 2))
    expect(imageViewport(size).zoom).toBeCloseTo(0.5, 5)
  })

  it('draws a PNG at 2×, less only where a browser canvas would overflow', () => {
    expect(pngPixelRatio({ width: 464, height: 264 })).toBe(2)
    expect(pngPixelRatio({ width: 4096, height: 4096 })).toBe(1)
  })
})

describe('imageFilter', () => {
  it('leaves out handles, the "+", resize controls and the selection bar', () => {
    const keep = imageFilter()
    expect(keep(el('react-flow__handle board-handle'))).toBe(false)
    expect(keep(el('react-flow__handle board-plus'))).toBe(false)
    expect(keep(el('react-flow__resize-control handle'))).toBe(false)
    expect(keep(el('react-flow__node-toolbar'))).toBe(false)
    expect(keep(el('react-flow__node', { 'data-id': 'a' }))).toBe(true)
    expect(keep(document.createTextNode('text'))).toBe(true)
  })

  it('for a selection, keeps its nodes, the links between them and their labels', () => {
    const keep = imageFilter({ nodeIds: new Set(['a']), edgeIds: new Set(['l1']) })
    expect(keep(el('react-flow__node', { 'data-id': 'a' }))).toBe(true)
    expect(keep(el('react-flow__node', { 'data-id': 'b' }))).toBe(false)
    expect(keep(el('react-flow__edge', { 'data-id': 'l1' }))).toBe(true)
    expect(keep(el('react-flow__edge', { 'data-id': 'l2' }))).toBe(false)
    expect(keep(el('', { 'data-testid': 'board-link-label-l1' }))).toBe(true)
    expect(keep(el('', { 'data-testid': 'board-link-label-l2' }))).toBe(false)
  })
})

describe('renderImage', () => {
  const element = document.createElement('div')
  const bounds = { x: 100, y: 50, width: 400, height: 200 }

  // CRA resets mock implementations between tests; the library's answers are set again here.
  beforeEach(() => {
    toPng.mockImplementation(() => Promise.resolve('data:image/png;base64,iVBORw0KGgo='))
    toSvg.mockImplementation(() => Promise.resolve('data:image/svg+xml;charset=utf-8,%3Csvg%20%2F%3E'))
  })

  it('draws a PNG with the computed transform, the background and 2×', async () => {
    const blob = await renderImage({ element, bounds, format: 'png', background: 'rgb(20, 22, 21)' })
    const [target, options] = toPng.mock.calls[toPng.mock.calls.length - 1]
    expect(target).toBe(element)
    expect(options).toMatchObject({
      backgroundColor: 'rgb(20, 22, 21)',
      width: 464,
      height: 264,
      pixelRatio: 2,
      style: { width: '464px', height: '264px', transform: 'translate(-68px, -18px) scale(1)' }
    })
    expect(typeof options.filter).toBe('function')
    expect(blob.type).toBe('image/png')
  })

  it('draws an SVG without a pixel ratio', async () => {
    const blob = await renderImage({ element, bounds, format: 'svg', background: 'white' })
    const options = toSvg.mock.calls[toSvg.mock.calls.length - 1][1]
    expect(options.pixelRatio).toBeUndefined()
    expect(blob.type).toBe('image/svg+xml')
  })
})

describe('the download', () => {
  let clicked
  beforeEach(() => {
    jest.useFakeTimers()
    clicked = []
    global.URL.createObjectURL = jest.fn(() => 'blob:1')
    global.URL.revokeObjectURL = jest.fn()
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicked.push({ href: this.getAttribute('href'), name: this.download, inPage: document.body.contains(this) })
    })
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('clicks a short-lived link to an object URL, then lets the URL go', () => {
    const blob = new Blob(['x'], { type: 'text/plain' })
    download(blob, 'Cells.md')
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicked).toEqual([{ href: 'blob:1', name: 'Cells.md', inPage: true }])
    expect(document.querySelector('a[download]')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    jest.advanceTimersByTime(REVOKE_AFTER)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
  })

  it('saves an outline as Markdown and a canvas as JSON', () => {
    downloadText('- a', 'Cells.md', 'outline')
    downloadText('{}', 'Cells.canvas', 'canvas')
    const types = URL.createObjectURL.mock.calls.map(([blob]) => blob.type)
    expect(types).toEqual(['text/markdown;charset=utf-8', 'application/json;charset=utf-8'])
    expect(clicked.map((c) => c.name)).toEqual(['Cells.md', 'Cells.canvas'])
  })
})

describe('dataUrlToBlob', () => {
  it('reads base64 and percent-encoded data URLs', () => {
    expect(dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=')).toMatchObject({ type: 'image/png', size: 8 })
    expect(dataUrlToBlob('data:image/svg+xml;charset=utf-8,%3Csvg%20%2F%3E')).toMatchObject({ type: 'image/svg+xml', size: 7 })
  })
})
