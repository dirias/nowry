/* eslint-disable */
import { useState, useEffect } from 'react'
import { tasksService } from '../api/services'
import { apiCache } from '../api/utils/cache'
import { useAuth } from '../context/AuthContext'

const CACHE_TTL = 30000 // 30 seconds

export function useTaskData() {
  const { user } = useAuth()
  // Scope cache key to the logged-in user so sessions never bleed across accounts
  const CACHE_KEY = user?.id ? `tasks:all:${user.id}` : null

  // Pre-seed from cache so remounting home shows data instantly
  const [tasks, setTasks] = useState(() => (CACHE_KEY ? apiCache.peek(CACHE_KEY) : null) ?? [])
  const [loading, setLoading] = useState(() => !CACHE_KEY || apiCache.peek(CACHE_KEY) === null)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    // No user yet — don't fetch
    if (!CACHE_KEY) return
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
    // Re-fetch when the logged-in user changes
  }, [CACHE_KEY])

  const reload = async () => {
    if (!CACHE_KEY) return
    apiCache.invalidate(CACHE_KEY)
    await load()
  }

  return { tasks, loading, error, reload }
}
