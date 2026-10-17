/**
 * A board out as a file (BOARD-009, PRD D9): the file's name, the size and
 * view of an image, the image itself and the download. The image follows
 * @xyflow's "download image" recipe: the nodes' bounds, a viewport that fits
 * them, and `.react-flow__viewport` drawn with that transform by
 * `html-to-image`, the canvas's chrome filtered out.
 */
import { toPng, toSvg } from 'html-to-image'
import { getViewportForBounds } from '@xyflow/react'

/** Room round what is drawn, on each side. */
export const IMAGE_PADDING = 32
/** No side of an image is longer than this; a bigger board is drawn smaller. */
export const MAX_IMAGE_SIDE = 4096
/** PNG is drawn at twice the size, unless that would pass what a browser canvas can hold. */
export const PNG_PIXEL_RATIO = 2
const MAX_CANVAS_AREA = 16777216
/** The object URL outlives the click long enough for every browser to start the download. */
export const REVOKE_AFTER = 1000

export const EXPORT_FORMATS = {
  png: { extension: 'png', type: 'image/png' },
  svg: { extension: 'svg', type: 'image/svg+xml' },
  outline: { extension: 'md', type: 'text/markdown;charset=utf-8' },
  canvas: { extension: 'canvas', type: 'application/json;charset=utf-8' }
}

/** The canvas's controls: never part of a picture of the board. */
const CHROME_CLASSES = ['react-flow__handle', 'react-flow__resize-control', 'react-flow__node-toolbar', 'board-plus', 'react-flow__minimap']

const UNSAFE_FILE_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g // eslint-disable-line no-control-regex

/** A board's name as a file name: no characters a file system refuses, no leading dots, at most 100 characters. */
export const fileName = (name, extension, fallback = 'board') => {
  const base =
    String(name ?? '')
      .replace(UNSAFE_FILE_CHARS, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 100)
      .trim() || fallback
  return `${base}.${extension}`
}

/**
 * The image for some bounds: their box with the padding round it, scaled down
 * (never up) so that neither side passes `MAX_IMAGE_SIDE`.
 *
 * @param {{ x: number, y: number, width: number, height: number }} bounds in flow coordinates
 * @returns {{ width: number, height: number, box: object, scale: number }}
 */
export const imageSize = (bounds) => {
  const box = {
    x: bounds.x - IMAGE_PADDING,
    y: bounds.y - IMAGE_PADDING,
    width: Math.max(1, bounds.width) + IMAGE_PADDING * 2,
    height: Math.max(1, bounds.height) + IMAGE_PADDING * 2
  }
  const scale = Math.min(1, MAX_IMAGE_SIDE / box.width, MAX_IMAGE_SIDE / box.height)
  return {
    width: Math.min(MAX_IMAGE_SIDE, Math.ceil(box.width * scale)),
    height: Math.min(MAX_IMAGE_SIDE, Math.ceil(box.height * scale)),
    box,
    scale
  }
}

/** The view that draws the padded box into an image of that size. */
export const imageViewport = ({ width, height, box }) => getViewportForBounds(box, width, height, 0.01, 1, 0)

export const transformOf = ({ x, y, zoom }) => `translate(${x}px, ${y}px) scale(${zoom})`

/** Twice the size, less if the canvas would be too big for the browser. */
export const pngPixelRatio = ({ width, height }) => Math.min(PNG_PIXEL_RATIO, Math.sqrt(MAX_CANVAS_AREA / Math.max(1, width * height)))

const hasClass = (el, name) => Boolean(el?.classList?.contains?.(name))

/**
 * What html-to-image keeps: not the chrome; and when `keep` names a
 * selection, only its nodes, the links between them and their labels.
 */
export const imageFilter =
  (keep = null) =>
  (el) => {
    if (!el || el.nodeType !== 1) return true
    if (CHROME_CLASSES.some((name) => hasClass(el, name))) return false
    if (!keep) return true
    if (hasClass(el, 'react-flow__node')) return keep.nodeIds.has(el.getAttribute('data-id'))
    if (hasClass(el, 'react-flow__edge')) return keep.edgeIds.has(el.getAttribute('data-id'))
    const label = el.getAttribute?.('data-testid')
    if (label && label.startsWith('board-link-label-')) return keep.edgeIds.has(label.slice('board-link-label-'.length))
    return true
  }

/** A `data:` URL as a Blob. */
export const dataUrlToBlob = (url) => {
  const comma = url.indexOf(',')
  const head = url.slice(0, comma)
  const body = url.slice(comma + 1)
  const type = head.slice(5).split(';')[0] || 'application/octet-stream'
  if (/;base64/.test(head)) {
    const bytes = atob(body)
    const out = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i += 1) out[i] = bytes.charCodeAt(i)
    return new Blob([out], { type })
  }
  return new Blob([decodeURIComponent(body)], { type })
}

/**
 * Draws the viewport element as a PNG or SVG Blob.
 *
 * @param {object} options
 * @param {HTMLElement} options.element `.react-flow__viewport`
 * @param {object} options.bounds the exported nodes' bounds, in flow coordinates
 * @param {'png'|'svg'} options.format
 * @param {string} options.background the canvas's colour, as the theme draws it now
 * @param {{ nodeIds: Set<string>, edgeIds: Set<string> }|null} options.keep a selection, or null for all
 */
export const renderImage = async ({ element, bounds, format, background, keep = null }) => {
  const size = imageSize(bounds)
  const viewport = imageViewport(size)
  const options = {
    backgroundColor: background,
    width: size.width,
    height: size.height,
    style: { width: `${size.width}px`, height: `${size.height}px`, transform: transformOf(viewport) },
    filter: imageFilter(keep)
  }
  const url = format === 'svg' ? await toSvg(element, options) : await toPng(element, { ...options, pixelRatio: pngPixelRatio(size) })
  return dataUrlToBlob(url)
}

/** Saves a Blob under a name: an object URL on a short-lived link, revoked once clicked. */
export const download = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER)
}

/** Saves text as a file of the format's type. */
export const downloadText = (text, name, format) => download(new Blob([text], { type: EXPORT_FORMATS[format].type }), name)
