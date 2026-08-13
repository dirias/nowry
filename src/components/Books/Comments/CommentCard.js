import React, { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, Box, Stack, Typography, IconButton, Tooltip, Divider } from '@mui/joy'
import { Pencil, Trash2, Check, RotateCcw, Unlink } from 'lucide-react'
import { CommentThreadContent } from './CommentThreadContent'

// How many lines of body text a collapsed card shows before ellipsis. Google
// Docs clamps at roughly this depth too — enough to recognise the note, short
// enough that a long one can't monopolise the rail's vertical budget (which is
// what the stacking pass in CommentMarginRail has to divide up).
const BODY_LINE_CLAMP = 4
const ARIA_TRUNCATE_LEN = 60

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineOffset: '2px',
    outlineColor: 'primary.outlinedBorder'
  }
}

/**
 * Relative timestamp, following the inline-helper pattern this codebase
 * already uses for dates (see `formatRelativeDate` in Study/StudyCenter.js):
 * i18n strings for the relative buckets, and `toLocaleDateString` for anything
 * older than a week. No date library is added — none is installed, and this
 * needs four buckets.
 */
export function formatRelativeTime(isoDate, t, language) {
  if (!isoDate) return ''
  const then = new Date(isoDate)
  const elapsed = Date.now() - then.getTime()
  if (Number.isNaN(elapsed)) return ''
  if (elapsed < MINUTE_MS) return t('comments.time.justNow')
  if (elapsed < HOUR_MS) return t('comments.time.minutesAgo', { count: Math.floor(elapsed / MINUTE_MS) })
  if (elapsed < DAY_MS) return t('comments.time.hoursAgo', { count: Math.floor(elapsed / HOUR_MS) })
  if (elapsed < WEEK_MS) return t('comments.time.daysAgo', { count: Math.floor(elapsed / DAY_MS) })
  return then.toLocaleDateString(language, { month: 'short', day: 'numeric' })
}

/**
 * CommentCard — one note, rendered as a Google-Docs-style sidebar card.
 *
 * DELIBERATE DEVIATION from Google Docs: no avatar and no author name. Nowry's
 * notes are strictly private and single-owner (the backend's GET /v1/comments
 * filters on user_id — see Nowry-API/app/routers/comments.py), so the author is
 * always the person reading the card. An identity block on every card would be
 * pure repetition, which "Refined Minimalism" in docs/design/DESIGN_GUIDELINES.md
 * rules out. The timestamp is kept; the identity row is dropped.
 *
 * Editing happens INSIDE the card (as it does in Google Docs) rather than in a
 * floating popover: expanding swaps the collapsed body for the shared
 * `CommentThreadContent`, so save/delete/delete-confirmation/error
 * classification all keep running through exactly one implementation.
 *
 * Layout-agnostic: `top` is the DOCUMENT-space Y that CommentMarginRail's
 * stacking pass assigned — it does not change when the reader scrolls, only
 * when the stack genuinely reflows. `layout='static'` drops the absolute
 * positioning entirely for the unanchored group.
 *
 * Memoised (see the export), and the rail holds every handler it passes down in
 * a per-comment cache so the memo can actually bail out; see
 * `handlersByComment` there.
 */
function CommentCard({
  comment,
  top,
  layout = 'floating',
  isActive = false,
  isExpanded = false,
  isOrphaned = false,
  expandedMode = 'edit',
  onActivate,
  onRequestEdit,
  onRequestDelete,
  onToggleResolved,
  onCollapse,
  onSave,
  onDelete,
  cardRef
}) {
  const { t, i18n } = useTranslation()
  const body = comment?.body || ''
  const isResolved = Boolean(comment?.resolved)
  const preview = body.length > ARIA_TRUNCATE_LEN ? `${body.slice(0, ARIA_TRUNCATE_LEN)}…` : body
  const timestamp = formatRelativeTime(comment?.updated_at || comment?.created_at, t, i18n.language)

  const stop = useCallback(
    (handler) => (event) => {
      event.stopPropagation()
      handler?.()
    },
    []
  )

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onActivate?.()
  }

  const isFloating = layout === 'floating'

  // 'floating': placed at its document-space Y inside the rail's card layer.
  // 'static': a plain flow item, used by the unanchored group at the foot of
  // the rail.
  //
  // `transform: translate3d`, not `top`. `top` is a layout property, so every
  // change to it (and every frame of a transition on it) re-runs layout;
  // `transform` is compositor-only and composes for free with the layer's own
  // scroll-tracking translation. `top: 0` still has to be set, or the Sheet
  // would be auto-placed at its static position and translated from there.
  const positionSx = isFloating
    ? {
        position: 'absolute',
        top: 0,
        left: 12,
        right: 12,
        transform: `translate3d(0, ${top}px, 0)`,
        // Style and layout changes inside a card can never affect the stack
        // around it — the rail assigns every position explicitly — so the
        // browser is free to stop recalculating at this boundary.
        contain: 'layout style'
      }
    : { position: 'static', width: '100%' }

  // Motion is for REFLOW only, and that is now guaranteed structurally rather
  // than by timing: `top` is scroll-invariant, so scrolling cannot change it and
  // therefore cannot start a transition. The only things that move a card are a
  // focus change, a note added, removed or edited, and a reflow of the document
  // — every one of which is exactly when easing is wanted. (This replaces a
  // `data-scrolling` flag driven by a 150ms idle timer, which could re-enable
  // easing between two slow scroll events and ease a scroll-driven jump.)
  const cardTransition = isFloating
    ? 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease, border-color 0.15s ease'
    : 'box-shadow 0.15s ease, border-color 0.15s ease'

  return (
    <Sheet
      ref={cardRef}
      id={`comment-card-${comment?._id}`}
      data-comment-card={isFloating ? 'floating' : undefined}
      variant='outlined'
      sx={{
        ...positionSx,
        borderRadius: 'md',
        overflow: 'hidden',
        // `background.level2` rather than the more obvious `level1`: this
        // theme's dark palette puts `surface` (#161b22, which the rail uses)
        // and `level1` (#171A1C) within one step of each other, so a level1
        // card is invisible against the rail in dark mode — only its hairline
        // border survives. `level2` is the first token that separates from the
        // rail in BOTH schemes (#DDE7EE on #f9f9f9 light, #32383E on #161b22
        // dark), which is what makes these read as cards rather than as rows.
        bgcolor: 'background.level2',
        borderColor: isActive ? 'primary.outlinedBorder' : 'divider',
        borderStyle: isOrphaned ? 'dashed' : 'solid',
        boxShadow: isActive ? 'md' : 'none',
        opacity: isResolved && !isActive ? 0.62 : 1,
        transition: cardTransition,
        '@media (prefers-reduced-motion: reduce)': { transition: 'box-shadow 0.15s ease, border-color 0.15s ease' },
        // Hover lifts rather than tints — the background is already carrying
        // the card/rail separation and a second tint on top muddies it.
        '&:hover': { boxShadow: 'sm', borderColor: isActive ? 'primary.outlinedBorder' : 'neutral.outlinedBorder' },
        // Action icons stay hidden until the card is hovered or something
        // inside it takes keyboard focus — Google Docs reveals them the same
        // way. Faded with `opacity` rather than unmounted: it keeps the card's
        // measured height stable across hover (so the stacking pass never
        // reflows) and keeps the buttons in the tab order, which is what makes
        // `:focus-within` able to reveal them for keyboard users at all.
        '&:hover .comment-card-actions, &:focus-within .comment-card-actions': { opacity: 1 }
      }}
    >
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={0.5} sx={{ pl: 1.5, pr: 0.75, pt: 1, pb: 0.25 }}>
        <Stack direction='row' alignItems='center' spacing={0.5} sx={{ minWidth: 0 }}>
          {isOrphaned && <Unlink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />}
          <Typography level='body-xs' noWrap sx={{ color: 'text.tertiary' }}>
            {isOrphaned ? t('comments.orphanedTitle') : timestamp}
          </Typography>
          {isResolved && !isOrphaned && (
            <Typography level='body-xs' noWrap sx={{ color: 'success.plainColor' }}>
              {t('comments.resolvedLabel')}
            </Typography>
          )}
        </Stack>

        <Stack
          direction='row'
          spacing={0.25}
          className='comment-card-actions'
          sx={{ flexShrink: 0, opacity: 0, transition: 'opacity 0.15s ease' }}
        >
          {!isOrphaned && (
            <Tooltip title={t('comments.editAriaLabel')} variant='soft' size='sm' placement='top'>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={t('comments.editAriaLabel')}
                onClick={stop(onRequestEdit)}
                sx={focusRingSx}
              >
                <Pencil size={14} />
              </IconButton>
            </Tooltip>
          )}
          {!isOrphaned && (
            <Tooltip
              title={isResolved ? t('comments.unresolveAriaLabel') : t('comments.resolveAriaLabel')}
              variant='soft'
              size='sm'
              placement='top'
            >
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={isResolved ? t('comments.unresolveAriaLabel') : t('comments.resolveAriaLabel')}
                onClick={stop(onToggleResolved)}
                sx={focusRingSx}
              >
                {isResolved ? <RotateCcw size={14} /> : <Check size={14} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('comments.deleteAriaLabel')} variant='soft' size='sm' placement='top'>
            <IconButton
              size='sm'
              variant='plain'
              color='neutral'
              aria-label={t('comments.deleteAriaLabel')}
              onClick={stop(onRequestDelete)}
              sx={focusRingSx}
            >
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {isExpanded ? (
        <>
          <Divider />
          <CommentThreadContent
            comment={comment}
            isOrphaned={isOrphaned}
            showHeader={false}
            showCloseButton={false}
            initialMode={expandedMode === 'edit' ? 'edit' : 'read'}
            initialConfirmingDelete={expandedMode === 'delete'}
            onClose={onCollapse}
            onSave={onSave}
            onDelete={onDelete}
          />
        </>
      ) : (
        <Box
          role='button'
          tabIndex={0}
          aria-label={isOrphaned ? t('comments.orphanedNoteAriaLabel', { preview }) : t('comments.noteAriaLabel', { preview })}
          aria-current={isActive ? 'true' : undefined}
          onClick={onActivate}
          onKeyDown={handleKeyDown}
          sx={{ px: 1.5, pt: 0.25, pb: 1.5, cursor: 'pointer', ...focusRingSx }}
        >
          <Typography
            level='body-sm'
            sx={{
              color: body ? 'text.primary' : 'text.tertiary',
              fontStyle: body ? 'normal' : 'italic',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: BODY_LINE_CLAMP
            }}
          >
            {body || t('comments.emptyBodyPreview')}
          </Typography>
        </Box>
      )}
    </Sheet>
  )
}

export default memo(CommentCard)
