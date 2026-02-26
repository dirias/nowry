/* eslint-disable */
import { useState, useEffect } from 'react'
import { tasksService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const CACHE_KEY = 'tasks:all'
const CACHE_TTL = 30000 // 30 seconds

export function useTaskData() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (isCancelled = () => false) => {
    setLoading(true)
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
