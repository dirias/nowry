import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Box } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical'
import CommentComposer from '../../Books/Comments/CommentComposer'
import CommentHoverPreview from '../../Books/Comments/CommentHoverPreview'
import { requestCommentFocus, subscribeActiveComment } from '../../Books/Comments/commentFocusBus'

// How many characters of surrounding plain text are captured on either side of
// the quote — matches the backend anchor contract (anchor.prefix / anchor.suffix).
const PREFIX_SUFFIX_LEN = 40

// Re-locating comments reacts to content changes on a debounce, not on every
// keystroke — recomputing DOM ranges for every loaded comment is not free.
const RELOCATE_DEBOUNCE_MS = 400

const COMPOSER_WIDTH = 320
const VIEWPORT_MARGIN = 8
// No live DOM node to measure until the composer mounts — a conservative
// estimate keeps the clamp from letting it render off the bottom edge.
const COMPOSER_HEIGHT_ESTIMATE = 180
// Matches CommentCard.js's own truncation length for aria-label previews.
const ANCHOR_ARIA_TRUNCATE_LEN = 60

/**
 * Walk every text node under `root` in document order, building one
 * concatenated plain-text string plus a lookup table mapping character offset
 * ranges back to their DOM (node, localOffset).
 *
 * This DOM-anchored offset space is used for both capturing new comment
 * anchors and re-locating/rendering existing ones, because it round-trips
 * trivially back to a live DOM Range for drawing highlights — unlike Lexical's
 * $getRoot().getTextContent() offsets, which would need a second remapping
 * step to reach the DOM. It stays consistent because both directions
 * (capture and re-locate) walk the same live ContentEditable.
 */
function buildTextMap(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let text = ''
  const nodes = []
  let node = walker.nextNode()
  while (node) {
    const value = node.nodeValue || ''
    if (value) {
      nodes.push({ node, start: text.length, end: text.length + value.length })
      text += value
    }
    node = walker.nextNode()
  }
  return { text, nodes }
}

function domPointToOffset(textMap, targetNode, targetOffset) {
  const entry = textMap.nodes.find((n) => n.node === targetNode)
  if (!entry) return null
  return entry.start + targetOffset
}

function offsetToDomPoint(textMap, offset) {
  for (const entry of textMap.nodes) {
    if (offset >= entry.start && offset <= entry.end) {
      return { node: entry.node, offset: offset - entry.start }
    }
  }
  const last = textMap.nodes[textMap.nodes.length - 1]
  return last ? { node: last.node, offset: last.node.nodeValue.length } : null
}

// Best-effort top-level block index — same "walk up to the root's direct
// child" technique Editor.js already uses to anchor diagram inserts.
function readBlockIndex(editor) {
  let blockIndex = 0
  editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    const root = $getRoot()
    let topBlock = selection.anchor.getNode()
    while (topBlock.getParent() !== root && topBlock.getParent() !== null) {
      topBlock = topBlock.getParent()
    }
    const index = root.getChildren().findIndex((child) => child.getKey() === topBlock.getKey())
    if (index !== -1) blockIndex = index
  })
  return blockIndex
}

/**
 * CommentAnchorPlugin — Lexical plugin that:
 *  1. Exposes an imperative `openComposerForSelection()` (via ref), triggered
 *     by the "Add note" option in FloatingToolbarPlugin/TextMenu's dispatch.
 *  2. Re-locates every loaded `comments` anchor in the live document (on mount
 *     and on debounced content-change), classifying each as resolved or
 *     orphaned in local state only — never written back to the API.
 *  3. Renders a low-opacity highlight overlay for every resolved anchor.
 *  4. Reports { commentId, topY } for every resolved anchor via
 *     `onAnchorPositionsChange`, consumed by CommentMarginRail.
 *
 * `topY` is expressed in DOCUMENT space — pixels below the top of
 * `#editor-pages-container` — not in viewport space. That is the whole reason
 * the margin rail can track scrolling on the compositor: an anchor's document
 * Y does not change when the reader scrolls, only the viewport moves, so
 * nothing here has to run on scroll at all. It is also, by construction, the
 * exact same number as the first highlight rect's `top` (both are derived from
 * the same `getClientRects()` pass against the same container rect), which is
 * what keeps the highlight and its card pixel-aligned with each other.
 *
 * Deliberately resource-agnostic: it only knows about `comments` (already
 * scoped by the caller) and never references "book" or any other resource type.
 */
const CommentAnchorPlugin = forwardRef(function CommentAnchorPlugin(
  { comments = [], onAnchorPositionsChange, onAnchorStatusesChange, onCreateComment, onError },
  ref
) {
  const { t } = useTranslation()
  const [editor] = useLexicalComposerContext()
  const [composer, setComposer] = useState(null) // { anchor, position } | null
  const [highlightRects, setHighlightRects] = useState({}) // commentId -> [{top,left,width,height}]
  // { commentId, clientX, clientY, trigger: 'mouse' | 'focus' } | null — drives
  // the read-only hover/focus preview card (see CommentHoverPreview).
  const [hoverPreview, setHoverPreview] = useState(null)
  // Mirrors the margin rail's focused card, over commentFocusBus — drives the
  // intensified highlight that pairs a card with its text.
  const [activeCommentId, setActiveCommentId] = useState(null)
  const rangesRef = useRef({}) // commentId -> Range (only for resolved anchors)
  const highlightRectsRef = useRef({}) // mirrors highlightRects for the mousemove hit-test (avoids stale closures)
  const relocateTimeoutRef = useRef(null)
  const onAnchorPositionsChangeRef = useRef(onAnchorPositionsChange)
  const onAnchorStatusesChangeRef = useRef(onAnchorStatusesChange)
  useEffect(() => {
    onAnchorPositionsChangeRef.current = onAnchorPositionsChange
    onAnchorStatusesChangeRef.current = onAnchorStatusesChange
  }, [onAnchorPositionsChange, onAnchorStatusesChange])

  useEffect(() => {
    highlightRectsRef.current = highlightRects
  }, [highlightRects])

  useEffect(() => subscribeActiveComment(setActiveCommentId), [])

  const commentsById = useMemo(() => {
    const map = new Map()
    comments.forEach((comment) => map.set(comment._id, comment))
    return map
  }, [comments])

  const getContainer = useCallback(() => {
    const rootEl = editor.getRootElement()
    return rootEl?.closest('#editor-pages-container') || rootEl?.parentElement || null
  }, [editor])

  const relocateComments = useCallback(() => {
    const rootEl = editor.getRootElement()
    const container = getContainer()
    if (!rootEl || !container) return

    const textMap = buildTextMap(rootEl)
    const containerRect = container.getBoundingClientRect()
    const nextStatuses = {}
    const nextHighlightRects = {}
    const nextRanges = {}

    comments.forEach((comment) => {
      // Every map below is keyed by `_id`. A comment without one would key each
      // map under the string "undefined", silently collapsing ALL such comments
      // into a single entry — one highlight painted, the rest invisible. Skip
      // and warn instead of corrupting the maps. (comments.service.js normalises
      // the API's `id` into `_id`; this is the backstop if that ever regresses.)
      if (!comment._id) {
        console.warn('CommentAnchorPlugin: skipping comment with no _id', comment)
        return
      }

      const anchor = comment.anchor || {}
      const { quote, prefix, suffix } = anchor
      if (!quote) {
        nextStatuses[comment._id] = 'orphaned'
        return
      }

      let start = anchor.start_offset
      let end = anchor.end_offset
      const storedOffsetsMatch = typeof start === 'number' && typeof end === 'number' && textMap.text.slice(start, end) === quote

      if (!storedOffsetsMatch) {
        // Stored offset moved (content edited above it) — fall back to an
        // indexOf search disambiguated by the stored prefix/suffix.
        const candidates = []
        let idx = textMap.text.indexOf(quote)
        while (idx !== -1) {
          candidates.push(idx)
          idx = textMap.text.indexOf(quote, idx + 1)
        }
        let bestStart = null
        for (const candidateStart of candidates) {
          const candidateEnd = candidateStart + quote.length
          const candidatePrefix = textMap.text.slice(Math.max(0, candidateStart - PREFIX_SUFFIX_LEN), candidateStart)
          const candidateSuffix = textMap.text.slice(candidateEnd, candidateEnd + PREFIX_SUFFIX_LEN)
          if ((prefix && candidatePrefix === prefix) || (suffix && candidateSuffix === suffix)) {
            bestStart = candidateStart
            break
          }
        }
        if (bestStart == null) bestStart = candidates.length > 0 ? candidates[0] : null
        if (bestStart == null) {
          nextStatuses[comment._id] = 'orphaned'
          return
        }
        start = bestStart
        end = bestStart + quote.length
      }

      const startPoint = offsetToDomPoint(textMap, start)
      const endPoint = offsetToDomPoint(textMap, end)
      if (!startPoint || !endPoint) {
        nextStatuses[comment._id] = 'orphaned'
        return
      }

      try {
        const range = document.createRange()
        range.setStart(startPoint.node, startPoint.offset)
        range.setEnd(endPoint.node, endPoint.offset)
        const rects = Array.from(range.getClientRects())
        if (!rects.length) {
          nextStatuses[comment._id] = 'orphaned'
          return
        }
        nextRanges[comment._id] = range
        nextHighlightRects[comment._id] = rects.map((r) => ({
          top: r.top - containerRect.top,
          left: r.left - containerRect.left,
          width: r.width,
          height: r.height
        }))
        nextStatuses[comment._id] = 'resolved'
      } catch {
        nextStatuses[comment._id] = 'orphaned'
      }
    })

    rangesRef.current = nextRanges
    setHighlightRects(nextHighlightRects)
    onAnchorStatusesChangeRef.current?.(nextStatuses)
    // Reuse the rects we just measured rather than re-reading the ranges: one
    // `getClientRects()` pass per relocate, and the reported `topY` is then
    // literally the same number the highlight overlay is painted at, so a card
    // and its highlight can never drift apart by a sub-pixel rounding step.
    onAnchorPositionsChangeRef.current?.(
      Object.entries(nextHighlightRects).map(([commentId, rects]) => ({ commentId, topY: rects[0].top }))
    )
  }, [comments, editor, getContainer])

  // Re-locate on mount and whenever the `comments` list itself changes.
  useEffect(() => {
    relocateComments()
  }, [relocateComments])

  // Re-locate on debounced content-change.
  useEffect(() => {
    return editor.registerUpdateListener(() => {
      clearTimeout(relocateTimeoutRef.current)
      relocateTimeoutRef.current = setTimeout(relocateComments, RELOCATE_DEBOUNCE_MS)
    })
  }, [editor, relocateComments])

  // Deliberately NO scroll listener. Both the highlight rects and the reported
  // `topY` are document-space, and scrolling does not move the document — it
  // moves the viewport over it. Re-measuring here on scroll is what used to
  // put `getClientRects()` for every loaded comment, plus a React state update
  // in EditorHome, on the critical path of every scroll frame; the rail now
  // tracks scroll itself with a single compositor transform.
  //
  // Reflow — which genuinely does move anchors in document space — still has
  // to re-measure, and a viewport resize reflows the text column.
  useEffect(() => {
    window.addEventListener('resize', relocateComments)
    return () => window.removeEventListener('resize', relocateComments)
  }, [relocateComments])

  useEffect(() => {
    return () => clearTimeout(relocateTimeoutRef.current)
  }, [])

  // ── Hover/focus preview — "at a glance" comment content on the anchor text
  // itself, no click required (see CommentHoverPreview docstring for why this
  // is done via mousemove hit-testing against `highlightRects` rather than
  // pointer events on the overlay boxes: the overlay must stay
  // `pointerEvents: 'none'` so it never blocks selecting/editing the
  // highlighted text underneath it). ─────────────────────────────────────────
  useEffect(() => {
    const container = getContainer()
    if (!container) return undefined

    // Which comment's highlight is under this viewport point, if any. The
    // overlay itself is `pointerEvents: 'none'` (see below), so both hover and
    // click have to be resolved geometrically against the same rect table.
    const hitTest = (clientX, clientY) => {
      const containerRect = container.getBoundingClientRect()
      const x = clientX - containerRect.left
      const y = clientY - containerRect.top
      for (const [commentId, rects] of Object.entries(highlightRectsRef.current)) {
        if (rects.some((r) => x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height)) {
          return commentId
        }
      }
      return null
    }

    // Clicking highlighted text focuses its card in the margin rail — the
    // other half of the Google Docs two-way link. Deliberately a passive
    // listener on the container rather than a handler on the overlay: the
    // click must still reach the text underneath and place the caret, so
    // nothing here preventDefaults or stops propagation.
    const handleClick = (event) => {
      const hitCommentId = hitTest(event.clientX, event.clientY)
      if (hitCommentId) requestCommentFocus(hitCommentId)
    }

    const handleMouseMove = (event) => {
      const hitCommentId = hitTest(event.clientX, event.clientY)
      setHoverPreview((prev) => {
        if (!hitCommentId) return prev?.trigger === 'mouse' ? null : prev
        if (prev?.trigger === 'focus') return prev // keyboard focus preview takes priority over incidental mouse hover
        return { commentId: hitCommentId, clientX: event.clientX, clientY: event.clientY, trigger: 'mouse' }
      })
    }
    const handleMouseLeave = () => setHoverPreview((prev) => (prev?.trigger === 'mouse' ? null : prev))

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    container.addEventListener('click', handleClick)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.removeEventListener('click', handleClick)
    }
    // `highlightRects` isn't read directly (the handler reads the ref to
    // avoid a stale closure) — it's a dependency purely to re-run this effect
    // once a container that wasn't mounted yet on first render appears.
  }, [getContainer, highlightRects])

  const handleAnchorFocus = useCallback((commentId, rect) => {
    setHoverPreview({ commentId, clientX: rect.left, clientY: rect.top, trigger: 'focus' })
    requestCommentFocus(commentId)
  }, [])

  const handleAnchorBlur = useCallback((commentId) => {
    setHoverPreview((prev) => (prev?.trigger === 'focus' && prev.commentId === commentId ? null : prev))
  }, [])

  const handleAnchorKeyDown = useCallback(
    (commentId) => (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      requestCommentFocus(commentId)
      // The rail may have to bring this card into its stack first (it renders
      // a bounded window of cards), so move keyboard focus on the next frame,
      // once that card exists.
      requestAnimationFrame(() => {
        const card = document.getElementById(`comment-card-${commentId}`)
        card?.querySelector('[role="button"], button')?.focus()
      })
    },
    []
  )

  // ── "Add note" — captures the current selection exactly once, at the
  // moment the option is chosen (same synchronous-capture-before-focus-steal
  // technique Editor.js already uses for diagram insertion anchors). ──────────
  const openComposerForSelection = useCallback(() => {
    const rootEl = editor.getRootElement()
    if (!rootEl) return false
    const nativeSelection = window.getSelection()
    if (!nativeSelection || nativeSelection.rangeCount === 0 || nativeSelection.isCollapsed) return false

    const quote = nativeSelection.toString()
    if (!quote.trim()) return false

    const domRange = nativeSelection.getRangeAt(0)
    if (!rootEl.contains(domRange.commonAncestorContainer)) return false

    const rect = domRange.getBoundingClientRect()
    const textMap = buildTextMap(rootEl)
    const startOffset = domPointToOffset(textMap, domRange.startContainer, domRange.startOffset)
    const endOffset = domPointToOffset(textMap, domRange.endContainer, domRange.endOffset)
    if (startOffset == null || endOffset == null) return false

    const prefix = textMap.text.slice(Math.max(0, startOffset - PREFIX_SUFFIX_LEN), startOffset)
    const suffix = textMap.text.slice(endOffset, endOffset + PREFIX_SUFFIX_LEN)
    const blockIndex = readBlockIndex(editor)

    // Clamp both axes against the viewport — a selection made near the
    // bottom edge previously left `top` unclamped and could render the
    // composer partly off-screen.
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - COMPOSER_WIDTH - VIEWPORT_MARGIN)
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - COMPOSER_HEIGHT_ESTIMATE - VIEWPORT_MARGIN)
    setComposer({
      anchor: { quote, prefix, suffix, start_offset: startOffset, end_offset: endOffset, block_index: blockIndex },
      position: {
        top: Math.min(Math.max(rect.bottom + 8, VIEWPORT_MARGIN), maxTop),
        left: Math.min(Math.max(rect.left, VIEWPORT_MARGIN), maxLeft)
      }
    })
    return true
  }, [editor])

  useImperativeHandle(ref, () => ({ openComposerForSelection }), [openComposerForSelection])

  const handleComposerSave = useCallback(
    async (body) => {
      if (!composer) return
      await onCreateComment?.(composer.anchor, body)
      setComposer(null)
    },
    [composer, onCreateComment]
  )

  const container = getContainer()
  const hoverComment = hoverPreview ? commentsById.get(hoverPreview.commentId) : null

  return (
    <>
      {container &&
        createPortal(
          <>
            {Object.entries(highlightRects).map(([commentId, rects]) => {
              const comment = commentsById.get(commentId)
              const body = comment?.body || ''
              const preview = body.length > ANCHOR_ARIA_TRUNCATE_LEN ? `${body.slice(0, ANCHOR_ARIA_TRUNCATE_LEN)}…` : body
              const isActive = activeCommentId === commentId
              const isResolved = Boolean(comment?.resolved)
              return rects.map((rect, idx) => {
                // Only the first rect of a (possibly multi-line) highlight is
                // interactive/focusable — keeps keyboard Tab order to one
                // stop per comment, matching the existing `comment-anchor-`
                // id convention (already scoped to idx === 0).
                const isInteractive = idx === 0
                return (
                  <Box
                    key={`${commentId}-${idx}`}
                    id={isInteractive ? `comment-anchor-${commentId}` : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    role={isInteractive ? 'button' : undefined}
                    aria-label={isInteractive ? t('comments.bubbleAriaLabel', { preview }) : undefined}
                    onFocus={isInteractive ? () => handleAnchorFocus(commentId, rect) : undefined}
                    onBlur={isInteractive ? () => handleAnchorBlur(commentId) : undefined}
                    onKeyDown={isInteractive ? handleAnchorKeyDown(commentId) : undefined}
                    sx={{
                      position: 'absolute',
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                      // Google Docs' amber highlight, deepening when the note is
                      // the focused one — and, like Google Docs, gone entirely
                      // once the note is resolved.
                      //
                      // `softActiveBg`, not the paler `softBg` this used to
                      // use: in the light scheme `warning.softBg` is #fef8e7,
                      // which at any opacity low enough to read text through is
                      // indistinguishable from the page.
                      //
                      // This overlay paints ON TOP of live text, so opacity is
                      // capped hard in both states — a light wash at 50%+ drags
                      // light-mode body text under the 4.5:1 contrast floor.
                      // The focused state therefore buys its emphasis from the
                      // underline, which costs no legibility at all, and only
                      // marginally from more fill.
                      bgcolor: isResolved ? 'transparent' : 'warning.softActiveBg',
                      opacity: isActive ? 0.38 : 0.28,
                      borderBottom: isActive && !isResolved ? '2px solid' : 'none',
                      borderColor: 'warning.plainColor',
                      transition: 'opacity 0.15s ease, border-color 0.15s ease',
                      borderRadius: '2px',
                      // Deliberately not interactive to the mouse: this overlay
                      // sits directly on top of editable text, and enabling
                      // pointer events here would block clicking/selecting the
                      // highlighted text underneath. Mouse-driven hover is
                      // instead handled via the container-level mousemove
                      // hit-test above; only keyboard focus reaches this
                      // element directly (pointer-events: none does not
                      // affect Tab-key focusability).
                      pointerEvents: 'none',
                      ...(isInteractive && {
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineOffset: '1px',
                          outlineColor: 'primary.outlinedBorder'
                        }
                      })
                    }}
                  />
                )
              })
            })}
          </>,
          container
        )}

      {hoverComment &&
        createPortal(
          <CommentHoverPreview comment={hoverComment} clientX={hoverPreview.clientX} clientY={hoverPreview.clientY} />,
          document.body
        )}

      {composer &&
        createPortal(
          <CommentComposer position={composer.position} onSave={handleComposerSave} onCancel={() => setComposer(null)} onError={onError} />,
          document.body
        )}
    </>
  )
})

export default CommentAnchorPlugin

// Exported for CommentMarginRail/tests that need to know an anchor's classification
// shape without importing the whole plugin.
export const ANCHOR_STATUS = { RESOLVED: 'resolved', ORPHANED: 'orphaned' }
