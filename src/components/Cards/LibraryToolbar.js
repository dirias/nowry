import React from 'react'
import { Box, Button, Dropdown, Input, ListDivider, ListItemDecorator, Menu, MenuButton, MenuItem, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import SearchRounded from '@mui/icons-material/SearchRounded'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import CheckRounded from '@mui/icons-material/CheckRounded'
import GridViewRounded from '@mui/icons-material/GridViewRounded'
import ViewListRounded from '@mui/icons-material/ViewListRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import StyleRounded from '@mui/icons-material/StyleRounded'
import NoteAddRounded from '@mui/icons-material/NoteAddRounded'
import FileUploadRounded from '@mui/icons-material/FileUploadRounded'
import { focusRing, segment, segmentedGroup, tabularNums } from '../Common/Form/formStyles'
import ViewSegment from '../Study/ViewSegment'

export const LIBRARY_TABS = ['decks', 'cards', 'tags']
export const TYPE_FILTERS = [
  { key: 'flashcard', labelKey: 'cards.manage_content.filters.flashcards' },
  { key: 'quiz', labelKey: 'cards.manage_content.filters.quizzes' },
  { key: 'visual', labelKey: 'cards.manage_content.filters.visual' }
]

const menuSx = { minWidth: 232, maxHeight: 360, overflow: 'auto', borderRadius: 'md', p: 0.5 }
const itemSx = { borderRadius: 'sm', ...focusRing }
const keepOpen = (handler) => (event) => {
  handler()
  event.defaultMuiPrevented = true
}
const CheckMark = () => <CheckRounded fontSize='small' sx={{ ml: 'auto', color: 'primary.plainColor' }} />

/**
 * The library's one toolbar row (PRD D5, §15.7): [Decks · Cards] · search on
 * level1 · [Type ▾ · Tags ▾ · Marked] · [grid | list] · Add ▾.
 *
 * Filters are menus off their segments and the label is the readout ("Tags · 2");
 * there is no "All" chip, no filter sheet and no active-filter strip — clearing
 * lives inside each menu, so engaging a filter never moves the list. On a phone
 * each object stretches rail to rail on its own line.
 *
 * The Tags menu ends with a hairline and "No tag · N" (PRD D15, US-008): a
 * housekeeping state is a filter, never a group. Its count comes from the
 * groups index, so the owner loads that once Cards or Tags is engaged.
 */
export default function LibraryToolbar({
  tab,
  onTab,
  decksCount,
  cardsCount,
  tagsCount,
  search,
  onSearch,
  filterType,
  onFilterType,
  availableTags,
  selectedTags,
  onTagToggle,
  onClearTags,
  untagged = false,
  untaggedCount = 0,
  onUntaggedToggle,
  markedOnly,
  onMarkedOnlyToggle,
  viewMode,
  onViewMode,
  onNewDeck,
  onNewCard,
  onImport
}) {
  const { t } = useTranslation()
  const typeActive = filterType !== 'all'
  // "No tag" is a filter like any tag (PRD D15, ADR-023 point 1): it counts in
  // the readout and it clears with the rest. The menu exists as soon as there
  // is anything to filter by — a tag, or cards without one.
  const tagsActive = selectedTags.length > 0 || untagged
  const tagsReadoutCount = selectedTags.length + (untagged ? 1 : 0)
  const showTags = availableTags.length > 0 || untaggedCount > 0 || untagged

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <ViewSegment
        ariaLabel={t('cards.manage_content.title')}
        testId='library-tab'
        value={tab}
        onChange={onTab}
        options={[
          { value: 'decks', label: t('cards.manage_content.tabs.decksOnly'), readout: decksCount },
          { value: 'cards', label: t('cards.manage_content.tabs.cardsOnly'), readout: cardsCount },
          { value: 'tags', label: t('cards.manage_content.tabs.tagsOnly'), readout: tagsCount }
        ]}
      />

      <Input
        size='md'
        value={search}
        onChange={(event) => onSearch?.(event.target.value)}
        placeholder={t(tab === 'tags' ? 'groups.searchPlaceholder' : 'cards.manage_content.search.placeholder')}
        aria-label={t('cards.manage_content.aria.search')}
        startDecorator={<SearchRounded sx={{ color: 'text.tertiary' }} />}
        variant='soft'
        color='neutral'
        sx={{
          width: { xs: '100%', sm: 280 },
          '--Input-radius': 'var(--joy-radius-md)',
          '--Input-minHeight': '36px',
          bgcolor: 'background.level1',
          boxShadow: 'none',
          '&::before': { boxShadow: 'none' },
          '&:focus-within': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
        }}
      />

      {tab !== 'tags' && (
        <Sheet variant='outlined' data-testid='library-filters' sx={{ ...segmentedGroup, width: { xs: '100%', sm: 'auto' } }}>
          <Dropdown>
            <MenuButton
              variant='plain'
              color='neutral'
              aria-label={t('filters.typeMenuAria')}
              endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
              sx={{ ...segment(typeActive, true), flex: { xs: 1, sm: 'none' }, ...tabularNums }}
            >
              {typeActive ? t('filters.typeReadout', { count: 1 }) : t('filters.type')}
            </MenuButton>
            <Menu placement='bottom-start' sx={menuSx}>
              {TYPE_FILTERS.map(({ key, labelKey }) => {
                const checked = filterType === key
                return (
                  <MenuItem
                    key={key}
                    role='menuitemradio'
                    aria-checked={checked}
                    onClick={() => onFilterType(checked ? 'all' : key)}
                    sx={itemSx}
                  >
                    <Typography
                      level='body-sm'
                      sx={{ color: checked ? 'text.primary' : 'text.secondary', fontWeight: checked ? 'lg' : 'md' }}
                    >
                      {t(labelKey)}
                    </Typography>
                    {checked && <CheckMark />}
                  </MenuItem>
                )
              })}
              {typeActive && (
                <MenuItem onClick={() => onFilterType('all')} sx={{ ...itemSx, mt: 0.5 }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('filters.clear')}
                  </Typography>
                </MenuItem>
              )}
            </Menu>
          </Dropdown>

          {showTags && (
            <Dropdown>
              <MenuButton
                variant='plain'
                color='neutral'
                aria-label={t('cards.tags.filterBy')}
                endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
                sx={{ ...segment(tagsActive, false), flex: { xs: 1, sm: 'none' }, ...tabularNums }}
              >
                {tagsActive ? t('filters.tagsReadout', { count: tagsReadoutCount }) : t('filters.tags')}
              </MenuButton>
              <Menu placement='bottom-start' sx={menuSx}>
                {availableTags.map(({ tag, count }) => {
                  const checked = selectedTags.includes(tag)
                  return (
                    <MenuItem
                      key={tag}
                      role='menuitemcheckbox'
                      aria-checked={checked}
                      onClick={keepOpen(() => onTagToggle(tag))}
                      sx={itemSx}
                    >
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
                {availableTags.length > 0 && <ListDivider />}
                <MenuItem
                  role='menuitemcheckbox'
                  aria-checked={untagged}
                  data-testid='no-tag-filter'
                  onClick={keepOpen(() => onUntaggedToggle?.())}
                  sx={itemSx}
                >
                  <Typography
                    level='body-sm'
                    sx={{ color: untagged ? 'text.primary' : 'text.secondary', fontWeight: untagged ? 'lg' : 'md' }}
                  >
                    {t('filters.noTag')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', ml: 1, ...tabularNums }}>
                    {untaggedCount}
                  </Typography>
                  {untagged && <CheckMark />}
                </MenuItem>
                {tagsActive && (
                  <MenuItem onClick={onClearTags} sx={{ ...itemSx, mt: 0.5 }}>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {t('filters.clear')}
                    </Typography>
                  </MenuItem>
                )}
              </Menu>
            </Dropdown>
          )}

          {tab === 'cards' && (
            <Button
              variant='plain'
              color='neutral'
              aria-pressed={markedOnly}
              aria-label={markedOnly ? t('cards.mark.filter.showAll') : t('cards.mark.filter.showMarked')}
              onClick={onMarkedOnlyToggle}
              sx={{ ...segment(markedOnly, !showTags), flex: { xs: 1, sm: 'none' } }}
            >
              {t('filters.marked')}
            </Button>
          )}
        </Sheet>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          ml: { sm: 'auto' },
          width: { xs: '100%', sm: 'auto' },
          justifyContent: 'space-between'
        }}
      >
        {tab === 'decks' ? (
          <ViewSegment
            ariaLabel={t('cards.manage_content.aria.viewMode')}
            testId='library-view'
            value={viewMode}
            onChange={onViewMode}
            options={[
              { value: 'grid', icon: <GridViewRounded fontSize='small' />, ariaLabel: t('cards.manage_content.aria.gridView') },
              { value: 'list', icon: <ViewListRounded fontSize='small' />, ariaLabel: t('cards.manage_content.aria.listView') }
            ]}
          />
        ) : (
          <span />
        )}
        <Dropdown>
          <MenuButton
            variant='soft'
            color='neutral'
            startDecorator={<AddRounded />}
            endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
          >
            {t('cards.add')}
          </MenuButton>
          <Menu placement='bottom-end' sx={{ ...menuSx, minWidth: 200 }}>
            <MenuItem onClick={onNewDeck} sx={itemSx}>
              <ListItemDecorator>
                <StyleRounded />
              </ListItemDecorator>
              {t('cards.newDeck')}
            </MenuItem>
            <MenuItem onClick={onNewCard} sx={itemSx}>
              <ListItemDecorator>
                <NoteAddRounded />
              </ListItemDecorator>
              {t('cards.newCard')}
            </MenuItem>
            <ListDivider />
            <MenuItem onClick={onImport} sx={itemSx}>
              <ListItemDecorator>
                <FileUploadRounded />
              </ListItemDecorator>
              {t('cards.import.label')}
            </MenuItem>
          </Menu>
        </Dropdown>
      </Box>
    </Box>
  )
}
