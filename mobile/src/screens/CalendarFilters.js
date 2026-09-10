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
 * only the handle, the scrim or Done closes it. `ActionSheet` is the kit's
 * usual answer to a menu and is the wrong one here: it closes on every choice,
 * because it lists actions rather than a state you are composing.
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
import { Pressable, View } from 'react-native'
import { ALL_TYPES } from '@nowry/core/domain/calendar/calendarFilters'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { BottomSheet, Button, Divider, Icon, Stack, Typography } from '../ui'

/** The web's own order, which is not the filter's storage order. */
const TYPE_ROWS = [
  { key: 'goal', labelKey: 'calendarPage.filters.typeGoal' },
  { key: 'task', labelKey: 'calendarPage.filters.typeTask' },
  { key: 'priority', labelKey: 'calendarPage.filters.typePriority' },
  { key: 'milestone', labelKey: 'calendarPage.filters.typeMilestone' }
]

export function CalendarFilterSheet({ open, onClose, filters, setFilters, applyPreset, focusAreas = [] }) {
  const { t } = useTranslation()

  const toggleType = (type) =>
    setFilters((f) => {
      const active = f.activeTypes.includes(type)
      // The last type cannot be unchecked: an empty filter shows nothing.
      if (active && f.activeTypes.length === 1) return f
      return { ...f, activeTypes: active ? f.activeTypes.filter((x) => x !== type) : [...f.activeTypes, type] }
    })

  const toggleArea = (areaId) =>
    setFilters((f) => ({
      ...f,
      activeAreaIds: f.activeAreaIds.includes(areaId) ? f.activeAreaIds.filter((id) => id !== areaId) : [...f.activeAreaIds, areaId]
    }))

  const isTypes = open === 'types'
  const title = isTypes ? t('calendarPage.filters.types') : t('calendarPage.filters.areas')

  return (
    <BottomSheet visible={Boolean(open)} onClose={onClose} title={title}>
      {isTypes ? (
        <View>
          <CheckRow label={t('calendarPage.filters.goalsOnly')} checked={false} onPress={() => applyPreset('goals_only')} role='button' />
          <Divider />
          {TYPE_ROWS.map(({ key, labelKey }) => (
            <CheckRow key={key} label={t(labelKey)} checked={filters.activeTypes.includes(key)} onPress={() => toggleType(key)} />
          ))}
          <Divider />
          <CheckRow
            label={t('calendarPage.filters.showAllTypes')}
            checked={false}
            onPress={() => setFilters((f) => ({ ...f, activeTypes: [...ALL_TYPES] }))}
            role='button'
          />
        </View>
      ) : (
        <View>
          {focusAreas.length === 0 ? (
            <Stack spacing={1} style={{ paddingVertical: 8 }}>
              <Typography level='body-md'>{t('calendarPage.filters.noAreas')}</Typography>
              <Typography level='body-sm' color='text.tertiary'>
                {t('calendarPage.filters.noAreasBody')}
              </Typography>
            </Stack>
          ) : (
            <>
              {focusAreas.map((area) => (
                <CheckRow
                  key={area.id}
                  label={area.name}
                  swatch={area.color}
                  checked={filters.activeAreaIds.includes(area.id)}
                  onPress={() => toggleArea(area.id)}
                />
              ))}
              <Typography level='body-xs' color='text.tertiary' style={{ paddingTop: 8 }}>
                {t('calendarPage.filters.areasHint')}
              </Typography>
            </>
          )}
        </View>
      )}

      <Button variant='secondary' onPress={onClose} style={{ marginTop: 16 }}>
        {t('common.close')}
      </Button>
    </BottomSheet>
  )
}

/**
 * One row of the sheet. `checkbox` rather than `button`, with the state in
 * `accessibilityState`, so a screen reader hears whether it is on before it is
 * pressed — the tick alone is a sighted-only signal.
 *
 * The preset and "show all" rows are actions, not states, and say so.
 */
function CheckRow({ label, checked, onPress, swatch = null, role = 'checkbox' }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'checkbox' ? { checked } : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: theme.spacing[1],
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? resolveColor(theme, 'background.level2') : 'transparent'
      })}
    >
      {swatch ? <View style={{ width: 10, height: 10, borderRadius: theme.radius.xs, backgroundColor: swatch, flexShrink: 0 }} /> : null}
      <Typography level='body-md' color={checked ? 'text.primary' : 'text.secondary'} style={{ flex: 1 }}>
        {label}
      </Typography>
      {checked ? <Icon name='Check' size='sm' color='primary.plainColor' /> : null}
    </Pressable>
  )
}

export default CalendarFilterSheet
