import { useEffect, useMemo, useState } from 'react'
import { useBlocks } from './useBlocks'
import { useCalendarEvents } from './useCalendarEvents'
import { useForecast } from './useForecast'
import { localDateKey, minutesOfDay, parseDateKey } from '../domain/blocks/dates'
import { nowAndNext, keptRate } from '../domain/blocks/today'
import { groupByPeriod } from '../domain/blocks/period'
import { dueOn, studyBlockLength } from '../domain/blocks/study'
import { isSameDay } from '../domain/calendar/agendaGroups'

/** The clock is re-read once a minute: a block's state changes on the minute. */
const TICK_MS = 60 * 1000

/**
 * useToday — the one spine (PRD D9, ADR-045 §8).
 *
 * Home watches it (now · next · later), Plan works it (the timeline), Study
 * reads one line from it (the next study block). All three read this hook for
 * one local date key, so none can disagree about what the day holds.
 *
 * `date` is a local date key; it defaults to today and re-keys at midnight.
 * `dueToday` is the caller's own count (the decks' due, as `studySummary` and
 * `useTodayData` already compute it), so the study block's proposal and the
 * Today object can never disagree about the same number; the forecast covers
 * every other date.
 */
export function useToday({ date, dueToday = 0, enabled = true } = {}) {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  const todayKey = localDateKey(clock)
  const key = date ?? todayKey
  const isToday = key === todayKey

  const blocksQuery = useBlocks({ from: key, to: key, enabled })
  const cursor = useMemo(() => parseDateKey(key), [key])
  const calendar = useCalendarEvents({ cursor })
  const { forecast } = useForecast(7)

  const occurrences = useMemo(() => blocksQuery.occurrences ?? [], [blocksQuery.occurrences])
  const nowMinutes = isToday ? minutesOfDay(clock) : 0
  const spine = useMemo(() => nowAndNext(occurrences, isToday ? nowMinutes : -1), [occurrences, isToday, nowMinutes])

  const deadlines = useMemo(() => {
    const events = calendar.events ?? []
    return events.filter((event) => event.date instanceof Date && isSameDay(event.date, cursor))
  }, [calendar.events, cursor])

  const due = dueOn(key, todayKey, dueToday, forecast?.days ?? [])

  return {
    date: key,
    isToday,
    nowMinutes,
    occurrences,
    periods: useMemo(() => groupByPeriod(occurrences), [occurrences]),
    current: spine.current,
    next: spine.next,
    later: spine.later,
    past: spine.past,
    nextStudy: occurrences.find((o) => o.block?.source?.type === 'study' && !o.log) ?? null,
    kept: keptRate(occurrences),
    deadlines,
    due,
    suggestedStudyLength: studyBlockLength(due),
    migrated: blocksQuery.migrated,
    loading: blocksQuery.loading,
    error: blocksQuery.error ?? calendar.error ?? null,
    reload: blocksQuery.reload
  }
}

export default useToday
