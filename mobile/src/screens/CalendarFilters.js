/**
 * The calendar's two filter menus, as one sheet (MOB-043).
 *
 * The web opens a dropdown under each control with checkable rows, and its own
 * comment records the rule that makes such a menu usable: **a check must not
 * close it.** Narrowing to two types is two ticks, and a menu that shuts after
 * each one makes the user reopen it for every choice.
 *
 * A phone has nothing to anchor a dropdown to, so this is a bottom sheet — but
 * the rule survives the translation: ticking a row leaves the sheet open, and
 * only the handle, the scrim or Close closes it. That rule is `ChoiceSheet`'s
 * now (MOB-064), and `ActionSheet` remains the wrong component here: it closes
 * on every choice, because it lists actions rather than a state you compose.
 *
 * **The last type cannot be unchecked.** An empty type filter is a calendar
 * that shows nothing, which reads as a bug rather than a filter, so the web
 * refuses it and so does this.
 *
 * Areas need no such rule: no areas selected means no area filter, and tasks
 * and priorities have no area at all, which is what the hint under the list
 * says rather than leaving the reader to work out why they are still there.
 */
import { useTranslation } from 'react-i18next'
import { ALL_TYPES } from '@nowry/core/domain/calendar/calendarFilters'
import { ChoiceRow, ChoiceSheet, Divider, Stack, Typography } from '../ui'

/** The web's own order, which is not the filter's storage order. */
const TYPE_ROWS = [
  { key: 'goal', labelKey: 'calendarPage.filters.typeGoal' },
  { key: 'task', labelKey: 'calendarPage.filters.typeTask' },
  { key: 'priority', labelKey: 'calendarPage.filters.typePriority' },
  { key: 'milestone', labelKey: 'calendarPage.filters.typeMilestone' }
]

export function CalendarFilterSheet({ open, onClose, filters, setFilters, applyPreset, focusAreas = [] }) {
  const { t } = useTranslation()

  if (open === 'types') {
    return (
      <ChoiceSheet
        visible
        multiple
        onClose={onClose}
        title={t('calendarPage.filters.types')}
        value={filters.activeTypes}
        // The last type cannot be unchecked: an empty filter shows nothing,
        // which reads as a bug rather than as a filter.
        onChange={(next) => (next.length === 0 ? null : setFilters((f) => ({ ...f, activeTypes: next })))}
        options={TYPE_ROWS.map(({ key, labelKey }) => ({ value: key, label: t(labelKey) }))}
        extra={
          <>
            <Divider />
            <ChoiceRow
              label={t('calendarPage.filters.showAllTypes')}
              role='button'
              onPress={() => setFilters((f) => ({ ...f, activeTypes: [...ALL_TYPES] }))}
            />
          </>
        }
      >
        {/* A preset is an action, not one of the types. */}
        <ChoiceRow label={t('calendarPage.filters.goalsOnly')} role='button' onPress={() => applyPreset('goals_only')} />
        <Divider />
      </ChoiceSheet>
    )
  }

  return (
    <ChoiceSheet
      visible={Boolean(open)}
      multiple
      onClose={onClose}
      title={t('calendarPage.filters.areas')}
      value={filters.activeAreaIds}
      onChange={(next) => setFilters((f) => ({ ...f, activeAreaIds: next }))}
      options={focusAreas.map((area) => ({ value: area.id, label: area.name, swatch: area.color }))}
      extra={
        focusAreas.length === 0 ? (
          <Stack spacing={1} style={{ paddingVertical: 8 }}>
            <Typography level='body-md'>{t('calendarPage.filters.noAreas')}</Typography>
            <Typography level='body-sm' color='text.tertiary'>
              {t('calendarPage.filters.noAreasBody')}
            </Typography>
          </Stack>
        ) : (
          /* Tasks and priorities have no area at all, which is why they stay
             on screen when an area filter is on. Said, rather than left to be
             worked out. */
          <Typography level='body-xs' color='text.tertiary' style={{ paddingTop: 8 }}>
            {t('calendarPage.filters.areasHint')}
          </Typography>
        )
      }
    />
  )
}

export default CalendarFilterSheet
