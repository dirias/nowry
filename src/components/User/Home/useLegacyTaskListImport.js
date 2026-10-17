import { useEffect, useRef } from 'react'

/** Where the web kept lists before they had a server (PLAN-021). */
export const LEGACY_LISTS_KEY = 'nowry_task_lists'
const LEGACY_ACTIVE_KEY = 'nowry_active_task_list'

const readLegacy = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_LISTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const forget = () => {
  try {
    localStorage.removeItem(LEGACY_LISTS_KEY)
    localStorage.removeItem(LEGACY_ACTIVE_KEY)
  } catch {
    /* storage refused: the import is idempotent, so a later run changes nothing */
  }
}

/**
 * Hands this browser's lists to the server once (PLAN-021, PRD-items D13).
 * The server remaps the tasks that point at their generated ids; after that the
 * browser's copy is forgotten. A failed import leaves it for the next visit.
 */
export function useLegacyTaskListImport(importLegacy, enabled) {
  const started = useRef(false)
  useEffect(() => {
    if (!enabled || started.current) return
    const legacy = readLegacy()
    if (legacy.length === 0) return
    started.current = true
    const lists = legacy
      .filter((list) => list?.id && String(list.label ?? list.name ?? '').trim())
      .map((list) => ({
        legacy_id: String(list.id),
        name: String(list.label ?? list.name)
          .trim()
          .slice(0, 60)
      }))
    if (lists.length === 0) return forget()
    // A failure is not retried here (each render would retry it): the lists stay
    // in storage and the next visit tries again.
    importLegacy(lists)
      .then(forget)
      .catch(() => {})
  }, [enabled, importLegacy])
}

export default useLegacyTaskListImport
