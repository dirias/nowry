import React from 'react'
import { Box, Button, Dropdown, IconButton, ListDivider, Menu, MenuButton, MenuItem, Sheet, Typography } from '@mui/joy'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import CheckRounded from '@mui/icons-material/CheckRounded'

import { focusRing, segment, segmentedGroup, tabularNums } from '../Common/Form/formStyles'
import { ALL_TYPES, allTypesActive } from './calendarFilters'

export const CALENDAR_VIEWS = ['month', 'week', 'agenda']

const TYPE_ROWS = [
  { key: 'goal', labelKey: 'calendarPage.filters.typeGoal' },
  { key: 'task', labelKey: 'calendarPage.filters.typeTask' },
  { key: 'priority', labelKey: 'calendarPage.filters.typePriority' },
  { key: 'milestone', labelKey: 'calendarPage.filters.typeMilestone' }
]

const menuSx = { minWidth: 232, maxHeight: 360, overflow: 'auto', borderRadius: 'md', p: 0.5 }
const itemSx = { borderRadius: 'sm', ...focusRing }

// The arrow segments carry no text, so `segment`'s horizontal padding would
// make them wider than they are tall; a fixed width keeps them square and on
// the 44px floor where a thumb needs it.
const arrowSx = (first) => ({ ...segment(false, first), px: 0, minWidth: { xs: 44, sm: 40 } })

/**
 * A check row must not close the menu: narrowing to two types is two ticks, and
 * a menu that shuts after each one makes the user reopen it for every choice.
 * Base UI closes on any item click unless the handler marks the event as
 * handled — this is its documented escape hatch, not a stopPropagation hack.
 */
const keepOpen = (handler) => (event) => {
  handler()
  event.defaultMuiPrevented = true
}

const CheckMark = () => <CheckRounded fontSize='small' sx={{ ml: 'auto', color: 'primary.plainColor' }} />

/**
 * One row of controls on the calendar grid's two rails (ADR-016).
 *
 * Three objects, one per class (§15.2): the nav object acts on the view's
 * date, the filter object on the list, the view object on the lens. The date
 * is the nav object's *readout* — text beside the control that moves it — not
 * a title centred between two groups (§15.4). Filter state is a ground with a
 * count in the label, never a hue (§15.5): "Types" means no filter, "Types · 2"
 * means two chosen, so there is no "All" chip.
 *
 * On a phone the readout leads, the nav object ends the row, the filter object
 * stretches between both rules on its own row, and the view object is absent —
 * the agenda is the phone's only view.
 *
 * Purely presentational: the page owns the cursor, the view and the filters.
 */
const CalendarToolbar = ({
  view,
  onViewChange,
  title,
  onPrev,
  onNext,
  onToday,
  showsToday,
  filters,
  setFilters,
  applyPreset,
  focusAreas,
  isMobile,
  t
}) => {
  const typesNarrowed = !allTypesActive(filters.activeTypes)
  const areasNarrowed = filters.activeAreaIds.length > 0

  const toggleType = (type) =>
    setFilters((f) => {
      const active = f.activeTypes.includes(type)
      if (active && f.activeTypes.length === 1) return f // the last type cannot be unchecked
      return { ...f, activeTypes: active ? f.activeTypes.filter((x) => x !== type) : [...f.activeTypes, type] }
    })

  const toggleArea = (areaId) =>
    setFilters((f) => ({
      ...f,
      activeAreaIds: f.activeAreaIds.includes(areaId) ? f.activeAreaIds.filter((id) => id !== areaId) : [...f.activeAreaIds, areaId]
    }))

  const typesLabel = typesNarrowed
    ? t('calendarPage.filters.typesSelected', { count: filters.activeTypes.length })
    : t('calendarPage.filters.types')
  const areasLabel = areasNarrowed
    ? t('calendarPage.filters.areasSelected', { count: filters.activeAreaIds.length })
    : t('calendarPage.filters.areas')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
      <Sheet variant='outlined' data-testid='calendar-nav' sx={{ ...segmentedGroup, order: { xs: 2, sm: 1 } }}>
        <IconButton variant='plain' color='neutral' onClick={onPrev} aria-label={t('calendarPage.nav.previous')} sx={arrowSx(true)}>
          <ChevronLeftRounded />
        </IconButton>
        <IconButton variant='plain' color='neutral' onClick={onNext} aria-label={t('calendarPage.nav.next')} sx={arrowSx(false)}>
          <ChevronRightRounded />
        </IconButton>
        <Button variant='plain' color='neutral' onClick={onToday} aria-pressed={showsToday} sx={segment(showsToday, false)}>
          {t('calendarPage.nav.today')}
        </Button>
      </Sheet>

      <Typography level='title-lg' sx={{ order: { xs: 1, sm: 2 }, flex: { xs: 1, sm: 'none' }, minWidth: 0, ...tabularNums }}>
        {title}
      </Typography>

      <Box sx={{ flex: 1, order: 3, display: { xs: 'none', sm: 'block' } }} />

      <Sheet variant='outlined' data-testid='calendar-filters' sx={{ ...segmentedGroup, order: 4, width: { xs: '100%', sm: 'auto' } }}>
        <Button
          variant='plain'
          color='neutral'
          onClick={() => setFilters((f) => ({ ...f, habitsEnabled: !f.habitsEnabled }))}
          aria-pressed={filters.habitsEnabled}
          sx={{ ...segment(filters.habitsEnabled, true), flex: { xs: 1, sm: 'none' } }}
        >
          {t('calendarPage.filters.habits')}
        </Button>

        <Dropdown>
          <MenuButton
            variant='plain'
            color='neutral'
            endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
            sx={{ ...segment(typesNarrowed, false), flex: { xs: 1, sm: 'none' } }}
          >
            {typesLabel}
          </MenuButton>
          <Menu placement='bottom-start' sx={menuSx}>
            <MenuItem onClick={() => applyPreset('goals_only')} sx={itemSx}>
              <Typography level='body-sm'>{t('calendarPage.filters.goalsOnly')}</Typography>
            </MenuItem>
            <ListDivider />
            {TYPE_ROWS.map(({ key, labelKey }) => {
              const checked = filters.activeTypes.includes(key)
              return (
                <MenuItem key={key} role='menuitemcheckbox' aria-checked={checked} onClick={keepOpen(() => toggleType(key))} sx={itemSx}>
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
            {typesNarrowed && (
              <MenuItem onClick={() => setFilters((f) => ({ ...f, activeTypes: [...ALL_TYPES] }))} sx={{ ...itemSx, mt: 0.5 }}>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {t('calendarPage.filters.showAllTypes')}
                </Typography>
              </MenuItem>
            )}
          </Menu>
        </Dropdown>

        <Dropdown>
          <MenuButton
            variant='plain'
            color='neutral'
            endDecorator={<KeyboardArrowDown fontSize='small' sx={{ opacity: 0.65 }} />}
            sx={{ ...segment(areasNarrowed, false), flex: { xs: 1, sm: 'none' } }}
          >
            {areasLabel}
          </MenuButton>
          <Menu placement='bottom-end' sx={menuSx}>
            {focusAreas.length === 0 ? (
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography level='body-sm'>{t('calendarPage.filters.noAreas')}</Typography>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {t('calendarPage.filters.noAreasBody')}
                </Typography>
              </Box>
            ) : (
              focusAreas.map((area) => {
                const checked = filters.activeAreaIds.includes(area.id)
                return (
                  <MenuItem
                    key={area.id}
                    role='menuitemcheckbox'
                    aria-checked={checked}
                    onClick={keepOpen(() => toggleArea(area.id))}
                    sx={itemSx}
                  >
                    {/* area.color is user data, not a token — the same exception the event pills make */}
                    <Box sx={{ width: 10, height: 10, borderRadius: 'xs', bgcolor: area.color, flexShrink: 0 }} />
                    <Typography
                      level='body-sm'
                      sx={{ color: checked ? 'text.primary' : 'text.secondary', fontWeight: checked ? 'lg' : 'md' }}
                    >
                      {area.name}
                    </Typography>
                    {checked && <CheckMark />}
                  </MenuItem>
                )
              })
            )}
            {areasNarrowed && (
              <MenuItem onClick={() => setFilters((f) => ({ ...f, activeAreaIds: [] }))} sx={{ ...itemSx, mt: 0.5 }}>
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {t('calendarPage.filters.showAllAreas')}
                </Typography>
              </MenuItem>
            )}
            {focusAreas.length > 0 && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary', px: 1.5, pt: 1, pb: 0.5 }}>
                {t('calendarPage.filters.areasHint')}
              </Typography>
            )}
          </Menu>
        </Dropdown>
      </Sheet>

      {!isMobile && (
        <Sheet variant='outlined' data-testid='calendar-views' sx={{ ...segmentedGroup, order: 5 }}>
          {CALENDAR_VIEWS.map((name, index) => (
            <Button
              key={name}
              variant='plain'
              color='neutral'
              onClick={() => onViewChange(name)}
              aria-pressed={view === name}
              sx={segment(view === name, index === 0)}
            >
              {t(`calendarPage.views.${name}`)}
            </Button>
          ))}
        </Sheet>
      )}
    </Box>
  )
}

export default CalendarToolbar
