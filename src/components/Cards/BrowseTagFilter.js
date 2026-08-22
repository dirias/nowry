import React from 'react'
import { Autocomplete, AutocompleteOption, Chip, ChipDelete, Stack, Typography } from '@mui/joy'
import { LocalOfferOutlined } from '@mui/icons-material'

/**
 * Explicit keyboard focus ring. Joy's default relies on the browser outline,
 * which the Autocomplete's own border styling visually swallows — so the ring
 * is declared here rather than inherited (CLAUDE.md accessibility rule).
 */
const FOCUS_RING = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.solidBg',
    outlineOffset: '2px'
  }
}

/**
 * Inline tag filter for a Browse-mode study session.
 *
 * MODULE SCOPE + React.memo, deliberately — see the PERF-01 comment at the top
 * of StudySession.js. Defining this inside StudySession()'s body would give it
 * a new function identity every render, which React reads as a new component
 * TYPE: the whole subtree would unmount and remount, and the combobox would
 * lose focus mid-keystroke. `t` is a prop for the same reason the other
 * hoisted children take it — the component owns no i18n context of its own.
 *
 * Purely presentational: it holds no selection state, performs no filtering,
 * and cannot fail. The parent owns the URL and the card list.
 *
 * @param {{
 *   availableTags: Array<{ tag: string, count: number }>,
 *   selectedTags: Array<string>,
 *   onChange: (nextTags: Array<string>) => void,
 *   shown: number,
 *   total: number,
 *   t: (key: string, options?: object) => string
 * }} props
 */
const BrowseTagFilter = React.memo(function BrowseTagFilter({ availableTags, selectedTags, onChange, shown, total, t }) {
  const options = React.useMemo(() => availableTags.map(({ tag }) => tag), [availableTags])
  const countByTag = React.useMemo(() => availableTags.reduce((acc, { tag, count }) => ({ ...acc, [tag]: count }), {}), [availableTags])

  return (
    <Stack direction='row' justifyContent='flex-end' alignItems='center' spacing={1} sx={{ mb: 2 }}>
      {/* Progressive disclosure (§11): the count only earns its space once a
          filter is actually narrowing something. */}
      {selectedTags.length > 0 && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('cards.session.tagFilter.showing', { shown, total })}
        </Typography>
      )}

      <Autocomplete
        multiple
        size='sm'
        variant='outlined'
        limitTags={2}
        disableCloseOnSelect
        options={options}
        value={selectedTags}
        onChange={(event, value) => onChange(value)}
        getOptionLabel={(option) => option}
        isOptionEqualToValue={(option, value) => option === value}
        placeholder={t('cards.session.tagFilter.placeholder')}
        noOptionsText={t('cards.session.tagFilter.noOptions')}
        startDecorator={<LocalOfferOutlined fontSize='small' />}
        slotProps={{
          input: { 'aria-label': t('cards.session.tagFilter.ariaLabel'), sx: FOCUS_RING },
          clearIndicator: { 'aria-label': t('cards.session.tagFilter.clear'), sx: FOCUS_RING }
        }}
        renderTags={(tags, getTagProps) =>
          tags.map((tag, index) => {
            // Joy folds the delete handler into `onClick` and forwards the rest
            // (size/disabled/tabIndex/data-tag-index) to ChipDelete. Mirrored
            // here so the only thing this override changes is the aria-label —
            // reusing the existing `filters.remove.tag` key, not a duplicate.
            const { key, ...tagProps } = getTagProps({ index })
            return (
              <Chip
                key={key ?? tag}
                size='sm'
                variant='soft'
                color='neutral'
                sx={{ minWidth: 0 }}
                endDecorator={<ChipDelete {...tagProps} aria-label={t('filters.remove.tag', { tag })} />}
              >
                {tag}
              </Chip>
            )
          })
        }
        renderOption={(optionProps, option) => {
          const { key, ...rest } = optionProps
          return (
            <AutocompleteOption key={key ?? option} {...rest}>
              {option}
              <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 'auto' }}>
                {countByTag[option]}
              </Typography>
            </AutocompleteOption>
          )
        }}
        sx={{ width: { xs: '100%', md: 280 }, bgcolor: 'background.surface' }}
      />
    </Stack>
  )
})

export default BrowseTagFilter
