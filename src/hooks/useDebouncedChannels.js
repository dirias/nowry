import { useCallback, useRef, useState } from 'react'

import { describeApiError } from '../components/Common/Form/formUtils'

/**
 * Debounced autosave across several independent write paths.
 *
 * The invariant this module exists to hold: **one timer per channel.** A
 * surface that autosaves through two service methods — deck settings writes
 * config through `updateSettings` and the deck's own name through `update` —
 * will otherwise share a single timer, and a rename and a pace change made
 * inside the same 600ms window will cancel each other. Exactly one of them then
 * silently fails to persist, on a surface with no Save button and therefore no
 * moment at which the user would suspect anything.
 *
 * `timers`, `pending` and `failed` are all keyed by channel, so clearing one
 * cannot touch another. Everything else here follows from that: a failure is
 * held per channel so Retry re-sends the change the user actually made, and
 * `flush` fires whatever is still inside its window rather than dropping it
 * when the surface closes.
 *
 * @param channels { [name]: (payload) => Promise } — one entry per service method
 * @param delay    debounce window, ms
 */
const SAVED_FOR_MS = 1500

const useDebouncedChannels = ({ channels, delay = 600 }) => {
  const [savingKey, setSavingKey] = useState(null)
  const [savedKey, setSavedKey] = useState(null)
  const [error, setError] = useState(null)

  const timers = useRef({})
  const pending = useRef({})
  const failed = useRef({})
  const succeeded = useRef(false)
  const send = useRef(channels)
  send.current = channels

  const run = useCallback(async (channel) => {
    const job = pending.current[channel]
    if (!job) return
    pending.current[channel] = null
    setSavingKey(job.key)
    try {
      await send.current[channel](job.payload)
      job.onSuccess?.()
      delete failed.current[channel]
      succeeded.current = true
      setError(null)
      setSavedKey(job.key)
      setTimeout(() => setSavedKey(null), SAVED_FOR_MS)
    } catch (caught) {
      // Held so Retry re-sends the change rather than asking for it again.
      failed.current[channel] = job
      setError(describeApiError(caught))
    } finally {
      setSavingKey(null)
    }
  }, [])

  const queue = useCallback(
    (channel, payload, key, onSuccess = null) => {
      pending.current[channel] = { payload, key, onSuccess }
      clearTimeout(timers.current[channel])
      timers.current[channel] = setTimeout(() => run(channel), delay)
    },
    [run, delay]
  )

  /** Drop a queued write without sending it — for a change that must not save. */
  const cancel = useCallback((channel) => {
    clearTimeout(timers.current[channel])
    pending.current[channel] = null
  }, [])

  const retry = useCallback(() => {
    const jobs = Object.entries(failed.current)
    setError(null)
    jobs.forEach(([channel, job]) => {
      pending.current[channel] = job
      clearTimeout(timers.current[channel])
      run(channel)
    })
  }, [run])

  /** Send anything still waiting, rather than losing it to a Close. */
  const flush = useCallback(() => {
    Object.keys(timers.current).forEach((channel) => {
      clearTimeout(timers.current[channel])
      if (pending.current[channel]) run(channel)
    })
  }, [run])

  const reset = useCallback(() => {
    failed.current = {}
    succeeded.current = false
    setError(null)
    setSavedKey(null)
  }, [])

  return {
    savingKey,
    savedKey,
    error,
    setError,
    queue,
    cancel,
    retry,
    flush,
    reset,
    markSaved: () => {
      succeeded.current = true
    },
    consumeSaved: () => {
      const value = succeeded.current
      succeeded.current = false
      return value
    }
  }
}

export default useDebouncedChannels
