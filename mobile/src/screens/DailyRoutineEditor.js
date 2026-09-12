/**
 * The daily routine, written (MOB-080).
 *
 * This client could already tick a routine item on Home and could do nothing
 * else with one. There was no screen anywhere that created, renamed or removed
 * one, so a phone-only account had an empty panel with no way forward and
 * Home's own panel had to open on the Tasks tab to avoid showing it. The web
 * has had this editor at `/annual-planning/daily-routine` from the start; this
 * is that screen, at that path.
 *
 * Read from `src/components/AnnualPlanning/DailyRoutinePlanner.js`, which is:
 * three periods, each holding the goal activities slotted into it above the
 * items you wrote yourself, with a field at the foot to add one. Auto-saving,
 * with no Save key anywhere on it.
 *
 * **Three periods, one at a time.** The web draws all three side by side on a
 * laptop and one at a time on a phone, behind a segmented control — so the
 * phone shape is the one to build, and the control is the same one Home's own
 * routine panel carries, with words rather than the web's unlabelled glyphs.
 * The web pairs it with a swipe; that is left out, because a horizontal swipe
 * inside a vertical scroll is a gesture that fires when nobody meant it, and
 * the segments are already the full width of the screen.
 *
 * **Two endpoints, and which one is used depends on what changed.** Writing an
 * item PUTs the whole routine; ticking one PATCHes the day's completions. They
 * are not interchangeable: the PUT stores only the three period arrays, so it
 * cannot record a tick, and the PATCH replaces one day's list, so it cannot
 * record an item. Sending the routine through the completions endpoint would
 * lose the item, and sending a tick through the routine endpoint would lose the
 * tick — silently, in both directions.
 *
 * **The whole document goes back on a write**, not the part that changed: the
 * endpoint takes a full routine, including the fields no screen here reads.
 * That is `withRoutineItem` and its two siblings in `@nowry/core`, which are
 * where the field names live (MOB-075).
 *
 * **A write is applied to the screen first and sent second**, as every other
 * list in this client does, and a refusal puts the screen back and says so. An
 * editor that waits for a round trip before showing the item you typed reads as
 * one that dropped it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { randomUUID } from 'expo-crypto'
import { annualPlanningService } from '@nowry/core/api/services'
import { useDailyRoutine } from '@nowry/core/hooks/useDailyRoutine'
import { useAnnualPlan } from '@nowry/core/hooks/useAnnualPlan'
import { useAuth } from '@nowry/core/context/AuthContext'
import {
  ROUTINE_PERIODS,
  completedToday,
  currentPeriod,
  routineItem,
  routineItemTitle,
  routineItems,
  slottedActivities,
  toggledCompletions,
  todayKey,
  withRenamedRoutineItem,
  withRoutineIds,
  withRoutineItem,
  withoutRoutineItem
} from '@nowry/core/domain/dailyRoutine'
import { useTheme } from '../theme'
import {
  Button,
  Checkbox,
  Divider,
  Icon,
  IconButton,
  Input,
  ListRow,
  Screen,
  SectionHeader,
  Segmented,
  Skeleton,
  Stack,
  Typography
} from '../ui'

export function DailyRoutineEditor() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { user } = useAuth()

  const { routine, loading, error, invalidate, refetch } = useDailyRoutine()
  /*
   * The goal activities, the goals they serve and the areas those sit under all
   * arrive in the one request the Plan tab already makes, under the same query
   * key — so reaching this screen from the Plan tab costs nothing, and reaching
   * it from Home's pencil costs that one request rather than three.
   */
  const { goals, areas, activities } = useAnnualPlan(new Date().getFullYear(), user)

  // The period the clock is in, as every other routine surface opens on.
  const [period, setPeriod] = useState(() => currentPeriod())
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(null) // { id, title }
  const [saving, setSaving] = useState(false)
  const [ticking, setTicking] = useState(null)
  /*
   * What the screen shows while a write is in flight, and what it falls back to
   * when one is refused. `null` means "whatever the server last said", so a
   * reload after a successful write takes over without a second render of the
   * old value.
   */
  const [pendingRoutine, setPendingRoutine] = useState(null)
  const [failed, setFailed] = useState(false)

  const shown = pendingRoutine ?? routine
  const items = routineItems(shown, period)
  const done = completedToday(shown)

  /** What the plan has already put in this part of the day. */
  const slotted = useMemo(() => slottedActivities(activities, goals, areas, period), [activities, goals, areas, period])

  /**
   * Send a whole routine, having already drawn it.
   *
   * The optimistic copy is held until the refetched one arrives, because
   * clearing it at the moment the request resolves would show the stale cached
   * routine for the frame between the response and the reload.
   */
  const write = useCallback(
    async (next) => {
      setPendingRoutine(next)
      setFailed(false)
      setSaving(true)
      try {
        await annualPlanningService.updateDailyRoutine(next)
        // Home and the side menu read the same query key, so a routine written
        // here has to be a routine they see (CACHE-007).
        await invalidate()
        setPendingRoutine(null)
      } catch {
        setPendingRoutine(null)
        setFailed(true)
      } finally {
        setSaving(false)
      }
    },
    [invalidate]
  )

  /*
   * An item with no id cannot be renamed or removed — there is nothing to
   * address it by — so a routine written before the ids existed is repaired the
   * first time this screen sees it, exactly as the web's planner repairs it.
   * Once per mount: the ref is what keeps a write that changes the routine from
   * asking the same question about its own result.
   */
  const repaired = useRef(false)
  useEffect(() => {
    if (!routine || repaired.current) return
    repaired.current = true
    const next = withRoutineIds(routine, randomUUID)
    if (next) write(next)
  }, [routine, write])

  const add = useCallback(() => {
    const title = draft.trim()
    if (!title || saving) return
    setDraft('')
    write(withRoutineItem(shown, period, routineItem(randomUUID(), title)))
  }, [draft, saving, shown, period, write])

  const commitRename = useCallback(() => {
    if (!editing) return
    const title = editing.title.trim()
    const current = editing.id
    setEditing(null)
    // An empty field is a cancelled edit, not a delete: removing an item is a
    // verb with its own key and its own confirmation.
    if (!title || title === routineItemTitle(items.find((item) => item.id === current))) return
    write(withRenamedRoutineItem(shown, period, current, title))
  }, [editing, items, shown, period, write])

  const confirmRemove = useCallback(
    (item) => {
      const title = routineItemTitle(item)
      Alert.alert(t('annualPlanning.dailyRoutine.deleteItem'), t('annualPlanning.dailyRoutine.deleteBody', { title }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => write(withoutRoutineItem(shown, period, item.id))
        }
      ])
    },
    [t, shown, period, write]
  )

  /*
   * The tick, which is the one verb this screen shares with Home — and it goes
   * through the completions endpoint, never through the write above.
   */
  const toggle = useCallback(
    async (item) => {
      setTicking(item.id)
      try {
        await annualPlanningService.updateRoutineCompletions(todayKey(), toggledCompletions(shown, item.id))
        await invalidate()
      } catch {
        setFailed(true)
      } finally {
        setTicking(null)
      }
    },
    [shown, invalidate]
  )

  if (loading && !routine) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='70%' height={28} />
          <Skeleton width='100%' height={44} />
          <Skeleton width='100%' height={52} />
          <Skeleton width='100%' height={52} />
        </Stack>
      </Screen>
    )
  }

  if (error && !routine) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Typography level='body-md' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('annualPlanning.tabs.errorLoading')}
          </Typography>
          <Button variant='secondary' onPress={refetch}>
            {t('common.retry')}
          </Button>
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography level='h4' accessibilityRole='header'>
            {t('annualPlanning.dailyRoutine.title')}
          </Typography>
          <Typography level='body-md' color='text.secondary'>
            {t('annualPlanning.dailyRoutine.subtitle')}
          </Typography>
        </Stack>

        <Segmented
          accessibilityLabel={t('annualPlanning.dailyRoutine.title')}
          value={period}
          onChange={setPeriod}
          options={ROUTINE_PERIODS.map((name) => ({
            value: name,
            label: t(`annualPlanning.dailyRoutine.short.${name}`),
            count: routineItems(shown, name).length || undefined
          }))}
        />

        {/* A refusal is said once, above the list it refused to change. */}
        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('annualPlanning.dailyRoutine.saveError')}
          </Typography>
        ) : null}

        {/*
         * The goal activities first, exactly as the web orders them: they are
         * what the plan has already put in this part of the day, and the items
         * below are what you added to it. A period with none says nothing at
         * all rather than drawing an empty heading (ADR-012).
         */}
        {slotted.length > 0 ? (
          <View>
            <SectionHeader title={t('annualPlanning.dailyRoutine.goalActivities')} count={slotted.length} />
            {slotted.map(({ id, title, goalTitle, color }) => (
              <View key={id}>
                <ListRow
                  tile={
                    color ? (
                      // A focus area's colour is the user's own hex, which is
                      // the one place a literal is correct. It sits beside the
                      // goal's name, never instead of it.
                      <View importantForAccessibility='no' style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                    ) : null
                  }
                  name={title}
                  meta={goalTitle ? t('annualPlanning.dailyRoutine.goalPrefix', { title: goalTitle }) : null}
                />
                <Divider />
              </View>
            ))}
          </View>
        ) : null}

        <View>
          <SectionHeader title={t('annualPlanning.dailyRoutine.routineItems')} count={items.length} />

          {items.length === 0 ? (
            <Typography level='body-md' color='text.secondary' style={{ paddingVertical: theme.spacing[1] }}>
              {t('annualPlanning.dailyRoutine.noItems')}
            </Typography>
          ) : (
            items.map((item) => {
              const renaming = editing?.id === item.id
              const ticked = done.has(item.id)

              /*
               * The row becomes the field it is being renamed in, rather than
               * opening a sheet over it: the thing being edited is four words
               * long and the keyboard is already the only other thing on the
               * screen.
               */
              if (renaming) {
                return (
                  <View key={item.id}>
                    <Input
                      value={editing.title}
                      onChangeText={(title) => setEditing({ id: item.id, title })}
                      onBlur={commitRename}
                      onSubmitEditing={commitRename}
                      returnKeyType='done'
                      autoFocus
                      accessibilityLabel={t('annualPlanning.dailyRoutine.renameItem')}
                      style={{ marginVertical: theme.spacing[1] }}
                    />
                    <Divider />
                  </View>
                )
              }

              return (
                <View key={item.id}>
                  <ListRow
                    tile={
                      <Checkbox
                        checked={ticked}
                        disabled={ticking === item.id}
                        onPress={() => toggle(item)}
                        accessibilityLabel={t('annualPlanning.dailyRoutine.toggleItem')}
                      />
                    }
                    name={routineItemTitle(item)}
                    // Tapping the words opens the rename; the tick has its own
                    // target beside them.
                    onPress={() => setEditing({ id: item.id, title: routineItemTitle(item) })}
                    accessibilityLabel={t('annualPlanning.dailyRoutine.renameItem')}
                    action={
                      <IconButton
                        size='sm'
                        accessibilityLabel={t('annualPlanning.dailyRoutine.deleteItem')}
                        onPress={() => confirmRemove(item)}
                      >
                        <Icon name='Trash' size='sm' color='danger.plainColor' />
                      </IconButton>
                    }
                  />
                  <Divider />
                </View>
              )
            })
          )}

          {/* The field is at the foot of the list it adds to, where the web
              puts it and where the thumb already is. */}
          <Stack direction='row' spacing={1} style={{ alignItems: 'center', paddingTop: theme.spacing[1.5] }}>
            <Input
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              returnKeyType='done'
              placeholder={t('annualPlanning.dailyRoutine.addItemPlaceholder')}
              accessibilityLabel={t('annualPlanning.dailyRoutine.addItem')}
              style={{ flex: 1 }}
            />
            <IconButton accessibilityLabel={t('annualPlanning.dailyRoutine.addItem')} disabled={!draft.trim() || saving} onPress={add}>
              <Icon name='Plus' size='md' />
            </IconButton>
          </Stack>
        </View>
      </Stack>
    </Screen>
  )
}

export default DailyRoutineEditor
