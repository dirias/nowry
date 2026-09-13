/**
 * The Calendar, on the phone (MOB-043).
 *
 * Built to the web's own phone view, which the Calendar canvas proposed and
 * CAL-001 shipped the same day. Its first line is the one that decides this
 * screen: **"The phone has one view."** FullCalendar never mounts below `sm`;
 * the agenda is what a phone gets, and the agenda is Nowry's own list rather
 * than a library's. So there is no month grid here to port and none missing.
 *
 * The web's three phone rows, in order: the readout leads and the nav object
 * ends the first row; the filter object stretches across the second; the agenda
 * fills what is left.
 *
 * It does not own a `Screen`. The calendar and the plan are two views of one
 * thing and share a tab, the way the Study Center's Dashboard and Library do,
 * so the tab owns the surface and this owns what is on it.
 *
 * **What the agenda is** (ADR-016): one group per day of the cursor's month
 * that has anything due, and in the current month the list starts at today
 * rather than making the reader scroll past what is already done. Today is
 * always the first group even when it is empty, so the screen always opens on
 * a "now". That rule is `groupAgenda`, shared, so both clients group a month
 * the same way rather than agreeing to.
 *
 * **The filters are chips, where the web has a segmented group.** That group is
 * three controls of different kinds — a toggle and two menus — held together by
 * a shared ground; a phone has no menu to anchor, and the segmented control in
 * this kit is single-select by construction (BUTTONS.md §5). Chips are the
 * phone's idiom for exactly this: a filter that is on or off, with its count in
 * its own label. The state it shows is the same state, from the same hook.
 *
 * **Ticking is optimistic, and it is the web's rule about which types can be
 * ticked** — a goal completes through its milestones and a habit is done in the
 * routine, so neither is a row action on a day (ADR-018).
 */
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { tasksService, annualPlanningService } from '@nowry/core/api/services'
import { calendarEventsKey } from '@nowry/core/api/services/calendar.service'
import { queryClient } from '@nowry/core/api/queryClient'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useCalendarEvents } from '@nowry/core/hooks/useCalendarEvents'
import { useCalendarFilters } from '@nowry/core/hooks/useCalendarFilters'
import { addMonths, formatDayLabel, formatDaySide, formatMonthTitle, isSameMonth } from '@nowry/core/domain/calendar/agendaGroups'
import { ALL_TYPES, allTypesActive } from '@nowry/core/domain/calendar/calendarFilters'
import { COMPLETABLE, completionPatch, stripTypePrefix, undoneStatus } from '@nowry/core/domain/calendar/eventHelpers'
import { eventType } from '@nowry/core/domain/calendar/eventTypes'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { CalendarFilterSheet } from './CalendarFilters'
import { EventFormSheet } from './EventForm'
import { Button, Chip, Divider, EventTile, Icon, IconButton, Skeleton, Stack, Typography } from '../ui'

/** The row's floor, and the web's own (`minHeight: 52`). */
const ROW_HEIGHT = 52

/**
 * What Add prefills. Today while today is on screen; otherwise the first of the
 * month being looked at. The web always prefills today, which is right on a
 * page whose month is one control away — but a phone user who paged to October
 * and reached for Add did not mean September.
 */
const defaultDateFor = (cursor) => (isSameMonth(cursor, new Date()) ? new Date() : new Date(cursor.getFullYear(), cursor.getMonth(), 1))

export function Calendar() {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [cursor, setCursor] = useState(() => new Date())
  const [sheet, setSheet] = useState(null)
  // `null` when closed; otherwise what the form is for. One piece of state, so
  // the sheet cannot be open in create mode and edit mode at once.
  const [form, setForm] = useState(null)
  const { filters, setFilters, applyPreset } = useCalendarFilters()

  const { groups, past, focusAreas, loading, error, reload } = useCalendarEvents({ cursor, filters })

  const showsToday = isSameMonth(cursor, new Date())
  const title = useMemo(() => formatMonthTitle(cursor, language), [cursor, language])

  /**
   * The tick, applied to the cache first and sent second.
   *
   * A day's list is read at arm's length and ticked with a thumb; waiting for a
   * round trip to redraw the row is the same mistake the study session's grades
   * would have been. A failure puts the row back and reloads, so the screen
   * never keeps a state the server rejected.
   */
  const toggleComplete = useCallback(
    async (event) => {
      const done = event.status !== 'completed'
      const key = calendarEventsKey(userId, cursor.getFullYear())
      const status = done ? 'completed' : undoneStatus(event.type)

      queryClient.setQueryData(key, (cached) =>
        cached ? { ...cached, events: cached.events.map((e) => (e.id === event.id ? { ...e, status } : e)) } : cached
      )

      const id = stripTypePrefix(event.id)
      try {
        if (event.type === 'task') await tasksService.update(id, completionPatch('task', done))
        else if (event.type === 'priority') await annualPlanningService.updatePriority(id, completionPatch('priority', done))
        else if (event.type === 'milestone') {
          await annualPlanningService.updateMilestone(event.goalId, event.milestoneId, completionPatch('milestone', done))
        }
      } catch {
        reload()
      }
    },
    [userId, cursor, reload]
  )

  const typesNarrowed = !allTypesActive(filters.activeTypes)
  const areasNarrowed = filters.activeAreaIds.length > 0

  return (
    <>
      <Stack spacing={2} style={{ flex: 1 }}>
        {/*
         * The web's own pairing: the readout leads and the nav object ends the
         * same row. Splitting them left the nav alone on a row of its own with
         * two thirds of it empty — reported by looking at it (MOB-062).
         */}
        <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
          <Typography level='h4' style={{ flex: 1 }} accessibilityRole='header'>
            {title}
          </Typography>
          <IconButton
            size='sm'
            accessibilityLabel={t('calendarPage.nav.previous')}
            onPress={() => setCursor((date) => addMonths(date, -1))}
          >
            <Icon name='ChevronLeft' size='sm' />
          </IconButton>
          <IconButton size='sm' accessibilityLabel={t('calendarPage.nav.next')} onPress={() => setCursor((date) => addMonths(date, 1))}>
            <Icon name='ChevronRight' size='sm' />
          </IconButton>
          {/* Today is disabled ON today's month rather than hidden: a control
              that disappears when it would do nothing moves the two beside it. */}
          <Button size='sm' variant='tertiary' disabled={showsToday} onPress={() => setCursor(new Date())}>
            {t('calendarPage.nav.today')}
          </Button>
        </Stack>

        {/*
         * Row two: the filter object, and the page's one action where the row
         * ends.
         *
         * The web gives that key a row of its own because that row also holds
         * the page title. This client has no page title — the tab bar and the
         * segment above have already said "Calendar" twice — so the key alone
         * on a row left two thirds of it empty, which is the same fault as
         * before it moved and merely a row lower (MOB-065). The filter chips
         * are compact; the key takes the space they leave.
         */}
        <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
          <Chip
            selected={filters.habitsEnabled}
            onPress={() => setFilters((f) => ({ ...f, habitsEnabled: !f.habitsEnabled }))}
            accessibilityLabel={t('calendarPage.filters.habits')}
          >
            {t('calendarPage.filters.habits')}
          </Chip>
          <Chip selected={typesNarrowed} onPress={() => setSheet('types')}>
            {typesNarrowed
              ? t('calendarPage.filters.typesSelected', { count: filters.activeTypes.length })
              : t('calendarPage.filters.types')}
          </Chip>
          <Chip selected={areasNarrowed} onPress={() => setSheet('areas')}>
            {areasNarrowed
              ? t('calendarPage.filters.areasSelected', { count: filters.activeAreaIds.length })
              : t('calendarPage.filters.areas')}
          </Chip>

          <View style={{ flex: 1 }} />

          <Button
            size='sm'
            startGlyph={<Icon name='Plus' size='sm' color='primary.solidColor' />}
            onPress={() => setForm({ mode: 'create', defaultDate: defaultDateFor(cursor) })}
          >
            {t('calendarPage.addEvent')}
          </Button>
        </Stack>

        {error ? (
          <Stack spacing={2}>
            <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {t('calendarPage.error')}
            </Typography>
            <Button variant='secondary' onPress={reload}>
              {t('common.retry')}
            </Button>
          </Stack>
        ) : (
          <View style={{ flex: 1 }}>
            <Agenda
              groups={groups}
              past={past}
              loading={loading}
              language={language}
              cursor={cursor}
              theme={theme}
              onToggleComplete={toggleComplete}
              onSelect={(event) => setForm({ mode: 'edit', event })}
              t={t}
            />
          </View>
        )}
      </Stack>

      <CalendarFilterSheet
        open={sheet}
        onClose={() => setSheet(null)}
        filters={filters}
        setFilters={setFilters}
        applyPreset={applyPreset}
        focusAreas={focusAreas}
      />

      <EventFormSheet
        open={Boolean(form)}
        mode={form?.mode ?? 'create'}
        event={form?.event ?? null}
        defaultDate={form?.defaultDate ?? null}
        onClose={() => setForm(null)}
        onSaved={reload}
      />
    </>
  )
}

/**
 * The list. A `ScrollView` of grouped rows rather than a section list: a month
 * is tens of rows, not thousands, and the day headers are part of the list's
 * own rhythm rather than sticky chrome.
 */
function Agenda({ groups, past, loading, language, cursor, theme, onToggleComplete, onSelect, t }) {
  /*
   * Closed, because the agenda's rule is still the rule: the list starts at
   * today and what is already done does not sit above it (ADR-016). What
   * changed is that the days behind it are now reachable at all — on the web
   * they are one click away in the month grid, and this client has no grid, so
   * an overdue item from earlier this month could be found from nowhere
   * (MOB-100).
   */
  const [showPast, setShowPast] = useState(false)
  const empty = !loading && groups.length === 0

  if (loading && groups.length === 0) {
    return (
      <Stack spacing={2}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width='100%' height={ROW_HEIGHT} />
        ))}
      </Stack>
    )
  }

  if (empty) {
    return (
      <Stack spacing={1} style={{ paddingVertical: theme.spacing[5], alignItems: 'center' }}>
        <Typography level='title-md' color='text.secondary' style={{ textAlign: 'center' }}>
          {t('calendarPage.agenda.empty.title', { month: formatMonthTitle(cursor, language) })}
        </Typography>
        <Typography level='body-sm' color='text.secondary' style={{ textAlign: 'center' }}>
          {t('calendarPage.agenda.empty.body')}
        </Typography>
      </Stack>
    )
  }

  const day = (group) => (
    <View key={group.date.getTime()}>
      <DayHeader group={group} language={language} theme={theme} t={t} />
      {group.isToday && group.events.length === 0 ? (
        <Typography level='body-sm' color='text.tertiary' style={{ paddingVertical: theme.spacing[2] }}>
          {t('calendarPage.agenda.emptyToday')}
        </Typography>
      ) : null}
      {group.events.map((event) => (
        <EventRow key={event.id} event={event} theme={theme} onToggleComplete={onToggleComplete} onSelect={onSelect} t={t} />
      ))}
    </View>
  )

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: theme.spacing[3] }}>
      {/* Above today, because that is where earlier is. Counted, so the row
          says whether opening it is worth the tap — the same disclosure the
          task panel uses for what is already done (MOB-081). */}
      {past.length > 0 ? (
        <>
          <Pressable
            onPress={() => setShowPast((open) => !open)}
            accessibilityRole='button'
            accessibilityState={{ expanded: showPast }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing[1],
              minHeight: ROW_HEIGHT,
              paddingHorizontal: theme.spacing[1],
              opacity: pressed ? 0.7 : 1
            })}
          >
            <Icon name={showPast ? 'ChevronDown' : 'ChevronRight'} size='sm' color='text.tertiary' />
            <Typography level='body-sm' color='text.secondary'>
              {`${t('calendarPage.agenda.earlier')} · ${past.reduce((sum, group) => sum + group.events.length, 0)}`}
            </Typography>
          </Pressable>
          {showPast ? past.map(day) : null}
        </>
      ) : null}

      {groups.map(day)}
    </ScrollView>
  )
}

/** The day's band: its label, and the month beside it in the lighter tone. */
function DayHeader({ group, language, theme, t }) {
  return (
    <View
      accessibilityRole='header'
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: theme.spacing[1],
        paddingVertical: theme.spacing[1],
        paddingHorizontal: theme.spacing[1],
        borderRadius: theme.radius.sm,
        backgroundColor: resolveColor(theme, group.isToday ? 'primary.softBg' : 'background.level1')
      }}
    >
      <Typography level='title-sm' color={group.isToday ? 'primary.softColor' : 'text.primary'}>
        {group.isToday ? t('calendarPage.agenda.today') : formatDayLabel(group.date, language)}
      </Typography>
      <Typography level='body-xs' color='text.tertiary'>
        {formatDaySide(group.date, language, group.isToday)}
      </Typography>
    </View>
  )
}

/**
 * One dated thing.
 *
 * The tile carries type and area; the title carries the thing; the line under
 * it says which area and which kind, in words, because the tile is decorative
 * to a screen reader. The tick is only drawn for the types that have a
 * completion of their own.
 */
function EventRow({ event, theme, onToggleComplete, onSelect, t }) {
  const completed = event.status === 'completed'
  const typeLabel = t(eventType(event.type).labelKey)
  const tickable = COMPLETABLE.includes(event.type)
  const tickLabel = completed ? t('calendarPage.agenda.markUndone') : t('calendarPage.agenda.markDone')

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          minHeight: ROW_HEIGHT,
          paddingVertical: theme.spacing[1]
        }}
      >
        <EventTile type={event.type} color={event.color} />
        {/* The title is the control that opens the thing, as it is on the web,
            where it is a `Link` rather than the whole row: a row that is one
            big button puts the tick inside another button, and a thumb that
            lands between them gets whichever the platform prefers. */}
        <Pressable
          onPress={() => onSelect?.(event)}
          accessibilityRole='button'
          accessibilityLabel={event.title}
          style={{ flex: 1, minWidth: 0, justifyContent: 'center', minHeight: MIN_TOUCH_TARGET }}
        >
          <Typography
            level='body-md'
            numberOfLines={1}
            color={completed ? 'text.tertiary' : 'text.primary'}
            style={completed ? { textDecorationLine: 'line-through' } : undefined}
          >
            {event.title}
          </Typography>
          <Typography level='body-xs' color='text.tertiary' numberOfLines={1}>
            {[event.areaName, typeLabel].filter(Boolean).join(' · ')}
          </Typography>
        </Pressable>
        {tickable ? (
          <IconButton
            size='sm'
            accessibilityLabel={tickLabel}
            accessibilityState={{ checked: completed }}
            onPress={() => onToggleComplete(event)}
          >
            <Icon name={completed ? 'CircleCheck' : 'Circle'} size='sm' color={completed ? 'success.plainColor' : 'text.tertiary'} />
          </IconButton>
        ) : null}
      </View>
      <Divider />
    </>
  )
}

export default Calendar
