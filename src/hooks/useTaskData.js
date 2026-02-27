/* eslint-disable */
import { useState, useEffect } from 'react'
import { tasksService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'tasks:all'
const CACHE_TTL = 30000 // 30 seconds

export function useTaskData() {
  // Pre-seed from cache so remounting home shows data instantly
  const [tasks, setTasks] = useState(() => apiCache.peek(CACHE_KEY) ?? [])
  const [loading, setLoading] = useState(() => apiCache.peek(CACHE_KEY) === null)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    const preloaded = apiCache.peek(CACHE_KEY)
    if (!preloaded) setLoading(true)
    setError(null)
    try {
      const data = await apiCache.get(CACHE_KEY, CACHE_TTL, () => tasksService.getAll())
      if (!isCancelled()) {
        setTasks(data || [])
      }
    } catch (err) {
      if (!isCancelled()) {
        console.error('[useTaskData] Error:', err)
        setError(err)
      }
    } finally {
      if (!isCancelled()) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false
    load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [])

  const reload = async () => {
    apiCache.invalidate(CACHE_KEY)
    await load()
  }

  return { tasks, loading, error, reload }
}
