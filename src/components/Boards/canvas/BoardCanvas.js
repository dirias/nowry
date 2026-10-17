import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Background, BackgroundVariant, ConnectionMode, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, Typography } from '@mui/joy'
import { useColorScheme } from '@mui/joy/styles'
import {
  bounds,
  DEFAULT_NOTE_COLOR,
  DEFAULT_SIZES,
  addChild,
  addNote,
  addSibling,
  connect,
  duplicateNodes,
  frameSelection,
  moveNodes,
  nextId,
  nodesInFrame,
  removeLinks,
  removeNodes,
  updateLink,
  updateNode
} from '@nowry/core/domain/board'
import { BoardCanvasContext } from './BoardCanvasContext'
import NoteNode from './nodes/NoteNode'
import TextNode from './nodes/TextNode'
import FrameNode from './nodes/FrameNode'
import ItemNode from './nodes/ItemNode'
import LinkEdge from './LinkEdge'
import ToolDock from './ToolDock'
import ZoomControls from './ZoomControls'
import SelectionBar from './SelectionBar'
import FrameDrawLayer from './FrameDrawLayer'
import ItemPicker from './ItemPicker'
import { addItem } from './itemEdits'
import useBoardKeys from './useBoardKeys'
import { addFrame, addText, placeNodes, presentIds, resizeNodes } from './boardEdits'
import { frameRanks, toFlowEdge, toFlowNode } from './toFlow'
import { canvasSx, hintSx } from './canvasStyles'
import { viewDuration } from './motion'
import useBoardClipboard, { itemTitleOf } from './useBoardClipboard'
import useBoardExport from './useBoardExport'
import { useBoardLinks } from '../boardLinksContext'

const nodeTypes = { note: NoteNode, text: TextNode, frame: FrameNode, item: ItemNode }
const edgeTypes = { link: LinkEdge }

/** Shift adds to a selection, as do ⌘ and Ctrl (PRD D3). */
const MULTI_SELECT_KEYS = ['Shift', 'Meta', 'Control']
/** ⌘ wheel zooms on a Mac, Ctrl wheel elsewhere; pinch always does. */
const ZOOM_KEYS = ['Meta', 'Control']
const VIEW_KEYS = ['selected', 'editing', 'plus', 'fresh', 'measured', 'rank']
const PANNING_TOOLS = ['select', 'hand']
/** A double-click this soon after the Note tool made a note, at the same spot, is that same gesture. */
const TOOL_DOUBLE_CLICK_MS = 500
const CONNECTION_LINE = { stroke: 'var(--joy-palette-primary-solidBg)', strokeWidth: 1.6 }
const PRO_OPTIONS = { hideAttribution: true }
const FIT_OPTIONS = { padding: 0.2, maxZoom: 1 }

const NOTE = DEFAULT_SIZES.note
/** A note made at a point sits with that point near the middle of its first line. */
const noteAt = (point) => ({ x: Math.round(point.x - NOTE.w / 2), y: Math.round(point.y - 24) })

const isUnsavedViewport = (vp) => !vp || (vp.x === 0 && vp.y === 0 && vp.zoom === 1)

const applySelect = (prev, changes) => {
  const next = new Set(prev)
  changes.forEach((c) => (c.selected ? next.add(c.id) : next.delete(c.id)))
  return [...next]
}

const mergeMeasured = (prev, dims) => {
  let changed = false
  const next = { ...prev }
  Object.entries(dims).forEach(([id, d]) => {
    const old = prev[id]
    if (old && old.width === d.width && old.height === d.height) return
    next[id] = { width: d.width, height: d.height }
    changed = true
  })
  return changed ? next : prev
}

/**
 * The canvas (BOARD-004, PRD D2–D4, canvas boards 2 and 3): the board drawn by
 * `@xyflow/react` with the library's graph defaults replaced by the one
 * grammar canvases share. Every change goes through `apply`, so it is saved
 * and can be undone; a drag or a resize is one undo step (`checkpoint` at its
 * start, then `history: false` while it moves). Selection, editing and the
 * tool are this component's state and are never saved.
 */
export default function BoardCanvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function CanvasInner({
  board,
  apply,
  checkpoint,
  undo,
  redo,
  setViewport,
  startWithNote = false,
  hint = false,
  onShowKeys,
  selectionActions,
  onStatus,
  onError,
  commandsRef
}) {
  const { t, i18n } = useTranslation()
  const flow = useReactFlow()
  const { mode, systemMode } = useColorScheme()
  const wrapperRef = useRef(null)

  const [tool, setTool] = useState('select')
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingEdgeId, setEditingEdgeId] = useState(null)
  const [measured, setMeasured] = useState({})
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)

  const boardRef = useRef(board)
  boardRef.current = board
  const freshRef = useRef(new Set())
  const editRef = useRef(null)
  const dragRef = useRef(null)
  const startedRef = useRef(false)
  const lastColorRef = useRef(DEFAULT_NOTE_COLOR)
  const cacheRef = useRef(new Map())
  const [opening] = useState(() => ({ viewport: board.viewport, fit: isUnsavedViewport(board.viewport) && board.nodes.length > 0 }))

  const stateRef = useRef({})
  stateRef.current = { tool, selectedIds, selectedEdgeIds, editingId }

  // ── The board, as the library draws it ────────────────────────────────────
  const nodes = useMemo(() => {
    const ranks = frameRanks(board.nodes)
    const chosen = new Set(selectedIds)
    const single = selectedIds.length === 1 && selectedEdgeIds.length === 0 ? selectedIds[0] : null
    const previous = cacheRef.current
    const cache = new Map()
    const out = board.nodes.map((node) => {
      const view = {
        selected: chosen.has(node.id),
        editing: editingId === node.id,
        plus: node.kind === 'note' && single === node.id && tool === 'select' && !dragging,
        fresh: freshRef.current.has(node.id),
        measured: measured[node.id],
        rank: ranks.get(node.id) ?? 0
      }
      const hit = previous.get(node.id)
      const same = hit && hit.node === node && VIEW_KEYS.every((key) => hit.view[key] === view[key])
      const flowNode = same ? hit.flowNode : toFlowNode(node, view)
      cache.set(node.id, { node, view, flowNode })
      return flowNode
    })
    cacheRef.current = cache
    return out
  }, [board.nodes, selectedIds, selectedEdgeIds, editingId, measured, tool, dragging])

  const edges = useMemo(() => {
    const chosen = new Set(selectedEdgeIds)
    return board.links.map((link) => toFlowEdge(link, { selected: chosen.has(link.id), editing: editingEdgeId === link.id }))
  }, [board.links, selectedEdgeIds, editingEdgeId])

  const selectedNodes = useMemo(() => {
    const chosen = new Set(selectedIds)
    return board.nodes.filter((n) => chosen.has(n.id))
  }, [board.nodes, selectedIds])

  // ── Editing ───────────────────────────────────────────────────────────────
  const focusCanvas = useCallback(() => wrapperRef.current?.focus({ preventScroll: true }), [])

  /**
   * After an action that can unmount the focused node (delete, undo, redo,
   * duplicate's selection swap), focus would fall to the page body and every
   * key after it would go nowhere: ⇧1 did nothing after a delete. The canvas
   * takes focus back once the node has gone.
   */
  const keepFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const wrapper = wrapperRef.current
      if (wrapper && !wrapper.contains(wrapper.ownerDocument.activeElement)) focusCanvas()
    })
  }, [focusCanvas])

  /** Writes a node's text; the first keystroke of an edit records the undo step, the rest join it. */
  const writeText = useCallback(
    (id, next) => {
      const session = editRef.current
      const ours = session && session.id === id
      const record = !(ours && session.recorded)
      if (ours) session.recorded = true
      apply(
        (b) => {
          const node = b.nodes.find((n) => n.id === id)
          if (!node) return null
          const text = typeof next === 'function' ? next(node.text ?? '') : next
          return text === node.text ? null : updateNode(b, id, { text })
        },
        { history: record }
      )
    },
    [apply]
  )

  /** `fresh`: the node was just made, so its first words join the step that made it. */
  const beginEdit = useCallback(
    (id, { fresh = false, append = '' } = {}) => {
      editRef.current = { id, recorded: fresh }
      setEditingEdgeId(null)
      setSelectedEdgeIds([])
      setSelectedIds([id])
      setEditingId(id)
      if (append) writeText(id, (text) => text + append)
    },
    [writeText]
  )

  const finishEditing = useCallback(
    (id, { refocus = true } = {}) => {
      setEditingId((current) => (current === id ? null : current))
      if (editRef.current?.id === id) {
        editRef.current = null
        if (refocus) focusCanvas()
      }
    },
    [focusCanvas]
  )

  const exists = useCallback((id) => boardRef.current.nodes.some((n) => n.id === id), [])

  /** A node made by the canvas: remembered as new (it scales in), selected, and typing. */
  const made = useCallback(
    (id) => {
      freshRef.current.add(id)
      beginEdit(id, { fresh: true })
    },
    [beginEdit]
  )

  const makeChild = useCallback(
    (id, side) => {
      if (!exists(id)) return
      const childId = nextId('n')
      apply((b) => addChild(b, id, { side, id: childId }))
      made(childId)
    },
    [apply, made, exists]
  )

  const makeSibling = useCallback(
    (id) => {
      if (!exists(id)) return
      const siblingId = nextId('n')
      apply((b) => addSibling(b, id, { id: siblingId }))
      made(siblingId)
    },
    [apply, made, exists]
  )

  const createNote = useCallback(
    (point, { from = null } = {}) => {
      const id = nextId('n')
      const source = from ? boardRef.current.nodes.find((n) => n.id === from) : null
      const color = source?.kind === 'note' && source.color ? source.color : lastColorRef.current
      apply((b) => {
        const next = addNote(b, { id, ...noteAt(point), color })
        return from ? connect(next, from, id) : next
      })
      made(id)
    },
    [apply, made]
  )

  const createText = useCallback(
    (point) => {
      const id = nextId('t')
      apply((b) => addText(b, { id, x: Math.round(point.x), y: Math.round(point.y - 20) }))
      made(id)
    },
    [apply, made]
  )

  const writeTitle = useCallback((id, title) => apply((b) => updateNode(b, id, { title })), [apply])

  const editLabel = useCallback((id) => {
    setSelectedIds([])
    setSelectedEdgeIds([id])
    setEditingEdgeId(id)
  }, [])

  const finishLabel = useCallback(
    (id, label, { refocus = true } = {}) => {
      setEditingEdgeId((current) => (current === id ? null : current))
      if (refocus) focusCanvas()
      if (label === null) return
      apply((b) => {
        const link = b.links.find((l) => l.id === id)
        return link && link.label !== label ? updateLink(b, id, { label }) : null
      })
    },
    [apply, focusCanvas]
  )

  // ── The selection ─────────────────────────────────────────────────────────
  const selection = useCallback(() => {
    const b = boardRef.current
    return { ids: presentIds(b.nodes, stateRef.current.selectedIds), edgeIds: presentIds(b.links, stateRef.current.selectedEdgeIds) }
  }, [])

  const removeSelection = useCallback(() => {
    const { ids, edgeIds } = selection()
    if (!ids.length && !edgeIds.length) return
    apply((b) => removeLinks(removeNodes(b, ids), edgeIds))
    setSelectedIds([])
    setSelectedEdgeIds([])
    keepFocus()
  }, [apply, selection, keepFocus])

  const duplicate = useCallback(() => {
    const { ids } = selection()
    if (!ids.length) return
    let copies = []
    apply((b) => {
      const next = duplicateNodes(b, ids)
      copies = next.nodes.slice(b.nodes.length).map((n) => n.id)
      return next
    })
    copies.forEach((id) => freshRef.current.add(id))
    setSelectedIds(copies)
  }, [apply, selection])

  const frameTheSelection = useCallback(() => {
    const { ids } = selection()
    if (!ids.length) return
    const frameId = nextId('f')
    apply((b) => frameSelection(b, ids, '', { id: frameId }))
    beginEdit(frameId)
  }, [apply, beginEdit, selection])

  const setColor = useCallback(
    (color) => {
      lastColorRef.current = color
      const ids = new Set(selection().ids)
      apply((b) => ({ ...b, nodes: b.nodes.map((n) => (ids.has(n.id) && n.kind === 'note' && n.color !== color ? { ...n, color } : n)) }))
    },
    [apply, selection]
  )

  const setSize = useCallback(
    (size) => {
      const ids = new Set(selection().ids)
      apply((b) => ({ ...b, nodes: b.nodes.map((n) => (ids.has(n.id) && n.kind === 'text' && n.size !== size ? { ...n, size } : n)) }))
    },
    [apply, selection]
  )

  // ── In and out (PRD D9): paste, copy, cut, import, export ─────────────────
  const boardLinks = useBoardLinks()
  const itemTitle = useMemo(() => itemTitleOf(t, boardLinks), [t, boardLinks])

  const viewCentre = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 0, height: 0 }
    return flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }, [flow])

  /** Pans, at the same zoom, to nodes placed out of sight (a paste moved clear of the board). */
  const reveal = useCallback(
    (nodes) => {
      const box = bounds(nodes)
      const rect = wrapperRef.current?.getBoundingClientRect?.()
      if (!box || !rect?.width) return
      const vp = flow.getViewport()
      const seen = { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom, w: rect.width / vp.zoom, h: rect.height / vp.zoom }
      const inside = box.x >= seen.x && box.y >= seen.y && box.x + box.w <= seen.x + seen.w && box.y + box.h <= seen.y + seen.h
      if (!inside) flow.setCenter(box.x + box.w / 2, box.y + box.h / 2, { zoom: vp.zoom, duration: viewDuration() })
    },
    [flow]
  )

  const selectIncoming = useCallback((ids) => {
    ids.forEach((id) => freshRef.current.add(id))
    setSelectedEdgeIds([])
    setSelectedIds(ids)
  }, [])

  const { importFile } = useBoardClipboard({
    wrapperRef,
    boardRef,
    apply,
    viewCentre,
    reveal,
    isEditing: () => Boolean(stateRef.current.editingId) || editingEdgeId !== null,
    getSelectedIds: () => selection().ids,
    select: selectIncoming,
    removeSelection,
    onStatus,
    itemTitle,
    t,
    language: i18n?.language
  })

  const exportAs = useBoardExport({
    wrapperRef,
    boardRef,
    flow,
    getSelection: selection,
    setSelection: ({ ids, edgeIds }) => {
      setSelectedIds(ids)
      setSelectedEdgeIds(edgeIds)
    },
    itemTitle,
    onStatus,
    onError,
    t
  })

  // The page's board menu reaches the canvas through these (Import a file…, Export).
  useImperativeHandle(commandsRef, () => ({ importFile, exportAs, focus: focusCanvas }), [importFile, exportAs, focusCanvas])

  // ── Items (BOARD-005, PRD D6): `I` picks a task, a milestone or a goal ───
  const [picking, setPicking] = useState(false)
  const lastClickRef = useRef(null)

  /** The last click on the canvas while it is still in view, else the view's centre. */
  const placement = useCallback(() => {
    const last = lastClickRef.current
    const rect = wrapperRef.current?.getBoundingClientRect?.()
    if (last && rect && rect.width > 0) {
      const a = flow.screenToFlowPosition({ x: rect.left, y: rect.top })
      const b = flow.screenToFlowPosition({ x: rect.right, y: rect.bottom })
      if (last.x >= a.x && last.x <= b.x && last.y >= a.y && last.y <= b.y) return last
    }
    return viewCentre()
  }, [flow, viewCentre])

  const placeItem = useCallback(
    ({ ref, title }) => {
      const id = nextId('i')
      const point = placement()
      lastClickRef.current = null
      apply((b) => addItem(b, { id, x: point.x, y: point.y, ref, title }))
      setPicking(false)
      selectIncoming([id])
      keepFocus()
    },
    [apply, placement, selectIncoming, keepFocus]
  )

  // ── Keys (PRD D3) ─────────────────────────────────────────────────────────
  const singleNode = useCallback(() => {
    const { ids, edgeIds } = selection()
    return ids.length === 1 && !edgeIds.length ? boardRef.current.nodes.find((n) => n.id === ids[0]) : null
  }, [selection])

  const onKeyDown = useBoardKeys(
    () => {
      const { ids, edgeIds } = selection()
      return { editing: Boolean(stateRef.current.editingId), single: singleNode(), count: ids.length + edgeIds.length }
    },
    {
      undo: () => {
        undo()
        keepFocus()
      },
      redo: () => {
        redo()
        keepFocus()
      },
      selectAll: () => {
        setSelectedEdgeIds([])
        setSelectedIds(boardRef.current.nodes.map((n) => n.id))
      },
      duplicate,
      frameSelection: frameTheSelection,
      zoomIn: () => flow.zoomIn({ duration: viewDuration() }),
      zoomOut: () => flow.zoomOut({ duration: viewDuration() }),
      fitBoard: () => flow.fitView({ padding: 0.2, duration: viewDuration() }),
      fitSelection: () => {
        const { ids } = selection()
        if (ids.length) flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.3, maxZoom: 2, duration: viewDuration() })
      },
      escape: () => {
        setTool('select')
        setSelectedIds([])
        setSelectedEdgeIds([])
      },
      remove: removeSelection,
      nudge: ({ dx, dy }) => {
        const { ids } = selection()
        if (ids.length) apply((b) => moveNodes(b, ids, { dx, dy }))
      },
      child: () => makeChild(singleNode().id, 'right'),
      sibling: () => makeSibling(singleNode().id),
      edit: () => beginEdit(singleNode().id),
      type: ({ char }) => beginEdit(singleNode().id, { append: char }),
      keys: () => onShowKeys?.(),
      tool: ({ tool: next }) => {
        // `I` opens the item picker rather than arming a tool (BOARD-005).
        if (next === 'item') setPicking(true)
        else setTool(next)
      }
    }
  )

  // ── The library's events ──────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      const moves = {}
      const sizes = {}
      const dims = {}
      const selects = []
      let dragged = false
      changes.forEach((c) => {
        if (c.type === 'select') selects.push(c)
        else if (c.type === 'position' && c.position) {
          moves[c.id] = c.position
          if (c.dragging !== undefined) dragged = true
        } else if (c.type === 'dimensions' && c.dimensions) {
          if (c.resizing === undefined) dims[c.id] = c.dimensions
          else
            sizes[c.id] = {
              width: c.setAttributes === 'height' ? null : c.dimensions.width,
              height: c.setAttributes === 'width' ? null : c.dimensions.height
            }
        }
      })
      if (selects.length) setSelectedIds((prev) => applySelect(prev, selects))
      if (Object.keys(dims).length) setMeasured((prev) => mergeMeasured(prev, dims))
      if (Object.keys(moves).length || Object.keys(sizes).length) {
        apply((b) => resizeNodes(placeNodes(b, moves, dragged ? dragRef.current : null), sizes), { history: false })
      }
    },
    [apply]
  )

  const onEdgesChange = useCallback((changes) => {
    const selects = changes.filter((c) => c.type === 'select')
    if (selects.length) setSelectedEdgeIds((prev) => applySelect(prev, selects))
  }, [])

  const onNodeDragStart = useCallback(
    (_event, _node, draggedNodes = []) => {
      checkpoint()
      const b = boardRef.current
      const starts = {}
      b.nodes.forEach((n) => {
        starts[n.id] = { x: n.x, y: n.y }
      })
      const carried = {}
      draggedNodes.forEach((d) => {
        if (d.type === 'frame') carried[d.id] = nodesInFrame(b, d.id).map((n) => n.id)
      })
      dragRef.current = { starts, carried }
      setDragging(true)
    },
    [checkpoint]
  )

  const onNodeDragStop = useCallback(() => setDragging(false), [])

  const onConnect = useCallback((c) => apply((b) => connect(b, c.source, c.target)), [apply])

  /** A link dropped on a note links them; dropped on empty canvas, it makes a linked note there (PRD D3). */
  const onConnectEnd = useCallback(
    (event, state) => {
      if (state?.isValid) return
      const from = state?.fromNode?.id
      if (!from) return
      const point = event?.changedTouches?.[0] ?? event
      if (point?.clientX === undefined) return
      const under = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(point.clientX, point.clientY) : null
      const nodeEl = under?.closest?.('.react-flow__node')
      if (nodeEl) {
        const to = nodeEl.getAttribute('data-id')
        if (to && to !== from && exists(to)) apply((b) => connect(b, from, to))
        return
      }
      createNote(flow.screenToFlowPosition({ x: point.clientX, y: point.clientY }), { from })
    },
    [apply, createNote, exists, flow]
  )

  const isValidConnection = useCallback((c) => c.source !== c.target, [])

  const toolMadeRef = useRef(null)
  const onPaneClick = useCallback(
    (event) => {
      lastClickRef.current = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const current = stateRef.current.tool
      if (current !== 'note' && current !== 'text') return
      const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      if (current === 'note') createNote(point)
      else createText(point)
      // A double-click with the tool is two clicks and a double-click: the
      // first click made the note, so the double-click must not make another.
      toolMadeRef.current = { at: Date.now(), x: event.clientX, y: event.clientY }
      setTool('select')
    },
    [createNote, createText, flow]
  )

  /** Double-click empty canvas: a note there, typing, in the last colour used. */
  const onDoubleClick = useCallback(
    (event) => {
      if (!event.target?.classList?.contains('react-flow__pane')) return
      if (!PANNING_TOOLS.includes(stateRef.current.tool)) return
      const made = toolMadeRef.current
      if (made && Date.now() - made.at < TOOL_DOUBLE_CLICK_MS && Math.hypot(event.clientX - made.x, event.clientY - made.y) < 8) return
      createNote(flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    },
    [createNote, flow]
  )

  const onNodeDoubleClick = useCallback(
    (event, node) => {
      if (stateRef.current.editingId === node.id) return
      if (node.type === 'note' || node.type === 'text') beginEdit(node.id)
      else if (node.type === 'frame' && event.target?.closest?.('.board-frame-title')) beginEdit(node.id)
    },
    [beginEdit]
  )

  /**
   * Shift- or ⌘-click adds a node to the selection, or takes it out. The
   * library decides this from a key it saw go down, which it can miss (focus
   * elsewhere when Shift was pressed); the click carries its own modifiers, so
   * they decide, over the selection as it was before the click.
   */
  const onNodeClick = useCallback((event, node) => {
    if (!(event.shiftKey || event.metaKey || event.ctrlKey)) return
    const before = stateRef.current.selectedIds
    setSelectedIds(before.includes(node.id) ? before.filter((id) => id !== node.id) : [...before, node.id])
  }, [])

  const onEdgeDoubleClick = useCallback((_event, edge) => editLabel(edge.id), [editLabel])

  const onMoveEnd = useCallback((_event, vp) => vp && setViewport?.({ x: vp.x, y: vp.y, zoom: vp.zoom }), [setViewport])

  const onInit = useCallback(
    (instance) => {
      if (startWithNote && !startedRef.current && boardRef.current.nodes.length === 0) {
        // A new board opens centred on one note, already typing (PRD D1).
        startedRef.current = true
        const rect = wrapperRef.current?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 0, height: 0 }
        createNote(instance.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }))
        return
      }
      // A second init (React's strict mode) must not take focus from the note being typed.
      if (!stateRef.current.editingId) focusCanvas()
    },
    [startWithNote, createNote, focusCanvas]
  )

  const onDraw = useCallback(
    (from, to) => {
      const a = flow.screenToFlowPosition(from)
      const b = flow.screenToFlowPosition(to)
      const id = nextId('f')
      const clicked = Math.hypot(to.x - from.x, to.y - from.y) < 8
      const rect = clicked
        ? { x: Math.round(a.x), y: Math.round(a.y) }
        : {
            x: Math.round(Math.min(a.x, b.x)),
            y: Math.round(Math.min(a.y, b.y)),
            w: Math.max(120, Math.round(Math.abs(b.x - a.x))),
            h: Math.max(80, Math.round(Math.abs(b.y - a.y)))
          }
      apply((board) => addFrame(board, { id, ...rect }))
      setTool('select')
      beginEdit(id)
    },
    [apply, beginEdit, flow]
  )

  const canvas = useMemo(
    () => ({ writeText, finishEditing, makeChild, makeSibling, checkpoint, writeTitle, editLabel, finishLabel }),
    [writeText, finishEditing, makeChild, makeSibling, checkpoint, writeTitle, editLabel, finishLabel]
  )

  const hand = tool === 'hand'
  const noteCount = board.nodes.filter((n) => n.kind === 'note').length

  return (
    <Box
      ref={wrapperRef}
      tabIndex={0}
      role='region'
      aria-label={t('boards.canvas.label')}
      data-testid='board-canvas'
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
      sx={{ ...canvasSx, ...(hand ? { '& .react-flow__pane': { cursor: 'grab' } } : {}) }}
    >
      <BoardCanvasContext.Provider value={canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onPaneClick={onPaneClick}
          onDoubleClick={onDoubleClick}
          onNodeClick={onNodeClick}
          onMoveEnd={onMoveEnd}
          onInit={onInit}
          defaultViewport={opening.viewport}
          fitView={opening.fit}
          fitViewOptions={FIT_OPTIONS}
          minZoom={0.1}
          maxZoom={4}
          panOnDrag
          selectionOnDrag={false}
          selectionKeyCode='Shift'
          multiSelectionKeyCode={MULTI_SELECT_KEYS}
          panActivationKeyCode={focused ? 'Space' : null}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          zoomActivationKeyCode={ZOOM_KEYS}
          zoomOnDoubleClick={false}
          deleteKeyCode={null}
          disableKeyboardA11y
          autoPanOnNodeFocus={false}
          connectionMode={ConnectionMode.Loose}
          connectOnClick={false}
          connectionLineStyle={CONNECTION_LINE}
          nodesDraggable={!hand}
          nodesConnectable={!hand}
          elementsSelectable={!hand}
          elevateNodesOnSelect={false}
          elevateEdgesOnSelect={false}
          colorMode={(mode === 'system' ? systemMode : mode) === 'dark' ? 'dark' : 'light'}
          proOptions={PRO_OPTIONS}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color='var(--joy-palette-neutral-outlinedBorder)' />
          <SelectionBar
            nodes={selectedNodes}
            visible={selectedNodes.length > 0 && !editingId && !dragging}
            onColor={(color) => {
              setColor(color)
              focusCanvas()
            }}
            onSize={(size) => {
              setSize(size)
              focusCanvas()
            }}
            onFrame={frameTheSelection}
            onDelete={() => {
              removeSelection()
              focusCanvas()
            }}
            actions={selectionActions?.(selectedNodes) ?? null}
          />
        </ReactFlow>
        <ToolDock
          tool={tool}
          onTool={(next) => {
            if (next === 'item') setPicking(true)
            else {
              setTool(next)
              focusCanvas()
            }
          }}
        />
        <ZoomControls />
        {tool === 'frame' && <FrameDrawLayer onDraw={onDraw} />}
        {/* Mounted only while open, so its search field takes focus each time it opens. */}
        {picking && (
          <ItemPicker
            open
            onClose={() => {
              setPicking(false)
              keepFocus()
            }}
            onPick={placeItem}
          />
        )}
        {hint && noteCount < 2 && (
          <Box sx={hintSx} data-testid='board-first-hint'>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('boards.hint.first')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('boards.hint.next')}
            </Typography>
          </Box>
        )}
      </BoardCanvasContext.Provider>
    </Box>
  )
}
