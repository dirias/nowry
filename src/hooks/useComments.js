import { useState, useEffect, useRef, useCallback } from 'react'
import { commentsService } from '../api/services'

// Mirrors useAutoSave's SAVE_STATUS pattern (src/hooks/useAutoSave.js).
// This status machine only tracks the LIST fetch (GET) — create/update/remove
// are optimistic and report their own failures via the `onError` callback
// rather than flipping the whole rail into an error state.
export const COMMENTS_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error'
}

/**
 * useComments — resource-agnostic comment-thread data hook.
 *
 * @param {string} resourceType - e.g. 'book'. Caller-supplied; this hook has no
 *   opinion about what kinds of resources can carry comments.
 * @param {string} resourceId
 * @param {Object} [options]
 * @param {(error: any) => void} [options.onError] - called with the raw axios
 *   error whenever a create/update/remove mutation fails and has been rolled
 *   back locally. The caller decides how to surface it (this codebase's
 *   existing Snackbar pattern — see EditorHome.js's `snackbar` state).
 */
export function useComments(resourceType, resourceId, { onError } = {}) {
  const [comments, setComments] = useState([])
  const [status, setStatus] = useState(COMMENTS_STATUS.IDLE)
  const [error, setError] = useState(null)

  // Guards against a slow, stale GET clobbering state after resourceId changes
  // or a newer fetch has already started (no AbortSignal support in the
  // service layer, so a request-id ref stands in for AbortController here).
  const requestIdRef = useRef(0)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const fetchComments = useCallback(async () => {
    if (!resourceType || !resourceId) {
      setComments([])
      setStatus(COMMENTS_STATUS.IDLE)
      return
    }
    const requestId = ++requestIdRef.current
    setStatus(COMMENTS_STATUS.LOADING)
    setError(null)
    try {
      const data = await commentsService.list(resourceType, resourceId)
      if (requestIdRef.current !== requestId) return // superseded by a newer fetch
      setComments(Array.isArray(data) ? data : [])
      setStatus(COMMENTS_STATUS.READY)
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      console.error('Error fetching comments:', err)
      setStatus(COMMENTS_STATUS.ERROR)
      setError(err.response?.data?.detail || err.message)
    }
  }, [resourceType, resourceId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Optimistic create — appends a temp comment immediately, replaces it with the
  // server copy on success, rolls back (removes it) on failure.
  const create = useCallback(
    async (anchor, body) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const optimistic = {
        _id: tempId,
        resource_type: resourceType,
        resource_id: resourceId,
        anchor,
        body,
        resolved: false
      }
      setComments((prev) => [...prev, optimistic])
      try {
        const created = await commentsService.create(resourceType, resourceId, anchor, body)
        setComments((prev) => prev.map((c) => (c._id === tempId ? created : c)))
        return created
      } catch (err) {
        setComments((prev) => prev.filter((c) => c._id !== tempId))
        onErrorRef.current?.(err)
        throw err
      }
    },
    [resourceType, resourceId]
  )

  // Optimistic update — applies the patch immediately, rolls back to the prior
  // snapshot on failure.
  const update = useCallback(async (id, updates) => {
    let previous = null
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== id) return c
        previous = c
        return { ...c, ...updates }
      })
    )
    try {
      const updated = await commentsService.update(id, updates)
      setComments((prev) => prev.map((c) => (c._id === id ? updated : c)))
      return updated
    } catch (err) {
      if (previous) {
        setComments((prev) => prev.map((c) => (c._id === id ? previous : c)))
      }
      onErrorRef.current?.(err)
      throw err
    }
  }, [])

  // Optimistic remove — drops it immediately, re-inserts at its prior index on
  // failure so the rollback doesn't reorder the list.
  const remove = useCallback(async (id) => {
    let removedComment = null
    let removedIndex = -1
    setComments((prev) => {
      removedIndex = prev.findIndex((c) => c._id === id)
      removedComment = removedIndex === -1 ? null : prev[removedIndex]
      return prev.filter((c) => c._id !== id)
    })
    try {
      await commentsService.remove(id)
    } catch (err) {
      if (removedComment) {
        setComments((prev) => {
          const next = [...prev]
          next.splice(Math.min(removedIndex, next.length), 0, removedComment)
          return next
        })
      }
      onErrorRef.current?.(err)
      throw err
    }
  }, [])

  return { comments, status, error, create, update, remove, refetch: fetchComments }
}
