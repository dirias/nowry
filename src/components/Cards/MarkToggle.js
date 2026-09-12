import React from 'react'
import { Button, IconButton, Tooltip } from '@mui/joy'
import { Bookmark, BookmarkBorder } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { useCardMark } from '@nowry/core/hooks/useCardMark'

/**
 * Explicit keyboard focus ring — Joy leans on the browser outline, which the
 * surrounding card/row borders visually swallow (CLAUDE.md accessibility rule).
 */
const FOCUS_RING = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.outlinedBorder',
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
 * **Two appearances, one behaviour.** `'icon'` is the default and is what the
 * library rows and the preview modal want: a glyph in a dense list, named by
 * its `aria-label`, explained by its tooltip. `'labelled'` is for the session
 * header, where the control has room to say what it is — an unnamed glyph out
 * at the edge of a wide row is how this feature went undiscovered for a whole
 * cycle (ADR-011). Only the presentation differs; the write path, the
 * optimism, the rollback and `aria-pressed` are shared.
 *
 * The labelled form deliberately sets NO `aria-label`. Its visible text is its
 * accessible name, because keeping "Remove mark" as the name beside a visible
 * "Marked" would fail WCAG 2.5.3 (Label in Name) — the name has to contain the
 * label. `aria-pressed` already carries the state that the longer name was
 * there to convey, and the tooltip is dropped for the same reason: it would
 * only repeat what is already on screen.
 *
 * @param {{
 *   card: object,
 *   onMarkChange?: (cardId: string, markedAt: string | null) => void,
 *   size?: 'sm' | 'md' | 'lg',
 *   variant?: string,
 *   appearance?: 'icon' | 'labelled',
 *   sx?: object
 * }} props
 */
export default function MarkToggle({ card, onMarkChange, size = 'sm', variant = 'plain', appearance = 'icon', sx }) {
  const { t } = useTranslation()

  /*
   * The optimism, the rollback and the follow-the-card effect live in
   * `useCardMark` in the shared package — the phone's session header needs the
   * same three and a second copy of them is how two clients start disagreeing
   * about what a mark is (MOB-062).
   */
  const { cardId, marked, pending, toggle } = useCardMark(card, onMarkChange)

  const handleToggle = (event) => {
    // Card rows and preview cards are themselves click targets; without this
    // marking a card would also open it.
    event.stopPropagation()
    toggle()
  }

  if (!cardId) return null

  const label = marked ? t('cards.mark.unmark') : t('cards.mark.mark')

  if (appearance === 'labelled') {
    /*
     * Ground, glyph fill and label carry the state — never a hue. Joy's four
     * semantic colours are Again/Hard/Good/Easy on this exact screen, so a
     * tinted mark would read as a grade (ADR-010, DESIGN_GUIDELINES §15.5).
     *
     * The hover moves the LABEL and leaves the ground where it is: the ground
     * means "on", and a hover that borrowed it would impersonate the state
     * (§15.1). Both hover grounds are therefore pinned to the resting one via
     * Joy's own variant variables rather than an `&:hover` override, which
     * would otherwise lose to Joy's specificity.
     */
    const ground = marked ? 'background.level2' : 'background.level1'
    const groundVar = marked ? 'var(--joy-palette-background-level2)' : 'var(--joy-palette-background-level1)'

    return (
      <Button
        size={size}
        variant='plain'
        color='neutral'
        onClick={handleToggle}
        aria-pressed={marked}
        data-testid='mark-toggle'
        startDecorator={marked ? <Bookmark fontSize='small' /> : <BookmarkBorder fontSize='small' />}
        sx={{
          borderRadius: 'md',
          // WCAG 2.5.5 at xs, relaxing for pointer devices — the text supplies
          // the width, so this is the height-only `touchTarget` case.
          minHeight: { xs: 44, sm: 36 },
          px: 1.5,
          fontWeight: 'lg',
          bgcolor: ground,
          color: marked ? 'text.primary' : 'text.secondary',
          '--variant-plainHoverBg': groundVar,
          '--variant-plainActiveBg': groundVar,
          '&:hover': { color: 'text.primary' },
          ...FOCUS_RING,
          ...sx
        }}
      >
        {marked ? t('cards.mark.actionOn') : t('cards.mark.action')}
      </Button>
    )
  }

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
