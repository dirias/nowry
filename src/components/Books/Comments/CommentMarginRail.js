import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, Box, Skeleton, Alert, Button, Typography, Stack } from '@mui/joy'
import { MessageSquareOff, ChevronDown } from 'lucide-react'
import { useComments } from '../../../hooks/useComments'
import CommentCard from './CommentCard'
import { setActiveComment, subscribeCommentFocusRequests } from './commentFocusBus'

// Vertical breathing room between two stacked cards, and between the stack and
// the rail's own edges. Google Docs uses a comparable hairline gap — big enough
// to read two cards as separate, small enough that a run of them still reads as
// one column.
const CARD_GAP_PX = 8
const RAIL_PAD_PX = 12
// Used for a card that has not been measured yet (first paint of a new note).
// The measured height replaces it in the same commit, before paint.
const DEFAULT_CARD_HEIGHT_PX = 76
// How far beyond the rail's own edges a card is still mounted. Purely a
// rendering budget — it has no effect on where any card sits, so widening or
// narrowing it can never move anything. Generous on purpose: a card is measured
// the first time it mounts, and a first measurement that replaces
// DEFAULT_CARD_HEIGHT_PX shifts everything below it in the collision chain, so
// that had better happen well off-screen.
const RENDER_OVERSCAN_PX = 1200
// The render window is recomputed in steps this size rather than continuously.
// Card positions do not depend on scroll at all (see `stackComments`), so
// quantising here is invisible — it only decides when cards mount and unmount,
// and it keeps React out of all but a handful of frames per screen scrolled.
const RENDER_WINDOW_STEP_PX = 96

// The scrolling element the rail tracks, and the document element the plugin
// measures anchor positions against. Both live in EditorHome/Editor rather than
// here; the rail reads them by selector for the same reason CommentAnchorPlugin
// does — the rail is a flex SIBLING of the scroll container, not a descendant,
// so there is no ref to inherit and no context worth inventing for two nodes.
const SCROLL_CONTAINER_SELECTOR = '.editor-scroll-container'
const DOC_CONTAINER_SELECTOR = '#editor-pages-container'

const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineOffset: '2px',
    outlineColor: 'primary.outlinedBorder'
  }
}

// The scrollbar treatment ContentNavigator uses for the Table of Contents panel
// (src/components/Editor/ContentNavigator.js): a 4px hairline with a
// transparent track, rather than the platform's ~15px default. Any region in
// this rail that can overflow gets it, so the notes panel and the TOC scroll
// the same way.
//
// Note `bgcolor`, not `background`, for the thumb. ContentNavigator writes
// `background: 'divider'`, which MUI's sx resolver cannot map to a palette path
// — it drops the declaration entirely, so that thumb has never actually been
// tinted. `bgcolor` is the form that resolves to var(--joy-palette-divider),
// and it keeps the rail correct in both colour schemes.
const thinScrollbarSx = {
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '8px' }
}

/**
 * The anti-collision stacking pass — the behaviour that makes this read as a
 * Google Docs sidebar rather than a list.
 *
 * Cards want to sit at their anchor's vertical position (`topY`). Where that
 * would overlap, they are pushed apart in anchor order with a fixed gap. The
 * focused card holds its anchor position exactly and everything else reflows
 * around it: neighbours above are pulled up, neighbours below are pushed down.
 * With no focused card the first card is the pivot, which degenerates to a
 * plain top-to-bottom push-down.
 *
 * Everything is in DOCUMENT space — "pixels below the top of the document
 * column", not "pixels below the top of the rail" — and, critically, the result
 * DOES NOT DEPEND ON SCROLL POSITION. It is a pure function of which notes
 * exist, how tall they are, and which one is focused. That is what lets the rail
 * track scrolling with a single compositor transform, and it is the fix for a
 * measured 313px flicker: this pass used to be handed only the notes anchored
 * near the viewport, clamped into the rail's own top and bottom edges. Both of
 * those inputs move as you scroll, so the collision chain was repeatedly
 * truncated and re-clamped — cards sat frozen against the rail for a few hundred
 * pixels of scrolling and then sprang several hundred pixels the instant the
 * topmost note dropped out of the set. Nothing here may read the scroll offset.
 *
 * A dense run of notes anchored to the same line still pushes its neighbours a
 * long way down; that is inherent to not overlapping them, and it is what Google
 * Docs does too. Notes pushed outside the rail are reported by the "+N more"
 * control rather than silently clipped.
 *
 * @param {Array} items - every anchored note, sorted by `topY`
 * @returns {number[]} document-space tops, index-aligned to `items`
 */
export function stackComments({ items, heights, activeId }) {
  const heightOf = (item) => heights[item.id] ?? DEFAULT_CARD_HEIGHT_PX
  const tops = new Array(items.length)
  if (items.length === 0) return tops

  const activeIndex = activeId ? items.findIndex((item) => item.id === activeId) : -1
  const pivot = activeIndex === -1 ? 0 : activeIndex

  // The pivot alone gets exactly its anchor position; everything else yields.
  tops[pivot] = items[pivot].topY
  for (let i = pivot - 1; i >= 0; i -= 1) {
    tops[i] = Math.min(items[i].topY, tops[i + 1] - CARD_GAP_PX - heightOf(items[i]))
  }
  for (let i = pivot + 1; i < items.length; i += 1) {
    tops[i] = Math.max(items[i].topY, tops[i - 1] + heightOf(items[i - 1]) + CARD_GAP_PX)
  }
  return tops
}

/**
 * CommentMarginRail — the desktop Google-Docs-style comment sidebar.
 *
 * Resource-agnostic: only `resourceType`/`resourceId` are book-specific here,
 * and those are supplied by the caller (EditorHome.js).
 */
const CommentMarginRail = forwardRef(function CommentMarginRail(
  { resourceType, resourceId, anchorPositions = [], anchorStatuses = {}, onError, onCommentsChanged },
  ref
) {
  const { t } = useTranslation()
  const railRef = useRef(null)
  const layerRef = useRef(null)
  const unanchoredRef = useRef(null)
  const cardNodesRef = useRef(new Map())
  // Live scroll offset and the document→rail origin, mirrored into refs so the
  // per-frame transform can be written without reading React state (and so the
  // scroll subscription never has to re-subscribe when either changes).
  const scrollTopRef = useRef(0)
  const originRef = useRef(0)
  const rafRef = useRef(null)
  const [railGeometry, setRailGeometry] = useState({ height: 0, origin: 0 })
  // The scroll offset the CURRENT stacking layout was computed for. Only the
  // windowing and the rail-edge clamps depend on it; every unpinned card's
  // document-space top is the same at every scroll offset.
  const [layoutScrollTop, setLayoutScrollTop] = useState(0)
  const [cardHeights, setCardHeights] = useState({})
  const [unanchoredHeight, setUnanchoredHeight] = useState(0)
  const [activeCommentId, setActiveCommentId] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null) // { id, mode: 'edit' | 'delete' } | null

  const handleMutationError = useCallback(
    (err) => {
      onError?.(err?.response?.data?.detail || t('comments.errors.generic'))
    },
    [onError, t]
  )

  const { comments, status, error, update, remove, refetch } = useComments(resourceType, resourceId, { onError: handleMutationError })

  // `railGeometry.origin` is the constant that converts the plugin's
  // document-space `topY` into a rail-relative offset:
  //
  //   railY(topY) = topY + origin - scrollTop
  //   origin      = containerTopInViewport + scrollTop - railTopInViewport
  //
  // `origin` is scroll-invariant by construction — the two scroll-dependent
  // terms cancel — so it only has to be re-measured when the layout itself
  // moves. `anchorPositions` now changes ONLY on reflow (the plugin no longer
  // touches it on scroll), which makes it exactly the right "something moved"
  // signal, and the setter bails out when nothing changed.
  //
  // This only ever READS geometry. No height is written back to the element —
  // the rail is a flex child of the same row as `.editor-scroll-container` and
  // takes its height from `align-items: stretch`, exactly like
  // ContentNavigator's wrapper in EditorHome.js. Measuring
  // `.editor-scroll-container.clientHeight` into a pixel `height` was a second
  // source of truth that could disagree with the real row height and leave the
  // parent row's own (much darker) background showing below the rail.
  useLayoutEffect(() => {
    const measure = () => {
      const railRect = railRef.current?.getBoundingClientRect()
      const scroller = document.querySelector(SCROLL_CONTAINER_SELECTOR)
      const docContainer = document.querySelector(DOC_CONTAINER_SELECTOR)
      const scrollTop = scroller?.scrollTop ?? 0
      const next = {
        height: railRect?.height ?? 0,
        origin: (docContainer?.getBoundingClientRect().top ?? 0) + scrollTop - (railRect?.top ?? 0)
      }
      scrollTopRef.current = scrollTop
      originRef.current = next.origin
      setRailGeometry((prev) => (prev.height === next.height && prev.origin === next.origin ? prev : next))
      const quantised = Math.round(scrollTop / RENDER_WINDOW_STEP_PX) * RENDER_WINDOW_STEP_PX
      setLayoutScrollTop((prev) => (prev === quantised ? prev : quantised))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [anchorPositions])

  // Write the scroll offset straight onto the card layer. This is the entire
  // scroll path: one style write on one element, no React, no layout read, no
  // easing. `translate3d` keeps it on the compositor, and because every card's
  // document-space top is scroll-invariant, moving the layer moves the whole
  // stack in perfect lock with the text it annotates.
  const applyLayerTransform = useCallback(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.style.transform = `translate3d(0, ${originRef.current - scrollTopRef.current}px, 0)`
  }, [])

  // Re-assert the transform after every commit, before paint — a commit caused
  // by anything other than scrolling (a note edited, a card focused) would
  // otherwise repaint the layer at its untransformed position for one frame.
  useLayoutEffect(applyLayerTransform)

  useEffect(() => {
    const scroller = document.querySelector(SCROLL_CONTAINER_SELECTOR)
    if (!scroller) return undefined

    const onFrame = () => {
      rafRef.current = null
      applyLayerTransform()
      // Quantised, so this is a no-op on all but a handful of frames per screen
      // scrolled. It cannot move a card — it only decides which cards are
      // mounted and how many count as hidden.
      setLayoutScrollTop((prev) => {
        const next = Math.round(scrollTopRef.current / RENDER_WINDOW_STEP_PX) * RENDER_WINDOW_STEP_PX
        return prev === next ? prev : next
      })
    }

    const handleScroll = () => {
      scrollTopRef.current = scroller.scrollTop
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(onFrame)
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [applyLayerTransform])

  const positionById = useMemo(() => {
    const map = new Map()
    anchorPositions.forEach((p) => map.set(p.commentId, p.topY))
    return map
  }, [anchorPositions])

  // Every comment with a live anchor, in document order. Ordering is global —
  // it deliberately includes anchors currently scrolled out of view, because
  // the Previous/Next header controls cycle through all of them.
  const { anchoredItems, unanchoredComments } = useMemo(() => {
    const anchored = []
    const unanchored = []
    comments.forEach((comment) => {
      const isOrphaned = anchorStatuses[comment._id] === 'orphaned'
      const topY = positionById.get(comment._id)
      if (!isOrphaned && typeof topY === 'number') {
        anchored.push({ id: comment._id, comment, topY })
      } else {
        unanchored.push(comment)
      }
    })
    anchored.sort((a, b) => a.topY - b.topY)
    return { anchoredItems: anchored, unanchoredComments: unanchored }
  }, [comments, positionById, anchorStatuses])

  // THE LAYOUT. A pure function of which notes exist, how tall they are, and
  // which one is focused — no scroll term anywhere. Every card therefore keeps
  // the same document-space position at every scroll offset, and the layer
  // transform alone produces the motion.
  const tops = useMemo(
    () => stackComments({ items: anchoredItems, heights: cardHeights, activeId: activeCommentId }),
    [anchoredItems, cardHeights, activeCommentId]
  )

  // Which slice of the document column is level with the rail. Quantised, and
  // used ONLY to decide what to mount and what to count as hidden — never to
  // position anything, so the quantisation cannot be seen.
  const railTopInDocSpace = layoutScrollTop - railGeometry.origin
  const railBottomInDocSpace = railTopInDocSpace + Math.max(0, railGeometry.height - unanchoredHeight)

  const { visible, visibleTops, hiddenCount, nextHidden } = useMemo(() => {
    const shown = []
    const shownTops = []
    let hidden = 0
    let next = null
    anchoredItems.forEach((item, index) => {
      const top = tops[index]
      const height = cardHeights[item.id] ?? DEFAULT_CARD_HEIGHT_PX
      if (top + height > railTopInDocSpace - RENDER_OVERSCAN_PX && top < railBottomInDocSpace + RENDER_OVERSCAN_PX) {
        shown.push(item)
        shownTops.push(top)
      }
      // "+N more" keeps its original meaning: a note whose TEXT the reader can
      // see, but whose card the rail had no room for. With the clamps gone that
      // is now simply a card pushed off an edge by the collision chain.
      const anchorOnScreen = item.topY >= railTopInDocSpace && item.topY <= railBottomInDocSpace
      const cardOnScreen = top >= railTopInDocSpace + RAIL_PAD_PX && top + height <= railBottomInDocSpace - RAIL_PAD_PX
      if (anchorOnScreen && !cardOnScreen) {
        hidden += 1
        if (!next && top > railTopInDocSpace) next = item
      }
    })
    return { visible: shown, visibleTops: shownTops, hiddenCount: hidden, nextHidden: next }
  }, [anchoredItems, tops, cardHeights, railTopInDocSpace, railBottomInDocSpace])

  // Measure rendered card heights so the stacking pass divides up real pixels
  // rather than an estimate. Runs before paint and bails out when nothing moved.
  //
  // Heights ACCUMULATE — a card that leaves the rendered window keeps its last
  // measured height instead of reverting to the default. That is load-bearing,
  // not tidiness: `DEFAULT_CARD_HEIGHT_PX` under-estimates a long note, so a
  // forgetful cache oscillates. The optimistic default lets a tall card into
  // the window, measuring it pushes the window closed again, unmounting drops
  // the measurement, the default returns, and React blows up with "maximum
  // update depth exceeded". Remembering breaks that cycle.
  useLayoutEffect(() => {
    setCardHeights((prev) => {
      let changed = false
      const merged = { ...prev }
      cardNodesRef.current.forEach((node, id) => {
        const measured = node.offsetHeight
        if (merged[id] !== measured) {
          merged[id] = measured
          changed = true
        }
      })
      return changed ? merged : prev
    })
    const measuredUnanchored = unanchoredRef.current?.offsetHeight ?? 0
    setUnanchoredHeight((prev) => (prev === measuredUnanchored ? prev : measuredUnanchored))
    // Everything that can change a card's rendered height: which cards exist
    // (`visible`), whether one is expanded into its editor, and the note text
    // itself. Notably NOT the computed tops — height is independent of
    // position, which is the other half of why this cannot feed back on itself.
  }, [visible, expandedCard, comments])

  // Stable per-comment callback refs. A fresh closure on every render would
  // make React detach and re-attach every card ref on every commit.
  const cardRefCallbacks = useRef(new Map())
  const registerCard = useCallback((id) => {
    if (!cardRefCallbacks.current.has(id)) {
      cardRefCallbacks.current.set(id, (node) => {
        if (node) cardNodesRef.current.set(id, node)
        else cardNodesRef.current.delete(id)
      })
    }
    return cardRefCallbacks.current.get(id)
  }, [])

  const activate = useCallback((commentId, { revealAnchor = true } = {}) => {
    setActiveCommentId(commentId)
    if (!revealAnchor) return
    const anchorEl = document.getElementById(`comment-anchor-${commentId}`)
    if (!anchorEl) return
    // Only scroll when the anchor isn't already on screen. Activating a card
    // whose text is right there should not yank the page around.
    const rect = anchorEl.getBoundingClientRect()
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return
    anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // rail → plugin: keep the document highlight in step with the focused card.
  useEffect(() => {
    setActiveComment(activeCommentId)
    return () => setActiveComment(null)
  }, [activeCommentId])

  // plugin → rail: the reader clicked or keyed a highlight in the document.
  // The anchor is on screen by definition in that case, so no scrolling — and
  // deliberately no DOM focus move either, which would fight the caret when
  // the click landed on editable text.
  useEffect(() => {
    return subscribeCommentFocusRequests((commentId) => {
      setExpandedCard(null)
      activate(commentId, { revealAnchor: false })
    })
  }, [activate])

  const goToOffset = useCallback(
    (delta) => {
      if (anchoredItems.length === 0) return
      const currentIndex = activeCommentId ? anchoredItems.findIndex((item) => item.id === activeCommentId) : -1
      const nextIndex = (currentIndex + delta + anchoredItems.length) % anchoredItems.length
      setExpandedCard(null)
      activate(anchoredItems[nextIndex].id)
    },
    [anchoredItems, activeCommentId, activate]
  )

  useImperativeHandle(
    ref,
    () => ({
      goToNext: () => goToOffset(1),
      goToPrevious: () => goToOffset(-1)
    }),
    [goToOffset]
  )

  const saveComment = useCallback(
    async (commentId, body) => {
      await update(commentId, { body })
      onCommentsChanged?.()
      setExpandedCard(null)
    },
    [update, onCommentsChanged]
  )

  const deleteComment = useCallback(
    async (commentId) => {
      await remove(commentId)
      setExpandedCard(null)
      setActiveCommentId((prev) => (prev === commentId ? null : prev))
      onCommentsChanged?.()
    },
    [remove, onCommentsChanged]
  )

  const toggleResolved = useCallback(
    async (comment) => {
      try {
        await update(comment._id, { resolved: !comment.resolved })
        onCommentsChanged?.()
      } catch {
        // Rolled back inside useComments and surfaced through `onError`.
      }
    },
    [update, onCommentsChanged]
  )

  // One frozen handler bundle per comment, rebuilt only when the comments
  // themselves change. Building these inline during render — which is what this
  // used to do — handed every card eight brand-new closures on every commit,
  // and the rail now commits on every scrolled frame, so a memoised CommentCard
  // would never once bail out. This is what makes the memo actually pay.
  const handlersByComment = useMemo(() => {
    const build = (comment, isOrphaned) => {
      const id = comment._id
      return {
        // An orphaned note has no anchor left in the document, so activating
        // one must not try to scroll to it.
        onActivate: isOrphaned ? () => setActiveCommentId(id) : () => activate(id),
        onRequestEdit: () => {
          activate(id)
          setExpandedCard({ id, mode: 'edit' })
        },
        onRequestDelete: () => {
          activate(id)
          setExpandedCard({ id, mode: 'delete' })
        },
        onToggleResolved: () => toggleResolved(comment),
        onCollapse: () => setExpandedCard(null),
        onSave: (body) => saveComment(id, body),
        onDelete: () => deleteComment(id),
        isOrphaned
      }
    }
    const map = new Map()
    comments.forEach((comment) => {
      map.set(comment._id, { anchored: build(comment, false), unanchored: build(comment, true) })
    })
    return map
  }, [comments, activate, toggleResolved, saveComment, deleteComment])

  const isLoading = status === 'loading' && comments.length === 0
  const isError = status === 'error'
  const isEmpty = status === 'ready' && comments.length === 0

  return (
    <Sheet
      ref={railRef}
      variant='plain'
      sx={{
        // Structural mirror of ContentNavigator's wrapper in EditorHome.js:
        // same fixed width, same single-side divider (opposite edge), same
        // surface token, same `overflow: hidden`, and — critically — NO height
        // of its own. Both panels are flex children of the editor row and take
        // their height from `align-items: stretch`, which is what guarantees
        // the surface fills the column edge to edge with no gap for the row's
        // darker `background.body` to show through.
        //
        // Google Docs' comment column is ~300px; this stays at ContentNavigator's
        // 280 so the editor's two side panels are symmetrical, which the reader
        // sees far more often than they compare it to Google Docs.
        width: 280,
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        display: { xs: 'none', md: 'block' },
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Status/empty states get the TOC's scroll treatment: a contained
          region that can only ever show the hairline scrollbar, never the
          platform default. */}
      {(isLoading || isError || isEmpty) && (
        <Box sx={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', ...thinScrollbarSx }}>
          {isLoading && (
            <Stack spacing={1} sx={{ p: 1.5 }}>
              <Skeleton variant='rectangular' height={76} sx={{ borderRadius: 'md' }} />
              <Skeleton variant='rectangular' height={76} sx={{ borderRadius: 'md' }} />
              <Skeleton variant='rectangular' height={76} sx={{ borderRadius: 'md' }} />
            </Stack>
          )}

          {isError && (
            <Box sx={{ p: 2 }}>
              <Alert color='danger' variant='soft' sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                <Typography level='body-sm'>{error || t('comments.errors.loadFailed')}</Typography>
                <Button size='sm' variant='soft' color='danger' onClick={refetch} sx={focusRingSx}>
                  {t('common.retry')}
                </Button>
              </Alert>
            </Box>
          )}

          {isEmpty && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <MessageSquareOff size={28} style={{ color: 'var(--joy-palette-text-tertiary)', opacity: 0.5, marginBottom: 8 }} />
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('comments.emptyTitle')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('comments.emptyHint')}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Card layer — the element that tracks the document.
          Cards sit at their DOCUMENT-space Y inside this layer, and the layer
          is translated by `-scrollTop` on every frame (imperatively, see
          `applyLayerTransform`). That is Google Docs' behaviour done the cheap
          way: one compositor transform for the whole stack instead of N cards
          repositioned through React.
          Deliberately NOT `overflow: hidden` — a card at document Y 4000 has to
          survive long enough to be translated back into view. The Sheet above
          already clips to the panel, which is the clip that was ever wanted. */}
      {!isLoading && !isError && (
        <Box ref={layerRef} sx={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
          {visible.map((item, index) => (
            <CommentCard
              key={item.id}
              cardRef={registerCard(item.id)}
              comment={item.comment}
              top={visibleTops[index]}
              isActive={activeCommentId === item.id}
              isExpanded={expandedCard?.id === item.id}
              expandedMode={expandedCard?.id === item.id ? expandedCard.mode : 'edit'}
              {...handlersByComment.get(item.id)?.anchored}
            />
          ))}
        </Box>
      )}

      {/* "+N more" — pinned to the rail's floor, and deliberately OUTSIDE the
          card layer so it never rides the scroll transform. Only its label
          changes as the reader scrolls; it does not move, so it cannot flicker. */}
      {!isLoading && !isError && hiddenCount > 0 && nextHidden && (
        <Button
          size='sm'
          variant='soft'
          color='neutral'
          startDecorator={<ChevronDown size={14} />}
          aria-label={t('comments.moreNotesAriaLabel', { count: hiddenCount })}
          onClick={() => activate(nextHidden.id)}
          sx={{
            position: 'absolute',
            left: RAIL_PAD_PX,
            right: RAIL_PAD_PX,
            bottom: RAIL_PAD_PX + unanchoredHeight,
            ...focusRingSx
          }}
        >
          {t('comments.moreNotes', { count: hiddenCount })}
        </Button>
      )}

      {/* Notes whose anchor text no longer exists in the document have no
          meaningful vertical position, so they are grouped at the foot of the
          panel instead of being placed. Capped at 40% of the panel so a long
          list scrolls inside itself — with the TOC's hairline bar — rather
          than crowding out the anchored stack, whose budget already subtracts
          this block's measured height. */}
      {!isLoading && !isError && unanchoredComments.length > 0 && (
        <Box
          ref={unanchoredRef}
          sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '40%', display: 'flex', flexDirection: 'column' }}
        >
          <Typography level='body-xs' sx={{ px: 1.5, pt: 1, pb: 0.5, color: 'text.tertiary' }}>
            {t('comments.unanchoredGroupTitle', { count: unanchoredComments.length })}
          </Typography>
          <Stack spacing={1} sx={{ px: 1.5, pb: 1.5, overflowY: 'auto', overflowX: 'hidden', ...thinScrollbarSx }}>
            {unanchoredComments.map((comment) => (
              <CommentCard
                key={comment._id}
                comment={comment}
                layout='static'
                isActive={activeCommentId === comment._id}
                isExpanded={expandedCard?.id === comment._id}
                expandedMode={expandedCard?.id === comment._id ? expandedCard.mode : 'delete'}
                {...handlersByComment.get(comment._id)?.unanchored}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Sheet>
  )
})

export default CommentMarginRail
