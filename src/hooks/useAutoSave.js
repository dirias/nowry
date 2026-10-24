import { useState, useEffect, useRef, useCallback } from 'react'

export const SAVE_STATUS = {
  IDLE: 'idle',
  UNSAVED: 'unsaved',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error'
}

/** Waits before retrying a failed save: 2 s, 4 s, 8 s … capped at 30 s. */
const retryDelay = (failures) => Math.min(30000, 2000 * 2 ** Math.max(0, failures - 1))

/**
 * Saves the editor's content (QA-009). Three rules keep writing from being lost:
 *
 * 1. One save at a time. `onSave` cannot be cancelled, so two in flight could
 *    reach the server out of order and leave the older text there. A save asked
 *    for during another waits and runs when it settles.
 * 2. A save records only the text it sent. Text typed while it was in flight is
 *    still unsaved afterwards, and is saved next; it used to be marked saved.
 * 3. A failure retries on its own (when autosave is on), and closing the tab
 *    warns while anything is unsaved, saving, or failed.
 */
export function useAutoSave({ id, content, onSave, debounceMs = 2000, forceSaveMs = 30000 }) {
  const [status, setStatus] = useState(SAVE_STATUS.IDLE)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError] = useState(null)

  // Refs to track state without triggering effects
  const contentRef = useRef(content)
  const lastSavedContentRef = useRef(content)
  const inFlightRef = useRef(null)
  const queuedRef = useRef(false)
  const timeoutRef = useRef(null)
  const retryRef = useRef(null)
  const forceSaveIntervalRef = useRef(null)
  const failureCountRef = useRef(0)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const retryEnabledRef = useRef(Boolean(debounceMs))
  retryEnabledRef.current = Boolean(debounceMs)

  // Update ref when content changes
  useEffect(() => {
    contentRef.current = content
    if (content !== lastSavedContentRef.current) {
      setStatus((current) => (current === SAVE_STATUS.SAVING ? current : SAVE_STATUS.UNSAVED))

      // Local Backup immediately on change
      try {
        localStorage.setItem(`draft_book_${id}`, content)
      } catch (e) {
        console.warn('Local backup failed', e)
      }
    }
  }, [content, id])

  const saveNow = useCallback(async () => {
    if (inFlightRef.current) {
      queuedRef.current = true
      return inFlightRef.current
    }
    clearTimeout(retryRef.current)

    const sent = contentRef.current
    if (sent === lastSavedContentRef.current) {
      setStatus(SAVE_STATUS.SAVED)
      return
    }

    setStatus(SAVE_STATUS.SAVING)
    setError(null)

    const run = (async () => {
      try {
        await onSaveRef.current(sent, { signal: new AbortController().signal })
        lastSavedContentRef.current = sent
        failureCountRef.current = 0
        setLastSaved(new Date())
        setStatus(contentRef.current === sent ? SAVE_STATUS.SAVED : SAVE_STATUS.UNSAVED)
      } catch (err) {
        console.error('AutoSave failed:', err)
        failureCountRef.current += 1
        setStatus(SAVE_STATUS.ERROR)
        setError(err?.message || 'Save failed')
        if (retryEnabledRef.current) {
          retryRef.current = setTimeout(() => saveNowRef.current(), retryDelay(failureCountRef.current))
        }
      } finally {
        inFlightRef.current = null
      }
    })()
    inFlightRef.current = run
    await run

    if (queuedRef.current) {
      queuedRef.current = false
      if (contentRef.current !== lastSavedContentRef.current && failureCountRef.current === 0) {
        await saveNowRef.current()
      }
    }
  }, [])

  const saveNowRef = useRef(saveNow)
  saveNowRef.current = saveNow

  useEffect(() => () => clearTimeout(retryRef.current), [])

  // Effect: Debounced Autosave
  useEffect(() => {
    if (!debounceMs) return

    const effectiveDebounceMs = Math.min(8000, debounceMs * (1 + failureCountRef.current))

    if (status === SAVE_STATUS.UNSAVED) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(saveNow, effectiveDebounceMs)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [status, saveNow, debounceMs])

  // Effect: Force Save Interval (Safety Net)
  useEffect(() => {
    if (!forceSaveMs) return

    const effectiveForceMs = Math.min(60000, forceSaveMs * (1 + failureCountRef.current))

    forceSaveIntervalRef.current = setInterval(() => {
      if (status === SAVE_STATUS.UNSAVED) {
        console.log('Force saving due to time limit...')
        saveNow()
      }
    }, effectiveForceMs)
    return () => clearInterval(forceSaveIntervalRef.current)
  }, [status, saveNow, forceSaveMs])

  // Effect: Warn on close while anything is not on the server
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (status === SAVE_STATUS.UNSAVED || status === SAVE_STATUS.SAVING || status === SAVE_STATUS.ERROR) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [status])

  const resetBaseline = useCallback((newContent) => {
    lastSavedContentRef.current = newContent
    contentRef.current = newContent
    setStatus(SAVE_STATUS.SAVED)
    setError(null)
  }, [])

  return {
    status,
    saveNow,
    lastSaved,
    error,
    resetBaseline
  }
}
