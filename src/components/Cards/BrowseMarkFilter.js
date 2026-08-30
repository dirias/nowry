import React from 'react'
import { Chip, Stack, Typography } from '@mui/joy'
import { Bookmark, BookmarkBorder } from '@mui/icons-material'

/**
 * Explicit keyboard focus ring — Joy's default outline is swallowed by the
 * chip's own border (CLAUDE.md accessibility rule).
 */
const FOCUS_RING = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.solidBg',
    outlineOffset: '2px'
  }
}

/**
 * Inline "marked only" filter for a Browse-mode study session.
 *
 * A sibling of `BrowseTagFilter` rather than a part of it: the two dimensions
 * are independent, they appear under different conditions (a deck can have
 * marks and no tags, or the reverse), and folding a mark control into a
 * component named for tags would make its name lie the way the hook's already
 * does (DEBT-001).
 *
 * MODULE SCOPE + React.memo, and `t` as a prop — same reasons as
 * `BrowseTagFilter`: see the PERF-01 comment at the top of StudySession.js.
 * Defining it inside StudySession()'s body would give it a new function
 * identity every render, which React reads as a new component TYPE.
 *
 * Purely presentational. It holds no state, performs no filtering, and cannot
 * fail — the parent owns the URL and the card list.
 *
 * @param {{
 *   markedOnly: boolean,
 *   markedCount: number,
 *   shown: number,
 *   total: number,
 *   onToggle: () => void,
 *   t: (key: string, options?: object) => string
 * }} props
 */
const BrowseMarkFilter = React.memo(function BrowseMarkFilter({ markedOnly, markedCount, shown, total, onToggle, t }) {
  // The action's name states what the click will DO, not what the chip is —
  // a toggle whose label reads "Marked" leaves a screen-reader user guessing
  // which way it goes.
  const actionLabel = markedOnly ? t('cards.session.markFilter.showAll') : t('cards.session.markFilter.showMarked')

  return (
    <Stack direction='row' justifyContent='flex-end' alignItems='center' spacing={1} sx={{ mb: 1.5 }}>
      {/* Progressive disclosure (§11): the count only earns its space once the
          filter is actually narrowing something. */}
      {markedOnly && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('cards.session.markFilter.showing', { shown, total })}
        </Typography>
      )}

      <Chip
        size='sm'
        variant={markedOnly ? 'solid' : 'outlined'}
        color='neutral'
        onClick={onToggle}
        startDecorator={markedOnly ? <Bookmark fontSize='small' /> : <BookmarkBorder fontSize='small' />}
        slotProps={{
          // Joy renders the clickable element in the `action` slot, so the
          // toggle semantics have to land there rather than on the chip root.
          action: {
            'aria-pressed': markedOnly,
            'aria-label': actionLabel,
            sx: FOCUS_RING
          }
        }}
      >
        {t('cards.session.markFilter.label', { count: markedCount })}
      </Chip>
    </Stack>
  )
})

export default BrowseMarkFilter
