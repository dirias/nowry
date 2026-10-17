import { useCallback, useEffect, useRef } from 'react'
import {
  fromParsed,
  placeClear,
  insert,
  limitCheck,
  nextId,
  parseJsonCanvas,
  parseMermaid,
  parseOutline,
  parseText,
  detectFormat,
  parseLines,
  toPlainText
} from '@nowry/core/domain/board'
import { isOwnedTarget } from './useBoardKeys'

/** A file bigger than this is refused before it is read. */
export const MAX_IMPORT_BYTES = 1024 * 1024

/** What the file picker offers (PRD D9). */
export const IMPORT_ACCEPT = '.mmd,.mermaid,.md,.markdown,.txt,.canvas'

/** The board's own format on the clipboard, beside the plain text (PRD D9). */
export const BOARD_MIME = 'application/x-nowry-board+json'

/** A copy pasted again lands this far down and right of the one before. */
export const PASTE_OFFSET = 24

const PARSERS = { mermaid: parseMermaid, canvas: parseJsonCanvas, outline: parseOutline, lines: parseLines }

const SOURCE_KEYS = {
  mermaid: 'boards.inOut.source.mermaid',
  outline: 'boards.inOut.source.outline',
  canvas: 'boards.inOut.source.canvas',
  lines: 'boards.inOut.source.text'
}

/** The parts of a status line, in the order it names them. */
const PART_KEYS = [
  ['notes', 'boards.inOut.parts.notes'],
  ['texts', 'boards.inOut.parts.texts'],
  ['items', 'boards.inOut.parts.items'],
  ['links', 'boards.inOut.parts.links'],
  ['frames', 'boards.inOut.parts.frames']
]

const ITEM_KIND_KEYS = { task: 'boards.item.kind.task', milestone: 'boards.item.kind.milestone', goal: 'boards.item.kind.goal' }

/** The board's copy in this tab: the plain text it wrote and the fragment behind it. */
let lastCopy = null

/** For tests: forgets the last copy. */
export const resetLastCopy = () => {
  lastCopy = null
}

/** The format a file is read as: by its extension first, else by what it says. */
export const formatForFile = (name) => {
  const extension = String(name ?? '')
    .toLowerCase()
    .split('.')
    .pop()
  if (extension === 'canvas') return 'canvas'
  if (extension === 'mmd' || extension === 'mermaid') return 'mermaid'
  return null
}

/** A text read as a parsed graph, and which format it was. */
export const readIncoming = (text, format = null) => {
  const kind = format ?? detectFormat(text)
  const parsed = format ? PARSERS[format](text) : parseText(text)
  return { parsed, format: kind }
}

/** How many of each thing a fragment holds. */
export const countIncoming = ({ nodes = [], links = [] }) => ({
  notes: nodes.filter((n) => n.kind === 'note').length,
  texts: nodes.filter((n) => n.kind === 'text').length,
  items: nodes.filter((n) => n.kind === 'item').length,
  frames: nodes.filter((n) => n.kind === 'frame').length,
  links: links.length
})

/** "7 notes, 6 links and a frame": the parts there are, joined as the language joins a list. */
export const describeCounts = (t, counts) => {
  const parts = PART_KEYS.filter(([part]) => counts[part] > 0).map(([part, key]) => t(key, { count: counts[part] }))
  if (parts.length < 2) return parts[0] ?? ''
  const first = parts.slice(0, -1).join(t('boards.inOut.list.separator'))
  return t('boards.inOut.list.pair', { first, last: parts[parts.length - 1] })
}

/** The status line for what came in: pasted or imported, from a named source, or a board's own copy. */
export const incomingLine = (t, counts, { format = null, verb = 'pasted' } = {}) => {
  const what = describeCounts(t, counts)
  if (!format) return t('boards.inOut.pastedCopy', { what })
  const source = t(SOURCE_KEYS[format] ?? SOURCE_KEYS.lines)
  return verb === 'imported' ? t('boards.inOut.imported', { what, source }) : t('boards.inOut.pasted', { what, source })
}

/** The refusal when what comes in would pass a limit (PRD D10), or null. */
export const limitLine = (t, check, language) => {
  if (check.ok) return null
  const number = (n) => new Intl.NumberFormat(language).format(n)
  return check.nodes > check.maxNodes
    ? t('boards.inOut.tooManyNodes', { total: number(check.nodes), max: number(check.maxNodes) })
    : t('boards.inOut.tooManyLinks', { total: number(check.links), max: number(check.maxLinks) })
}

/** The selected nodes and the links among them. */
export const fragmentOf = (board, ids) => {
  const chosen = new Set(ids)
  return {
    nodes: board.nodes.filter((n) => chosen.has(n.id)),
    links: board.links.filter((l) => chosen.has(l.from) && chosen.has(l.to))
  }
}

/** A copied fragment made new: fresh ids, moved by `{ dx, dy }`, above the board's top; cards stay with the originals. */
export const copyFragment = (fragment, { dx = PASTE_OFFSET, dy = PASTE_OFFSET, zBase = 0 } = {}) => {
  const ids = new Map()
  const nodes = fragment.nodes.map((n, i) => {
    const id = nextId(n.kind === 'frame' ? 'f' : 'n')
    ids.set(n.id, id)
    return { ...n, id, x: n.x + dx, y: n.y + dy, z: n.kind === 'frame' ? n.z : zBase + 1 + i, cardIds: [] }
  })
  const links = fragment.links
    .filter((l) => ids.has(l.from) && ids.has(l.to))
    .map((l) => ({ ...l, id: nextId('l'), from: ids.get(l.from), to: ids.get(l.to) }))
  return { nodes, links }
}

/** The board's top z, so what comes in lies above it. */
export const topZ = (board) => board.nodes.filter((n) => n.kind !== 'frame').reduce((z, n) => Math.max(z, n.z ?? 0), 0)

/** An item's words for text out: the live title if the page has it, else the stored one, else its kind. */
export const itemTitleOf = (t, links) => (node) => {
  const reading = links?.read ? links.read(node.ref ?? null) : null
  if (reading?.status === 'ready' && reading.title) return reading.title
  return node.title || node.text || t(ITEM_KIND_KEYS[node.ref?.kind] ?? ITEM_KIND_KEYS.task)
}

const readOwnFormat = (data) => {
  try {
    const raw = data?.getData?.(BOARD_MIME)
    if (!raw) return null
    const doc = JSON.parse(raw)
    return Array.isArray(doc?.nodes) && Array.isArray(doc?.links) ? { nodes: doc.nodes, links: doc.links, raw } : null
  } catch {
    return null
  }
}

/** Reads a file as text (FileReader: every browser, and jsdom). */
export const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsText(file)
  })

const hasTextSelection = (doc) => {
  const selection = doc.defaultView?.getSelection?.()
  return Boolean(selection && !selection.isCollapsed && String(selection).length)
}

/**
 * Paste, copy, cut and import on the board (BOARD-008, PRD D9). The clipboard
 * events are heard on the document and acted on only while focus is on the
 * canvas itself, never while a note, a label or a title is being edited:
 * the field takes the paste. A paste is one `apply`, so one undo step; what
 * came in is selected and a status line names it, with Undo.
 *
 * @param {object} options
 * @param {object} options.wrapperRef the canvas container, which holds focus
 * @param {object} options.boardRef the board as it is now
 * @param {Function} options.apply the board's one way to change
 * @param {Function} options.viewCentre the centre of the visible canvas, in flow coordinates
 * @param {Function} [options.reveal] brings these nodes into view when they are out of it
 * @param {Function} options.isEditing whether a node or a link label is being edited
 * @param {Function} options.getSelectedIds the selected node ids still on the board
 * @param {Function} options.select selects exactly these new nodes
 * @param {Function} options.removeSelection removes the selection, as one step
 * @param {Function} options.onStatus `({ text, undo })` shows a status line
 * @param {Function} options.itemTitle an item's words
 * @param {Function} options.t
 * @param {string} options.language
 */
export default function useBoardClipboard(options) {
  const latest = useRef(options)
  latest.current = options

  /** Adds a fragment in one step, or refuses it over the limits; true when it went in. */
  const place = useCallback((incoming, line) => {
    const { boardRef, apply, select, onStatus, t, language } = latest.current
    if (!incoming.nodes.length) return false
    const refusal = limitLine(t, limitCheck(boardRef.current, incoming), language)
    if (refusal) {
      onStatus?.({ text: refusal })
      return false
    }
    apply((b) => insert(b, incoming))
    select(incoming.nodes.map((n) => n.id))
    onStatus?.({ text: line(countIncoming(incoming)), undo: true })
    return true
  }, [])

  /** Text in, as a paste or a file: parsed, laid out at the view's centre, added. */
  const takeIn = useCallback(
    (text, { format = null, verb = 'pasted' } = {}) => {
      const { boardRef, viewCentre, onStatus, t } = latest.current
      const { parsed, format: read } = readIncoming(text, format)
      if (parsed.error === 'unsupported') {
        onStatus?.({ text: t('boards.inOut.unsupportedMermaid') })
        return false
      }
      if (parsed.error) {
        if (verb === 'imported') onStatus?.({ text: t(parsed.error === 'empty' ? 'boards.inOut.empty' : 'boards.inOut.unreadable') })
        return false
      }
      // Laid out at the view's centre, then moved the least it can to cover nothing (BOARD-010).
      const laid = fromParsed(parsed, { origin: viewCentre(), zBase: topZ(boardRef.current) })
      const { incoming, offset } = placeClear(boardRef.current, laid)
      const went = place(incoming, (counts) => incomingLine(t, counts, { format: read, verb }))
      if (went && offset.moved) latest.current.reveal?.(incoming.nodes)
      return went
    },
    [place]
  )

  const pasteCopy = useCallback(
    (fragment, raw) => {
      const { boardRef, t } = latest.current
      const again = lastCopy && (lastCopy.raw === raw || lastCopy.fragment === fragment)
      const times = again ? (lastCopy.pastes += 1) : 1
      const incoming = copyFragment(fragment, { dx: PASTE_OFFSET * times, dy: PASTE_OFFSET * times, zBase: topZ(boardRef.current) })
      return place(incoming, (counts) => incomingLine(t, counts))
    },
    [place]
  )

  const importFile = useCallback(
    async (file) => {
      const { onStatus, t } = latest.current
      if (!file) return false
      if (file.size > MAX_IMPORT_BYTES) {
        onStatus?.({ text: t('boards.inOut.fileTooBig') })
        return false
      }
      let text
      try {
        text = await readFileText(file)
      } catch {
        onStatus?.({ text: t('boards.inOut.unreadable') })
        return false
      }
      return takeIn(text, { format: formatForFile(file.name), verb: 'imported' })
    },
    [takeIn]
  )

  useEffect(() => {
    const wrapper = latest.current.wrapperRef.current
    if (!wrapper) return undefined
    const doc = wrapper.ownerDocument

    /** The clipboard is the canvas's only while the canvas itself has focus and nothing is being typed. */
    const ours = () => {
      const active = doc.activeElement
      if (!active || !wrapper.contains(active) || isOwnedTarget(active)) return false
      return !latest.current.isEditing()
    }

    const onCopy = (event, cut = false) => {
      if (!ours() || hasTextSelection(doc) || !event.clipboardData) return
      const { boardRef, getSelectedIds, itemTitle, removeSelection } = latest.current
      const ids = getSelectedIds()
      if (!ids.length) return
      const fragment = fragmentOf(boardRef.current, ids)
      const text = toPlainText(fragment.nodes, { itemTitle })
      const raw = JSON.stringify({ nodes: fragment.nodes, links: fragment.links })
      event.preventDefault()
      event.clipboardData.setData('text/plain', text)
      try {
        event.clipboardData.setData(BOARD_MIME, raw)
      } catch {
        // A browser without custom types keeps the copy in this tab only.
      }
      lastCopy = { text, raw, fragment, pastes: 0 }
      if (cut) removeSelection()
    }

    const onPaste = (event) => {
      if (!ours() || !event.clipboardData) return
      const data = event.clipboardData
      const text = data.getData('text/plain') ?? ''
      const own = readOwnFormat(data)
      if (own) {
        event.preventDefault()
        pasteCopy(own.raw === lastCopy?.raw ? lastCopy.fragment : own, own.raw)
        return
      }
      if (lastCopy && text === lastCopy.text) {
        event.preventDefault()
        pasteCopy(lastCopy.fragment, lastCopy.raw)
        return
      }
      if (!text.trim()) return
      event.preventDefault()
      takeIn(text)
    }

    const copy = (event) => onCopy(event)
    const cut = (event) => onCopy(event, true)
    doc.addEventListener('copy', copy)
    doc.addEventListener('cut', cut)
    doc.addEventListener('paste', onPaste)
    return () => {
      doc.removeEventListener('copy', copy)
      doc.removeEventListener('cut', cut)
      doc.removeEventListener('paste', onPaste)
    }
  }, [pasteCopy, takeIn])

  return { takeIn, importFile }
}
