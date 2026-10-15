/**
 * The Day: the Plan tab's timeline (PLAN-003, PRD D9, D11, FR-005).
 *
 * One local date, read through the one spine (`useToday`): the day's
 * deadlines as chips above the hours, then the blocks grouped under the three
 * periods, each a row of the one anatomy, with a now-line drawn where the
 * clock is. The current block carries the page's single solid key, Start;
 * Add block is the secondary and floats where the thumb is.
 *
 * Three readers feed it and none is duplicated here: `useToday` for the day,
 * a second `useBlocks` over the last sixty days for the rows' streaks (the
 * log is the record, PRD D5, and the client has no other window on it yet),
 * and `useAnnualPlan` for the colour a goal block's area gives its tile.
 *
 * **Empty is the same object with one sentence in it** (§15.10), never a
 * centred block: a new learner meets the page in the shape they will use.
 *
 * It does not own a `Screen`; the Plan tab does, as it does for the agenda
 * and the overview (MOB-046). It owns its own scroll so the floating key can
 * sit over the list rather than scroll with it.
 */
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useToday } from '@nowry/core/hooks/useToday'
import { useBlocks } from '@nowry/core/hooks/useBlocks'
import { useBlockLog } from '@nowry/core/hooks/useBlockLog'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useDeckData } from '@nowry/core/hooks/useDeckData'
import { useStatistics } from '@nowry/core/hooks/useStatistics'
import { studySummary } from '@nowry/core/domain/studySummary'
import { addDaysKey, keptRate, localDateKey, parseDateKey } from '@nowry/core/domain/blocks'
import { useTheme } from '../theme'
import { PET_BUBBLE_CLEARANCE } from '../ui/patterns/PetBubble'
import { BlockSheet } from './BlockSheet'
import {
  ActionSheet,
  BlockRow,
  Button,
  Chip,
  Divider,
  Icon,
  IconButton,
  IdentityTile,
  LIST_ROW_HEIGHT,
  Readout,
  SectionHeader,
  Skeleton,
  Stack,
  Typography,
  resolveColor
} from '../ui'

/** How far back the streaks look. The API caps a range at 62 days. */
const STREAK_WINDOW_DAYS = 60
const NOW_LINE_WIDTH = 2
const NOW_DOT = 12
/** Room under the list for the floating key and the companion beneath it. */
const FLOATING_KEY_HEIGHT = 40

export function PlanDay() {
  const { t, i18n } = useTranslation()
  const language = i18n?.language ?? 'en'
  const theme = useTheme()
  const router = useRouter()

  const [key, setKey] = useState(() => localDateKey())
  const todayKey = localDateKey()

  const decks = useDeckData()
  const { statistics } = useStatistics()
  const dueToday = studySummary({ decks: decks.decks, statistics }).due

  const day = useToday({ date: key, dueToday })
  const history = useBlocks({ from: addDaysKey(todayKey, -STREAK_WINDOW_DAYS), to: todayKey })
  const log = useBlockLog()
  const { areas } = useAnnualPlan()

  const logs = useMemo(() => (history.occurrences ?? []).filter((o) => o.log).map((o) => o.log), [history.occurrences])
  const areaColors = useMemo(() => new Map((areas || []).map((a) => [a._id || a.id, a.color])), [areas])

  // `null` when closed; otherwise what the sheet is for. One piece of state, so
  // it cannot be open for a new block and an existing one at once.
  const [sheet, setSheet] = useState(null)
  const [menu, setMenu] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const title = useMemo(() => {
    const date = parseDateKey(key)
    const label = new Intl.DateTimeFormat(language, { weekday: 'short', month: 'short', day: 'numeric' }).format(date)
    return day.isToday ? `${t('calendarPage.agenda.today')} · ${label}` : label
  }, [key, language, day.isToday, t])

  /*
   * The clock the rows read. Today's is the minute; a day behind us is over,
   * so an unlogged block reads as missed; a day ahead has not started.
   */
  const clock = day.isToday ? day.nowMinutes : key < todayKey ? 24 * 60 : -1
  const currentId = day.isToday ? (day.current?.blockId ?? null) : null

  const toggle = useCallback((o) => (o.log?.status === 'kept' ? log.undo(o) : log.keep(o)), [log])

  const actions = menu
    ? [
        { id: 'kept', label: t('blocks.actions.kept'), onPress: () => log.keep(menu) },
        { id: 'skip', label: t('blocks.actions.skip'), onPress: () => log.skip(menu) },
        { id: 'undo', label: t('blocks.actions.undo'), disabled: !menu.log, onPress: () => log.undo(menu) },
        { id: 'edit', label: t('common.edit'), onPress: () => setSheet({ mode: 'edit', block: menu.block }) },
        { id: 'delete', label: t('common.delete'), destructive: true, onPress: () => setConfirming(menu) }
      ]
    : []

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: theme.spacing[2], paddingBottom: PET_BUBBLE_CLEARANCE + FLOATING_KEY_HEIGHT + theme.spacing[2] }}
      >
        {/* The readout leads and the nav object ends the same row (MOB-062). */}
        <Stack direction='row' spacing={1} style={{ alignItems: 'center' }}>
          <Typography level='h4' style={{ flex: 1 }} accessibilityRole='header' numberOfLines={1}>
            {title}
          </Typography>
          <IconButton size='sm' accessibilityLabel={t('blocks.nav.previousDay')} onPress={() => setKey((k) => addDaysKey(k, -1))}>
            <Icon name='ChevronLeft' size='sm' />
          </IconButton>
          <IconButton size='sm' accessibilityLabel={t('blocks.nav.nextDay')} onPress={() => setKey((k) => addDaysKey(k, 1))}>
            <Icon name='ChevronRight' size='sm' />
          </IconButton>
          {/* Disabled on today rather than hidden, as the agenda's is: a control
              that disappears moves the two beside it. */}
          <Button size='sm' variant='tertiary' disabled={day.isToday} onPress={() => setKey(todayKey)}>
            {t('calendarPage.nav.today')}
          </Button>
        </Stack>

        {day.deadlines.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[1] }}>
            {day.deadlines.map((event) => (
              <Chip key={event.id} startGlyph={<IdentityTile color={event.color} />} accessibilityLabel={event.title}>
                {event.title}
              </Chip>
            ))}
          </ScrollView>
        ) : null}

        {day.error ? (
          <Stack spacing={2}>
            <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
              {t('blocks.error')}
            </Typography>
            <Button variant='secondary' onPress={day.reload}>
              {t('common.retry')}
            </Button>
          </Stack>
        ) : (
          <Timeline
            day={day}
            clock={clock}
            currentId={currentId}
            logs={logs}
            todayKey={todayKey}
            areaColors={areaColors}
            theme={theme}
            t={t}
            onOpen={(o) => setSheet({ mode: 'edit', block: o.block })}
            onMenu={setMenu}
            onToggle={toggle}
            onStart={() => router.push('/pomodoro')}
          />
        )}
      </ScrollView>

      {/* The secondary, floating where the thumb is and clear of the companion
          that rests in the same corner on every tab (MOB-089). */}
      <View pointerEvents='box-none' style={{ position: 'absolute', right: 0, bottom: PET_BUBBLE_CLEARANCE }}>
        <View style={{ borderRadius: theme.radius.md, backgroundColor: resolveColor(theme, 'background.surface'), ...theme.elevation.lg }}>
          <Button
            variant='secondary'
            startGlyph={<Icon name='Plus' size='sm' color='text.secondary' />}
            onPress={() => setSheet({ mode: 'create' })}
          >
            {t('blocks.add')}
          </Button>
        </View>
      </View>

      <ActionSheet
        visible={Boolean(menu)}
        onClose={() => setMenu(null)}
        title={menu?.title || menu?.block?.title || ''}
        actions={actions}
      />

      <ActionSheet
        visible={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={t('blocks.confirmDelete.title')}
        accessibilityLabel={t('blocks.confirmDelete.body', { title: confirming?.title || confirming?.block?.title || '' })}
        actions={[
          { id: 'cancel', label: t('common.cancel') },
          {
            id: 'delete',
            label: t('blocks.confirmDelete.confirm'),
            destructive: true,
            onPress: () => history.remove(confirming.blockId).catch(() => day.reload())
          }
        ]}
      />

      <BlockSheet
        open={Boolean(sheet)}
        mode={sheet?.mode ?? 'create'}
        block={sheet?.block ?? null}
        date={key}
        blocks={history.blocks ?? []}
        due={day.due}
        suggestedMinutes={day.suggestedStudyLength}
        onClose={() => setSheet(null)}
        create={history.create}
        update={history.update}
        remove={history.remove}
      />
    </View>
  )
}

/**
 * The hours: three period groups, a hairline under each header, one row per
 * block, and the now-line between what is behind and what is next.
 */
function Timeline({ day, clock, currentId, logs, todayKey, areaColors, theme, t, onOpen, onMenu, onToggle, onStart }) {
  if (day.loading && day.occurrences.length === 0) {
    return (
      <Stack spacing={2}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width='100%' height={LIST_ROW_HEIGHT} />
        ))}
      </Stack>
    )
  }

  if (day.occurrences.length === 0) {
    return (
      <Typography level='body-md' color='text.secondary' style={{ paddingVertical: theme.spacing[2] }}>
        {t('blocks.empty')}
      </Typography>
    )
  }

  // The now-line sits before the current block; when the day is behind the
  // clock entirely it sits after the last row.
  const last = day.occurrences[day.occurrences.length - 1]
  const lineBefore = day.isToday ? currentId : null
  const lineAfterLast = day.isToday && !currentId

  return (
    <Stack spacing={2}>
      {day.periods
        .filter((group) => group.items.length > 0)
        .map((group) => {
          const rate = keptRate(group.items)
          return (
            <View key={group.period}>
              <SectionHeader
                title={t(`annualPlanning.dailyRoutine.short.${group.period}`)}
                count={t('blocks.periodKept', { kept: rate.kept, total: rate.planned })}
              />
              <Divider />
              {group.items.map((o, i) => (
                <View key={`${o.blockId}|${o.date}`}>
                  {i > 0 ? <Divider /> : null}
                  {lineBefore === o.blockId ? <NowLine theme={theme} /> : null}
                  <BlockRow
                    occurrence={o}
                    clock={clock}
                    isToday={day.isToday}
                    current={currentId === o.blockId}
                    logs={logs}
                    todayKey={todayKey}
                    areaColor={o.block?.areaId ? (areaColors.get(o.block.areaId) ?? null) : null}
                    due={day.due}
                    suggestedMinutes={day.suggestedStudyLength}
                    onOpen={onOpen}
                    onMenu={onMenu}
                    onToggle={onToggle}
                    onStart={onStart}
                  />
                  {lineAfterLast && o === last ? <NowLine theme={theme} /> : null}
                </View>
              ))}
            </View>
          )
        })}

      <Readout>{t('blocks.keptOf', { kept: day.kept.kept, total: day.kept.planned })}</Readout>
    </Stack>
  )
}

/**
 * Where the clock is: a 2pt rule with a 12pt dot at its left, laid over the
 * seam between two rows. It takes no height of its own, so it is a mark on
 * the list and not a row in it.
 */
function NowLine({ theme }) {
  const color = resolveColor(theme, 'warning.plainColor')
  return (
    <View importantForAccessibility='no' accessible={false} pointerEvents='none' style={{ height: 0, overflow: 'visible', zIndex: 1 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: -NOW_LINE_WIDTH / 2, height: NOW_LINE_WIDTH, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          left: -NOW_DOT / 2 + theme.spacing[1.5],
          top: -NOW_DOT / 2,
          width: NOW_DOT,
          height: NOW_DOT,
          borderRadius: NOW_DOT / 2,
          backgroundColor: color
        }}
      />
    </View>
  )
}

export default PlanDay
