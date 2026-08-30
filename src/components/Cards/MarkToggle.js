import React, { useCallback, useEffect, useState } from 'react'
import { IconButton, Tooltip } from '@mui/joy'
import { Bookmark, BookmarkBorder } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { cardsService } from '../../api/services'

/**
 * Explicit keyboard focus ring — Joy leans on the browser outline, which the
 * surrounding card/row borders visually swallow (CLAUDE.md accessibility rule).
 */
const FOCUS_RING = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.solidBg',
    outlineOffset: '2px'
  }
}

/**
 * The user's mark on a card, as one toggle.
 *
 * This is the *intent* axis, not the difficulty one: it records that the user
 * wants to come back to this card, which is the only thing SM-2 cannot infer
 * for itself. It never grades, never moves `next_review`, and the scheduler
 * never reads it (ADR-010) — `cardsService.mark`/`unmark` hit a route that
 * writes `marked_at` and nothing else.
 *
 * **Deliberately monochrome.** Joy's four semantic colours are all spoken for
 * by the grading buttons — danger/warning/success/primary are again/hard/good/
 * easy — so tinting this control any of them would say "you graded this card".
 * State is carried by the icon fill and a soft ground instead, which also reads
 * as a bookmark rather than a verdict.
 *
 * Binary on purpose: a star is a reflex, a scale invites deliberation, and
 * deliberation mid-session is the friction the mark exists to avoid.
 *
 * Optimistic, with rollback. The request is small and the affordance has to
 * feel instant, so the icon flips first. On failure it flips back; the toast is
 * left to the API client's own interceptor, which already reports failures
 * globally — a second local message would just duplicate it.
 *
 * @param {{
 *   card: object,
 *   onMarkChange?: (cardId: string, markedAt: string | null) => void,
 *   size?: 'sm' | 'md' | 'lg',
 *   variant?: string,
 *   sx?: object
 * }} props
 */
export default function MarkToggle({ card, onMarkChange, size = 'sm', variant = 'plain', sx }) {
  const { t } = useTranslation()

  const cardId = card?._id || card?.id
  const serverMarked = Boolean(card?.marked_at)

  const [marked, setMarked] = useState(serverMarked)
  const [pending, setPending] = useState(false)

  /*
   * Follow the card, not just the mount. A session swaps a different card in
   * underneath this component and the library re-renders rows in place, so the
   * server's answer has to win whenever either the identity or the stored value
   * changes — otherwise stepping back to an already-marked card shows it empty.
   */
  useEffect(() => {
    setMarked(serverMarked)
  }, [cardId, serverMarked])

  const handleToggle = useCallback(
    async (event) => {
      // Card rows and preview cards are themselves click targets; without this
      // marking a card would also open it.
      event.stopPropagation()
      if (!cardId || pending) return

      const next = !marked
      setMarked(next)
      setPending(true)

      try {
        const updated = next ? await cardsService.mark(cardId) : await cardsService.unmark(cardId)
        onMarkChange?.(cardId, updated?.marked_at ?? null)
      } catch (error) {
        setMarked(!next)
      } finally {
        setPending(false)
      }
    },
    [cardId, marked, pending, onMarkChange]
  )

  if (!cardId) return null

  const label = marked ? t('cards.mark.unmark') : t('cards.mark.mark')

  return (
    <Tooltip title={label} variant='soft'>
      <IconButton
        size={size}
        variant={marked ? 'soft' : variant}
        color='neutral'
        onClick={handleToggle}
        aria-pressed={marked}
        aria-label={label}
        data-testid='mark-toggle'
        sx={{ color: marked ? 'text.primary' : 'text.tertiary', ...FOCUS_RING, ...sx }}
      >
        {marked ? <Bookmark fontSize='small' /> : <BookmarkBorder fontSize='small' />}
      </IconButton>
    </Tooltip>
  )
}
