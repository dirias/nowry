import React from 'react'
import { Box, Dropdown, Input, Menu, MenuButton, MenuItem, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import SearchRounded from '@mui/icons-material/SearchRounded'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import CheckRounded from '@mui/icons-material/CheckRounded'
import GridViewRounded from '@mui/icons-material/GridViewRounded'
import ViewListRounded from '@mui/icons-material/ViewListRounded'
import { focusRing, segment, segmentedGroup, tabularNums } from '../Common/Form/formStyles'
import ViewSegment from '../Study/ViewSegment'
import { KINDS, SORTS } from './libraryQuery'

const menuSx = { minWidth: 232, maxHeight: 360, overflow: 'auto', borderRadius: 'md', p: 0.5 }
const itemSx = { borderRadius: 'sm', ...focusRing }
const keepOpen = (handler) => (event) => {
  event.preventDefault()
  handler(event)
}
const CheckMark = () => <CheckRounded fontSize='small' sx={{ ml: 'auto', color: 'primary.plainColor' }} />

/**
 * The library's one toolbar row (docs/prd-books-library.md D4, §15.7):
 * [All · Written · Imported] with counts · search on level1 · [Tags ▾ · Sort ▾]
 * as menu segments whose labels are their readouts · [grid | list]. No chip
 * strip; clearing lives inside the menu, so a filter never moves the list.
 */
export default function DocumentsToolbar({
  kind,
  onKind,
  counts,
  search,
  onSearch,
  tags,
  selectedTags,
  onTagToggle,
  onClearTags,
  sort,
  onSort,
  viewMode,
  onViewMode
}) {
  const { t } = useTranslation()
  const tagsActive = selectedTags.length > 0
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <ViewSegment
        ariaLabel={t('books.lib.kindAria')}
        testId='documents-kind'
        value={kind}
        onChange={onKind}
        options={KINDS.map((value) => ({ value, label: t(`books.lib.kind.${value}`), readout: counts?.[value] ?? 0 }))}
      />

      <Input
        size='md'
        value={search}
        onChange={(event) => onSearch?.(event.target.value)}
        placeholder={t('books.lib.search')}
        aria-label={t('books.lib.search')}
        startDecorator={<SearchRounded sx={{ color: 'text.tertiary' }} />}
        variant='soft'
        color='neutral'
        sx={{
          width: { xs: '100%', sm: 260 },
          '--Input-radius': 'var(--joy-radius-md)',
          '--Input-minHeight': '36px',
          bgcolor: 'background.level1',
          boxShadow: 'none',
          '&::before': { boxShadow: 'none' },
          '&:focus-within': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
        }}
      />

      <Sheet variant='outlined' data-testid='documents-filters' sx={{ ...segmentedGroup, width: { xs: '100%', sm: 'auto' } }}>
        {tags.length > 0 && (
          <Dropdown>
            <MenuButton
              variant='plain'
              color='neutral'
              aria-label={t('books.lib.tagsAria')}
              endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
              sx={{ ...segment(tagsActive, true), flex: { xs: 1, sm: 'none' }, ...tabularNums }}
            >
              {tagsActive ? t('books.lib.tagsReadout', { count: selectedTags.length }) : t('books.lib.tags')}
            </MenuButton>
            <Menu placement='bottom-start' sx={menuSx}>
              {tags.map(({ tag, count }) => {
                const checked = selectedTags.includes(tag)
                return (
                  <MenuItem key={tag} role='menuitemcheckbox' aria-checked={checked} onClick={keepOpen(() => onTagToggle(tag))} sx={itemSx}>
                    <Typography
                      level='body-sm'
                      sx={{ color: checked ? 'text.primary' : 'text.secondary', fontWeight: checked ? 'lg' : 'md' }}
                    >
                      {tag}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 1, ...tabularNums }}>
                      {count}
                    </Typography>
                    {checked && <CheckMark />}
                  </MenuItem>
                )
              })}
              {tagsActive && (
                <MenuItem onClick={onClearTags} sx={{ ...itemSx, mt: 0.5 }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('books.lib.clearTags')}
                  </Typography>
                </MenuItem>
              )}
            </Menu>
          </Dropdown>
        )}
        <Dropdown>
          <MenuButton
            variant='plain'
            color='neutral'
            aria-label={t('books.lib.sortAria')}
            endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
            sx={{ ...segment(false, tags.length === 0), flex: { xs: 1, sm: 'none' } }}
          >
            {t('books.lib.sort', { by: t(`books.lib.sortBy.${sort}`) })}
          </MenuButton>
          <Menu placement='bottom-start' sx={menuSx}>
            {SORTS.map((value) => {
              const checked = sort === value
              return (
                <MenuItem key={value} role='menuitemradio' aria-checked={checked} onClick={() => onSort(value)} sx={itemSx}>
                  <Typography
                    level='body-sm'
                    sx={{ color: checked ? 'text.primary' : 'text.secondary', fontWeight: checked ? 'lg' : 'md' }}
                  >
                    {t(`books.lib.sortBy.${value}`)}
                  </Typography>
                  {checked && <CheckMark />}
                </MenuItem>
              )
            })}
          </Menu>
        </Dropdown>
      </Sheet>

      <Box sx={{ ml: { sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
        <ViewSegment
          ariaLabel={t('books.lib.viewAria')}
          testId='documents-view'
          value={viewMode}
          onChange={onViewMode}
          options={[
            { value: 'grid', icon: <GridViewRounded fontSize='small' />, ariaLabel: t('books.lib.viewGrid') },
            { value: 'list', icon: <ViewListRounded fontSize='small' />, ariaLabel: t('books.lib.viewList') }
          ]}
        />
      </Box>
    </Box>
  )
}
