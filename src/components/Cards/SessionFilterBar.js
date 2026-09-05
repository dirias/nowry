import React from 'react'
import { Box, Button, Dropdown, Input, Menu, MenuButton, MenuItem, Sheet, Typography } from '@mui/joy'
import { Bookmark, BookmarkBorder, KeyboardArrowDown, LocalOfferOutlined, Search } from '@mui/icons-material'

import { focusRing, segment, segmentedGroup } from '../Common/Form/formStyles'

/** Above this many tags, picking from a flat list stops being picking. */
const SEARCH_THRESHOLD = 8

/**
 * A study session's view filters, as one segmented control.
 *
 * **Why one object rather than two chips.** These two filters do the same job —
 * they narrow the loaded deck — and the eye reads *same shape ⇒ same class*. As
 * two free-floating chips on two separate rows (which is what shipped) they
 * asserted no relationship at all, and the mark's payoff sat two rows from the
 * control that produces it, so nobody found either. One container split by a
 * hairline says "these are the same kind of control" without a word of copy.
 * ADR-011; the general rule is DESIGN_GUIDELINES §15.2.
 *
 * **Accessible names come from the visible text.** The chip this replaces named
 * itself after the action ("Show only marked cards") on the reasoning that a
 * toggle labelled "Marked" leaves a screen-reader user guessing which way it
 * goes. `aria-pressed` is the mechanism for that, and an accessible name that
 * does not contain its own visible label fails WCAG 2.5.3 (Label in Name) — so
 * the visible text is the name and the pressed state carries the direction.
 *
 * **Progressive disclosure, unchanged (§11).** A segment with nothing to
 * control is not rendered: no tags on the deck, no Tags segment; nothing marked
 * and the filter off, no Marked segment. The Tags segment can appear in either
 * mode — ADR-014 lets tags narrow the SM-2 queue without reordering it. The
 * Marked segment appears only in Browse, and that gate is upstream, not here:
 * outside Browse the hook reports `markedCount` 0 and `markedOnly` false, so
 * there is nothing for this component to render (ADR-010).
 *
 * MODULE SCOPE + React.memo, and `t` as a prop — see the PERF-01 comment at the
 * top of StudySession.js. Defined inside StudySession()'s body it would get a
 * new function identity every render, which React reads as a new component
 * TYPE: the subtree would unmount and remount, and the tag search would lose
 * focus mid-keystroke.
 *
 * Purely presentational. It holds no selection state beyond the search box's
 * own query, performs no filtering, and cannot fail — the parent owns the URL
 * and the card list.
 *
 * @param {{
 *   availableTags: Array<{ tag: string, count: number }>,
 *   selectedTags: Array<string>,
 *   onTagsChange: (nextTags: Array<string>) => void,
 *   markedOnly: boolean,
 *   markedCount: number,
 *   onToggleMarked: () => void,
 *   shown: number,
 *   total: number,
 *   t: (key: string, options?: object) => string
 * }} props
 */
const SessionFilterBar = React.memo(function SessionFilterBar({
  availableTags,
  selectedTags,
  onTagsChange,
  markedOnly,
  markedCount,
  onToggleMarked,
  shown,
  total,
  t
}) {
  const [query, setQuery] = React.useState('')

  const hasTags = availableTags.length > 0
  const hasMarks = markedCount > 0 || markedOnly
  const showSearch = availableTags.length > SEARCH_THRESHOLD

  const matchingTags = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return availableTags
    return availableTags.filter(({ tag }) => tag.toLowerCase().includes(needle))
  }, [availableTags, query])

  const toggleTag = React.useCallback(
    (tag) => {
      const next = selectedTags.includes(tag) ? selectedTags.filter((selected) => selected !== tag) : [...selectedTags, tag]
      onTagsChange(next)
    },
    [selectedTags, onTagsChange]
  )

  // Nothing to control at all — the whole bar is noise (§11).
  if (!hasTags && !hasMarks) return null

  const tagsLabel =
    selectedTags.length > 0 ? t('cards.session.filters.tagsSelected', { count: selectedTags.length }) : t('cards.session.filters.tags')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Sheet variant='outlined' data-testid='session-filter-bar' sx={{ ...segmentedGroup, width: { xs: '100%', sm: 'auto' } }}>
        {hasTags && (
          <Dropdown>
            <MenuButton
              variant='plain'
              color='neutral'
              startDecorator={<LocalOfferOutlined fontSize='small' />}
              endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
              sx={{ ...segment(selectedTags.length > 0, true), flex: { xs: 1, sm: 'none' } }}
            >
              {tagsLabel}
            </MenuButton>

            <Menu placement='bottom-start' sx={{ minWidth: 232, maxHeight: 320, overflow: 'auto', borderRadius: 'md', p: 0.5 }}>
              {showSearch && (
                /*
                 * size='md', not 'sm': below 16px iOS Safari zooms the whole
                 * page on focus and does not zoom back out (§4.1.2). `sm` is
                 * banned on real text-entry fields for exactly this.
                 */
                <Box sx={{ p: 0.5, pb: 1 }}>
                  <Input
                    size='md'
                    value={query}
                    autoComplete='off'
                    onChange={(event) => setQuery(event.target.value)}
                    // A keystroke inside the menu must not be read as type-ahead
                    // navigation by the menu itself.
                    onKeyDown={(event) => event.stopPropagation()}
                    startDecorator={<Search fontSize='small' />}
                    placeholder={t('cards.session.filters.searchTags')}
                    slotProps={{ input: { 'aria-label': t('cards.session.filters.searchTags') } }}
                  />
                </Box>
              )}

              {matchingTags.map(({ tag, count }) => {
                const selected = selectedTags.includes(tag)
                return (
                  <MenuItem
                    key={tag}
                    // The correct role for a multi-select filter menu, and the
                    // one Joy's keyboard handling already understands.
                    role='menuitemcheckbox'
                    aria-checked={selected}
                    onClick={() => toggleTag(tag)}
                    sx={{ borderRadius: 'sm', ...focusRing }}
                  >
                    <Typography
                      level='body-sm'
                      sx={{ color: selected ? 'text.primary' : 'text.secondary', fontWeight: selected ? 'lg' : 'md' }}
                    >
                      {tag}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 'auto' }}>
                      {count}
                    </Typography>
                  </MenuItem>
                )
              })}

              {matchingTags.length === 0 && (
                <Typography level='body-sm' sx={{ color: 'text.tertiary', px: 1.5, py: 1 }}>
                  {t('cards.session.tagFilter.noOptions')}
                </Typography>
              )}

              {selectedTags.length > 0 && (
                <MenuItem onClick={() => onTagsChange([])} sx={{ borderRadius: 'sm', mt: 0.5, ...focusRing }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('cards.session.tagFilter.clear')}
                  </Typography>
                </MenuItem>
              )}
            </Menu>
          </Dropdown>
        )}

        {hasMarks && (
          <Button
            variant='plain'
            color='neutral'
            onClick={onToggleMarked}
            aria-pressed={markedOnly}
            data-testid='marked-filter-segment'
            startDecorator={markedOnly ? <Bookmark fontSize='small' /> : <BookmarkBorder fontSize='small' />}
            sx={{ ...segment(markedOnly, !hasTags), flex: { xs: 1, sm: 'none' } }}
          >
            {t('cards.session.markFilter.label', { count: markedCount })}
          </Button>
        )}
      </Sheet>

      {/* Progressive disclosure (§11): the count only earns its space once a
          filter is actually narrowing something. */}
      {(markedOnly || selectedTags.length > 0) && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t(markedOnly ? 'cards.session.markFilter.showing' : 'cards.session.tagFilter.showing', { shown, total })}
        </Typography>
      )}
    </Box>
  )
})

export default SessionFilterBar
