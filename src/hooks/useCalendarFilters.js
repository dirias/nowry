import { useState, useEffect, useCallback } from 'react'

// D-05: OLD_KEY is the Phase 15 key — checked FIRST in useState initializer for one-time migration
const OLD_KEY = 'nowry:calendarFilters'
// New versioned key — written after migration or on fresh init
const STORAGE_KEY = 'nowry_cal_filters_v1'

// D-03: Expanded default state — activities excluded from activeTypes (habits toggle handles them)
const DEFAULT_FILTERS = {
  habitsEnabled: false,
  activeTypes: ['task', 'priority', 'goal', 'milestone'],
  activeAreaIds: [] // empty = no area filter (show all areas)
}

// D-04: Shape validation — must be a plain object with all three fields in the correct types
function isValidShape(parsed) {
  return (
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    typeof parsed.habitsEnabled === 'boolean' &&
    Array.isArray(parsed.activeTypes) &&
    Array.isArray(parsed.activeAreaIds)
  )
}

export function useCalendarFilters() {
  const [filters, setFilters] = useState(() => {
    try {
      // D-05: one-time migration from old key — MUST check OLD_KEY first
      const old = localStorage.getItem(OLD_KEY)
      if (old) {
        const parsed = JSON.parse(old)
        const habitsEnabled = typeof parsed?.habitsEnabled === 'boolean' ? parsed.habitsEnabled : false
        const migrated = { ...DEFAULT_FILTERS, habitsEnabled }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        localStorage.removeItem(OLD_KEY)
        return migrated
      }
      // D-04: validate new key
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (isValidShape(parsed)) return parsed
      }
      return { ...DEFAULT_FILTERS }
    } catch {
      return { ...DEFAULT_FILTERS }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch (e) {
      console.warn('[useCalendarFilters] localStorage write failed', e)
    }
  }, [filters])

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
  }, [])

  // D-06: applyPreset is filter-only. `goals_only` is the one preset left:
  // `today` and `this_week` were navigation wearing a filter's clothes — each
  // also reset every filter — and ADR-016 gave the date to the toolbar's nav
  // object instead. An unknown name is a no-op.
  const applyPreset = useCallback((name) => {
    if (name === 'goals_only') {
      setFilters({ habitsEnabled: false, activeTypes: ['goal', 'milestone'], activeAreaIds: [] })
    }
  }, [])

  return { filters, setFilters, resetFilters, applyPreset }
}

export default useCalendarFilters
