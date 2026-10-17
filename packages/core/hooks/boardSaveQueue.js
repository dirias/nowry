/**
 * The board's save queue (BOARD-002, PRD D4–D5): plain JavaScript, no React,
 * so the timing can be reasoned about on its own. `useBoard` owns one per
 * board.
 *
 *   - A change waits 800 ms after the last one, then goes as one PATCH.
 *   - One request is in flight at a time. What changes during a flight stays
 *     pending and goes in the next request.
 *   - A failure keeps everything pending and retries after 2, 4, 8, 16 s,
 *     then every 30 s, until a save lands.
 *   - A viewport alone waits 2 s; otherwise it rides with the next change.
 *   - A change over 300 operations goes in several requests.
 *
 * `onState({ status, error, hasPending, rev })` reports every transition;
 * `status` is 'idle' | 'saving' | 'saved' | 'error'.
 */
import { MAX_CHANGES, emptyChange, isEmptyChange, mergeChanges, splitChanges, toApiChanges } from '../domain/board'

export const SAVE_DEBOUNCE_MS = 800
export const VIEWPORT_DEBOUNCE_MS = 2000
export const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000]
export const RETRY_STEADY_MS = 30000

const nothing = () => ({ changes: emptyChange(), name: undefined, viewport: undefined })
const hasAny = (p) => !isEmptyChange(p.changes) || p.name !== undefined || p.viewport !== undefined
const hasEdits = (p) => !isEmptyChange(p.changes) || p.name !== undefined

/** What the board bar shows for a failed save: the HTTP status and the API's `detail` ("board_busy", "too_many_changes", …). */
export const readSaveError = (e) => ({
  status: e?.response?.status ?? null,
  detail: e?.response?.data?.detail ?? null,
  message: e?.message ?? ''
})

const joinPending = (sent, later) => ({
  changes: mergeChanges(sent.changes, later.changes),
  name: later.name !== undefined ? later.name : sent.name,
  viewport: later.viewport ?? sent.viewport
})

export const createSaveQueue = ({ send, onState = () => {}, rev: initialRev = 0 }) => {
  let pending = nothing()
  let flight = null
  let flightEdits = false
  let timer = null
  let timerKind = null
  let retries = 0
  let rerun = false
  let rev = initialRev
  let closed = false
  let status = 'idle'
  let error = null

  const report = () => {
    if (!closed) onState({ status, error, hasPending: hasEdits(pending) || flightEdits, rev })
  }
  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
    timerKind = null
  }
  const schedule = (delay, kind) => {
    if (closed) return
    clearTimer()
    timerKind = kind
    timer = setTimeout(() => {
      timer = null
      timerKind = null
      run()
    }, delay)
  }

  /** One request: the first batch of what is pending. Resolves true when it landed. */
  const sendOnce = async () => {
    const { batch, rest } = splitChanges(pending.changes, MAX_CHANGES)
    const sent = { changes: batch, name: pending.name, viewport: pending.viewport }
    pending = { changes: rest, name: undefined, viewport: undefined }
    flightEdits = hasEdits(sent)
    status = 'saving'
    report()
    try {
      const res = await send(toApiChanges(batch, { rev, name: sent.name, viewport: sent.viewport }))
      if (res?.rev !== undefined && res?.rev !== null) rev = res.rev
      retries = 0
      status = 'saved'
      error = null
      if (!isEmptyChange(rest)) rerun = true
      return true
    } catch (e) {
      pending = joinPending(sent, pending)
      retries += 1
      status = 'error'
      error = readSaveError(e)
      return false
    } finally {
      flightEdits = false
    }
  }

  /** Sends what is pending now; resolves true once everything pending at the end has landed. */
  const run = async () => {
    if (flight) {
      rerun = true
      return flight
    }
    clearTimer()
    if (!hasAny(pending)) return true
    flight = sendOnce()
    const ok = await flight
    flight = null
    report()
    if (!ok) {
      rerun = false
      if (!closed) schedule(RETRY_DELAYS_MS[retries - 1] ?? RETRY_STEADY_MS, 'retry')
      return false
    }
    if (rerun) {
      rerun = false
      return run()
    }
    return !hasAny(pending)
  }

  /** While a retry waits, a new change waits with it rather than shortening the backoff. */
  const soon = (delay, kind) => {
    if (timerKind === 'retry') return
    if (kind === 'viewport' && timer) return
    schedule(delay, kind)
  }

  return {
    queue(change) {
      if (closed || isEmptyChange(change)) return
      pending = { ...pending, changes: mergeChanges(pending.changes, change) }
      soon(SAVE_DEBOUNCE_MS, 'debounce')
      report()
    },
    queueName(name) {
      if (closed) return
      pending = { ...pending, name }
      soon(SAVE_DEBOUNCE_MS, 'debounce')
      report()
    },
    queueViewport(viewport) {
      if (closed) return
      pending = { ...pending, viewport }
      soon(VIEWPORT_DEBOUNCE_MS, 'viewport')
    },
    /** Sends now, waiting out a flight first. */
    async flush() {
      clearTimer()
      if (flight) await flight
      return run()
    },
    /**
     * The board is left: no more retries or reports. What is pending still
     * goes, once, after any flight (fire and forget).
     */
    close() {
      if (closed) return Promise.resolve(true)
      clearTimer()
      const done = this.flush()
      closed = true
      return done.catch(() => false)
    },
    setRev(next) {
      if (!flight && !hasAny(pending)) rev = next
    },
    get rev() {
      return rev
    },
    get busy() {
      return Boolean(flight) || hasAny(pending)
    }
  }
}
