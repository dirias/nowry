import React from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, Typography } from '@mui/joy'

const PREVIEW_WIDTH = 260
const PREVIEW_BODY_TRUNCATE_LEN = 160
const CURSOR_OFFSET_PX = 16
const VIEWPORT_MARGIN = 8
// No live DOM node to measure until this mounts — a conservative estimate
// keeps the clamp from letting the card render off the bottom edge.
const HEIGHT_ESTIMATE = 90

/**
 * CommentHoverPreview — lightweight, read-only "at a glance" card shown near
 * the cursor when hovering (or keyboard-focusing) a highlighted comment
 * anchor in the document body. Mirrors the floating-Sheet pattern already
 * used by CommentComposer/CommentThreadPopover rather than Joy's `Tooltip`:
 * the highlight overlay it's triggered from must stay `pointerEvents: 'none'`
 * so it never blocks text selection/editing underneath it, and Tooltip's
 * built-in trigger relies on its child receiving real pointer events — so a
 * self-positioned card driven by CommentAnchorPlugin's own hit-testing is the
 * only approach that doesn't regress editing. Read-only glance only — never
 * intercepts pointer events itself, and never replaces CommentThreadPopover
 * (still reachable via the bubble or via Enter/Space on the anchor).
 */
export default function CommentHoverPreview({ comment, clientX, clientY }) {
  const { t } = useTranslation()
  const body = comment?.body || ''
  const preview = body.length > PREVIEW_BODY_TRUNCATE_LEN ? `${body.slice(0, PREVIEW_BODY_TRUNCATE_LEN)}…` : body

  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - PREVIEW_WIDTH - VIEWPORT_MARGIN)
  const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - HEIGHT_ESTIMATE - VIEWPORT_MARGIN)
  const left = Math.min(Math.max(clientX + CURSOR_OFFSET_PX, VIEWPORT_MARGIN), maxLeft)
  const top = Math.min(Math.max(clientY + CURSOR_OFFSET_PX, VIEWPORT_MARGIN), maxTop)

  return (
    <Sheet
      variant='outlined'
      role='tooltip'
      sx={{
        position: 'fixed',
        top,
        left,
        zIndex: 10000,
        width: PREVIEW_WIDTH,
        maxWidth: 'calc(100vw - 16px)',
        p: 1,
        borderRadius: 'sm',
        boxShadow: 'md',
        bgcolor: 'background.surface',
        borderColor: 'divider',
        // Never the target of pointer events — purely informational, and
        // must not steal the mousemove/mouseleave hit-testing that drives it.
        pointerEvents: 'none'
      }}
    >
      <Typography
        level='body-xs'
        sx={{ color: preview ? 'text.primary' : 'text.tertiary', fontStyle: preview ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}
      >
        {preview || t('comments.emptyBodyPreview')}
      </Typography>
    </Sheet>
  )
}
