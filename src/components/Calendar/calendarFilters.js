/**
 * The calendar's filter rule, as a pure function.
 *
 * Phase 16 D-13 fixed the order — habits, then types, then areas — and the
 * page test used to *mirror* the predicate rather than import it, which let the
 * production copy drift with nothing to catch it. One function, two importers.
 *
 * `activeTypes` holding every canonical type means "no type filter" (WR-02):
 * the stored shape defaults to all four, so a bypass rather than an empty
 * array is what keeps every existing localStorage value valid.
 */
export const ALL_TYPES = ['task', 'priority', 'goal', 'milestone']

/** True when the type filter is not narrowing anything. */
export const allTypesActive = (activeTypes) => ALL_TYPES.every((type) => activeTypes.includes(type))

/**
 * @param {Array<{ type: string, focusAreaId: string | null }>} events
 * @param {{ habitsEnabled: boolean, activeTypes: string[], activeAreaIds: string[] }} filters
 */
export function filterCalendarEvents(events, filters) {
  const bypassTypes = allTypesActive(filters.activeTypes)
  return events.filter((ev) => {
    if (!filters.habitsEnabled && ev.type === 'activity') return false
    if (!bypassTypes && !filters.activeTypes.includes(ev.type)) return false
    // A null area (tasks, priorities) always passes an area filter.
    if (filters.activeAreaIds.length > 0 && ev.focusAreaId !== null && !filters.activeAreaIds.includes(ev.focusAreaId)) {
      return false
    }
    return true
  })
}
