import { useState, useEffect, useRef, useCallback } from 'react'

export const SAVE_STATUS = {
  IDLE: 'idle',
  UNSAVED: 'unsaved',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error'
}

export function useAutoSave({ id, content, onSave, debounceMs = 2000, forceSaveMs = 30000 }) {
  const [status, setStatus] = useState(SAVE_STATUS.IDLE)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError] = useState(null)

  // Refs to track state without triggering effects
  const contentRef = useRef(content)
  const lastSavedContentRef = useRef(content)
  const abortControllerRef = useRef(null)
  const timeoutRef = useRef(null)
  const forceSaveIntervalRef = useRef(null)
  const failureCountRef = useRef(0)

  // Update ref when content changes
  useEffect(() => {
    contentRef.current = content
    if (content !== lastSavedContentRef.current) {
      setStatus(SAVE_STATUS.UNSAVED)

      // Local Backup immediately on change
      try {
        localStorage.setItem(`draft_book_${id}`, content)
      } catch (e) {
        console.warn('Local backup failed', e)
      }
    }
  }, [content, id])

  const saveNow = useCallback(async () => {
    const currentContent = contentRef.current

    // Don't save if nothing changed (unless forced?)
    if (currentContent === lastSavedContentRef.current && status === SAVE_STATUS.SAVED) {
      return
    }

    // Cancel previous pending save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setStatus(SAVE_STATUS.SAVING)
    setError(null)

    try {
      await onSave(currentContent, { signal: abortControllerRef.current.signal })

      // Success
      setStatus(SAVE_STATUS.SAVED)
      setLastSaved(new Date())
      lastSavedContentRef.current = currentContent
      failureCountRef.current = 0

      // Clear backup on successful save (optional, or keep it?)
      // Keeping it is safer, maybe clear on explicit "Close/Exit"?
    } catch (err) {
      if (err.name === 'AbortError') {
        // Ignore aborts, new save coming
        return
      }
      console.error('AutoSave failed:', err)
      setStatus(SAVE_STATUS.ERROR)
      setError(err.message || 'Save failed')
      failureCountRef.current += 1
    }
  }, [onSave])

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

  // Effect: Warn on close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (status === SAVE_STATUS.UNSAVED || status === SAVE_STATUS.SAVING) {
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
