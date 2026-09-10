import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { calendarEventsKey, fetchCalendarEvents } from '../api/services/calendar.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'
import { filterCalendarEvents } from '../domain/calendar/calendarFilters'
import { groupAgenda } from '../domain/calendar/agendaGroups'

/**
 * Everything with a date on it, grouped the way an agenda reads it (MOB-043).
 *
 * A `useQuery` rather than the service's own `fetchQuery`, for the reason
 * `useSessionCards` exists: the mobile client persists its query cache to disk,
 * so a calendar loaded with signal is a calendar that opens without one. It
 * subscribes to the SAME key the web's `getAllEvents` writes, so the two
 * clients share one cache entry rather than each keeping a private copy of the
 * same aggregation.
 *
 * The filtering and the grouping are the web's own pure functions, called here
 * so neither client can drift from the other about what "this month" contains
 * or which day a thing belongs to.
 *
 * The year is the cursor's, not today's: paging into next January has to fetch
 * next January, and the key carries the year so both stay cached.
 */
export function useCalendarEvents({ cursor = new Date(), filters } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const year = cursor.getFullYear()

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: calendarEventsKey(userId, year),
    queryFn: () => fetchCalendarEvents(userId, year),
    enabled: !!userId,
    // The web's own two minutes. An agenda is read far more often than the plan
    // behind it changes.
    staleTime: 2 * 60 * 1000
  })

  const events = data?.events ?? null
  const focusAreas = data?.focusAreas ?? []

  const groups = useMemo(() => {
    if (!events) return []
    return groupAgenda(filters ? filterCalendarEvents(events, filters) : events, cursor)
    // `cursor` is a Date and a new object on every render of a screen that
    // holds it in state; its TIME is what the grouping depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filters, cursor.getTime()])

  return {
    groups,
    focusAreas,
    loading: isLoading,
    /** True only when there is nothing to show: a cached month beats an error. */
    error: events ? null : (error ?? null),
    /** A refetch is happening over an agenda already on screen. */
    refreshing: isFetching && Boolean(events),
    reload: () => queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] })
  }
}

export default useCalendarEvents
