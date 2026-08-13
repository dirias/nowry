import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cardsService } from '../api/services/cards.service'
import { publicContentService } from '../api/services/publicContent.service'
import { userService } from '../api/services/user.service'

/**
 * useOnboardingJourney — the route-local onboarding controller (ONB-005).
 *
 * One rule shapes everything here: **activation is server-derived, always**
 * (FR-006, ADR-006). This hook never concludes a user is activated because a
 * screen was reached, because preferences saved, or because the AI fallback
 * returned cards. `status` only ever comes from `GET /users/onboarding` or from
 * the `onboarding` block the fork endpoint emits *after* it has persisted the
 * activation. The same applies to resuming: the screen to show is the server's
 * `resume_screen`, never a value inferred from `postponed_at` or a local clock.
 *
 * Everything the network touches has four states, and a failure is separated
 * into recoverable and terminal (FR-046, FR-049). Recoverable means "repeating
 * the identical request is the fix" — for the fork that is literally true, and
 * the server's durable `(deck, user)` key is what makes repeating it safe
 * (ADR-005, NFR-017). Terminal means retrying can only fail the same way.
 *
 * This module holds no UI and no copy. It publishes machine-readable codes; the
 * screens map them to `t()` keys, so a new server code can never leak an
 * untranslated string.
 */

// ── Phases ───────────────────────────────────────────────────────────────────

/** Journey read lifecycle. */
export const JOURNEY_PHASE = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error'
}

/**
 * Curated browse lifecycle. `EMPTY` is deliberately distinct from `ERROR`: a
 * topic with no approved decks is a successful result and the most likely one
 * at launch, and calling it an error would be dishonest (NFR-018).
 */
export const BROWSE_PHASE = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error'
}

/** Write lifecycle shared by the fork, the point recorder and the fallback. */
export const ACTION_PHASE = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  ERROR: 'error'
}

// ── Error classification ─────────────────────────────────────────────────────

/**
 * Fork errors a caller fixes by sending the identical request again.
 *
 * - `fork_in_progress` — a concurrent attempt of ours holds the claim; wait.
 * - `activation_failed` — the deck and its cards *already exist*; only the user
 *   write is missing, and the replay finishes it. Surfacing this as a fork
 *   failure would be a lie, and re-forking is exactly what must not happen.
 * - `fork_failed` — the copy aborted and the claim was marked failed, which the
 *   server recreates on the next attempt.
 */
export const RECOVERABLE_FORK_CODES = new Set(['fork_in_progress', 'activation_failed', 'fork_failed'])

/**
 * Fork errors no retry can fix. `source_not_official` in particular must not be
 * retried: the deck is not curated, so it can never activate onboarding.
 */
export const TERMINAL_FORK_CODES = new Set(['source_not_official', 'cannot_fork_own_content', 'malformed_idempotency_key'])

const ALREADY_ACTIVATED_CODE = 'onboarding_already_activated'
const NETWORK_ERROR_CODE = 'network_error'
const UNKNOWN_ERROR_CODE = 'unknown_error'

const NO_RECOVERABLE_CODES = new Set()

/**
 * Pull the stable machine-readable code out of a FastAPI error.
 *
 * The onboarding surface meets both `detail` shapes the API uses: the journey
 * routes send a bare string (`"invalid_action"`), the fork routes send an
 * object (`{code, message}`). Reading only one of them is how a differentiated
 * error quietly degrades into a generic failure.
 *
 * @param {Error} error - Rejected Axios error
 * @returns {string|null} Machine code, or null when the body carries none
 */
export const apiErrorCode = (error) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && typeof detail.code === 'string') return detail.code
  return null
}

/**
 * Turn a rejection into the shape every error state in this hook exposes.
 *
 * A request that never got a response (offline, timeout, aborted connection)
 * is recoverable by definition — we do not know whether the server acted, and
 * for the fork the durable key makes finding out safe. `5xx` and `429` are
 * recoverable too; other `4xx` are recoverable only when their code says so.
 *
 * @param {Error} error - Rejected Axios error
 * @param {Set<string>} [recoverableCodes] - Codes recoverable for this operation
 * @returns {{code: string, status: number|null, recoverable: boolean, message: string}}
 */
export const classifyError = (error, recoverableCodes = NO_RECOVERABLE_CODES) => {
  const status = error?.response?.status ?? null
  const code = apiErrorCode(error)
  const message = error?.message || ''

  if (status === null) {
    return { code: code || NETWORK_ERROR_CODE, status, recoverable: true, message }
  }
  if (status >= 500 || status === 429) {
    return { code: code || UNKNOWN_ERROR_CODE, status, recoverable: true, message }
  }
  return {
    code: code || UNKNOWN_ERROR_CODE,
    status,
    recoverable: Boolean(code && recoverableCodes.has(code)),
    message
  }
}

// ── Idempotency key ──────────────────────────────────────────────────────────

const FORK_ACTION_STORAGE_KEY = 'nowry.onboarding.forkAction'

/** How long to wait before repeating a fork the server says is already running. */
export const DEFAULT_FORK_RETRY_DELAY_MS = 1200

/**
 * Automatic repeats of `fork_in_progress` before the error reaches the user.
 * Two is enough to ride out a concurrent attempt of our own; beyond that the
 * honest answer is an error with a retry, not an invisible loop.
 */
export const MAX_FORK_IN_PROGRESS_RETRIES = 2

const randomUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // jsdom and older Safari lack randomUUID. The server validates the UUID
  // shape, and the key is only a correlation aid, so a v4-shaped fallback is
  // sufficient — uniqueness of the fork itself never depends on it.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = (Math.random() * 16) | 0
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

const readStoredForkAction = () => {
  try {
    const raw = window.sessionStorage?.getItem(FORK_ACTION_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.deckId && parsed?.key ? parsed : null
  } catch {
    return null
  }
}

const writeStoredForkAction = (action) => {
  try {
    if (action) {
      window.sessionStorage?.setItem(FORK_ACTION_STORAGE_KEY, JSON.stringify(action))
    } else {
      window.sessionStorage?.removeItem(FORK_ACTION_STORAGE_KEY)
    }
  } catch {
    // Storage disabled (private mode, blocked cookies). Nothing breaks: the
    // key is diagnostic correlation only and the server's durable key still
    // guarantees at most one fork per deck and user.
  }
}

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * `409 onboarding_already_activated` is not a failure. The server is telling us
 * the journey moved past the point we tried to write, so the truthful response
 * is to re-read state, not to show the user an error about work already done.
 * The shipped API raises it for both journey actions once activated.
 */
const isAlreadyActivated = (error) => error?.response?.status === 409 && apiErrorCode(error) === ALREADY_ACTIVATED_CODE

// ── Initial state ────────────────────────────────────────────────────────────

const initialBrowse = { phase: BROWSE_PHASE.IDLE, category: null, items: [], total: 0, error: null }
const initialFork = { phase: ACTION_PHASE.IDLE, deckId: null, forkedDeck: null, created: false, error: null }
const initialPoint = { phase: ACTION_PHASE.IDLE, unsavedPoint: null, error: null }
const initialPostpone = { phase: ACTION_PHASE.IDLE, error: null }
const initialFallback = { phase: ACTION_PHASE.IDLE, cards: null, error: null }

/**
 * @param {Object} [options]
 * @param {boolean} [options.autoLoad=true] - Read the journey on mount
 * @param {number} [options.forkRetryDelayMs] - Pause before repeating a
 *   `fork_in_progress`. Injectable so tests need no fake timers.
 */
const useOnboardingJourney = ({ autoLoad = true, forkRetryDelayMs = DEFAULT_FORK_RETRY_DELAY_MS } = {}) => {
  const [journey, setJourney] = useState(null)
  const [journeyPhase, setJourneyPhase] = useState(JOURNEY_PHASE.IDLE)
  const [journeyError, setJourneyError] = useState(null)

  const [browse, setBrowse] = useState(initialBrowse)
  const [fork, setFork] = useState(initialFork)
  const [point, setPoint] = useState(initialPoint)
  const [postponeState, setPostponeState] = useState(initialPostpone)
  const [fallback, setFallback] = useState(initialFallback)

  const mountedRef = useRef(true)
  const forkActionRef = useRef(null)
  const browseSeqRef = useRef(0)
  const browseCategoryRef = useRef(null)
  const lastPointRef = useRef(null)

  if (forkActionRef.current === null) {
    // Survives a reload mid-fork, so the retry after a crashed tab still
    // carries the key of the action the user actually chose.
    forkActionRef.current = readStoredForkAction()
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /** Apply a confirmed server snapshot. The only writer of journey truth. */
  const applySnapshot = useCallback((snapshot) => {
    if (!mountedRef.current) return
    setJourney(snapshot)
    setJourneyPhase(JOURNEY_PHASE.READY)
    setJourneyError(null)
  }, [])

  /**
   * Read the journey. Also the retry for a failed read — there is one code
   * path, so a retry can never diverge from the initial load.
   *
   * @param {Object} [options]
   * @param {boolean} [options.silent=false] - Refresh without entering the
   *   loading phase, used after a fork so the confirmed screen does not flash.
   */
  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (mountedRef.current && !silent) setJourneyPhase(JOURNEY_PHASE.LOADING)
      try {
        const snapshot = await userService.getOnboardingState()
        applySnapshot(snapshot)
        return { ok: true, journey: snapshot }
      } catch (error) {
        const classified = classifyError(error)
        if (mountedRef.current) {
          setJourneyPhase(JOURNEY_PHASE.ERROR)
          setJourneyError(classified)
        }
        return { ok: false, error: classified }
      }
    },
    [applySnapshot]
  )

  useEffect(() => {
    if (autoLoad) reload()
  }, [autoLoad, reload])

  /**
   * Record a meaningful point (FR-037). On failure the intended point is kept
   * as an unsaved draft with a retry — the confirmed snapshot is untouched, so
   * a reload still resumes from the last point the server actually accepted.
   *
   * @param {'personalization'|'first_deck'} nextPoint
   */
  const recordPoint = useCallback(
    async (nextPoint) => {
      lastPointRef.current = nextPoint
      if (mountedRef.current) {
        setPoint({ phase: ACTION_PHASE.PENDING, unsavedPoint: nextPoint, error: null })
      }
      try {
        const snapshot = await userService.recordOnboardingPoint(nextPoint)
        applySnapshot(snapshot)
        if (mountedRef.current) setPoint({ phase: ACTION_PHASE.SUCCEEDED, unsavedPoint: null, error: null })
        return { ok: true, journey: snapshot }
      } catch (error) {
        if (isAlreadyActivated(error)) {
          if (mountedRef.current) setPoint({ phase: ACTION_PHASE.SUCCEEDED, unsavedPoint: null, error: null })
          const refreshed = await reload()
          return { ok: true, alreadyActivated: true, journey: refreshed.journey ?? null }
        }
        const classified = classifyError(error)
        if (mountedRef.current) {
          setPoint({ phase: ACTION_PHASE.ERROR, unsavedPoint: nextPoint, error: classified })
        }
        return { ok: false, error: classified }
      }
    },
    [applySnapshot, reload]
  )

  /** Retry the point the server has not confirmed yet. */
  const retryRecordPoint = useCallback(async () => {
    if (!lastPointRef.current) return { ok: false, error: null }
    return recordPoint(lastPointRef.current)
  }, [recordPoint])

  /**
   * Postpone (FR-042). The 24-hour promise is only truthful once the server has
   * acknowledged its own timestamp, so a caller that closes the flow on this
   * must await it rather than fire and forget.
   */
  const postpone = useCallback(async () => {
    if (mountedRef.current) setPostponeState({ phase: ACTION_PHASE.PENDING, error: null })
    try {
      const snapshot = await userService.postponeOnboarding()
      applySnapshot(snapshot)
      if (mountedRef.current) setPostponeState({ phase: ACTION_PHASE.SUCCEEDED, error: null })
      return { ok: true, journey: snapshot }
    } catch (error) {
      if (isAlreadyActivated(error)) {
        if (mountedRef.current) setPostponeState({ phase: ACTION_PHASE.SUCCEEDED, error: null })
        const refreshed = await reload()
        return { ok: true, alreadyActivated: true, journey: refreshed.journey ?? null }
      }
      const classified = classifyError(error)
      if (mountedRef.current) setPostponeState({ phase: ACTION_PHASE.ERROR, error: classified })
      return { ok: false, error: classified }
    }
  }, [applySnapshot, reload])

  /**
   * Load the curated options for a topic (FR-024). Responses are sequenced, so
   * a slow answer for an abandoned topic cannot overwrite the current one.
   *
   * @param {string} category - Canonical taxonomy topic
   */
  const loadOfficialDecks = useCallback(async (category) => {
    const seq = browseSeqRef.current + 1
    browseSeqRef.current = seq
    browseCategoryRef.current = category

    if (mountedRef.current) {
      setBrowse({ ...initialBrowse, phase: BROWSE_PHASE.LOADING, category })
    }
    try {
      const page = await publicContentService.browseOfficialDecks({ category })
      if (!mountedRef.current || browseSeqRef.current !== seq) return { ok: true, stale: true }

      const items = Array.isArray(page?.items) ? page.items : []
      setBrowse({
        phase: items.length > 0 ? BROWSE_PHASE.READY : BROWSE_PHASE.EMPTY,
        category,
        items,
        total: page?.total ?? items.length,
        error: null
      })
      return { ok: true, items, total: page?.total ?? items.length }
    } catch (error) {
      const classified = classifyError(error)
      if (mountedRef.current && browseSeqRef.current === seq) {
        setBrowse({ ...initialBrowse, phase: BROWSE_PHASE.ERROR, category, error: classified })
      }
      return { ok: false, error: classified }
    }
  }, [])

  /** Retry the browse that failed, for the same topic. */
  const retryOfficialDecks = useCallback(async () => {
    if (!browseCategoryRef.current) return { ok: false, error: null }
    return loadOfficialDecks(browseCategoryRef.current)
  }, [loadOfficialDecks])

  /**
   * The idempotency key for one user-selected fork.
   *
   * Generated once when the user picks a deck and reused by every retry of that
   * choice, which is what makes retries correlatable. Picking a *different*
   * deck is a different action and gets its own key.
   */
  const idempotencyKeyFor = useCallback((deckId) => {
    if (forkActionRef.current?.deckId === deckId) return forkActionRef.current.key
    const action = { deckId, key: randomUuid() }
    forkActionRef.current = action
    writeStoredForkAction(action)
    return action.key
  }, [])

  /**
   * Fork a curated deck — the one and only activation path (ADR-006).
   *
   * The activation recorded here is the server's own verdict, taken from the
   * response's `onboarding` block, which the API emits on the first completion
   * *and* on every replay. Nothing about reaching this screen contributes.
   * The canonical snapshot is then re-read, because the fork response carries
   * only `status` and `activated_at` — `resume_screen` and `show_reentry` stay
   * server-derived and are never computed here.
   *
   * @param {string} deckId - Source public deck ID
   */
  const forkOfficialDeck = useCallback(
    async (deckId) => {
      if (!deckId) return { ok: false, error: null }
      const idempotencyKey = idempotencyKeyFor(deckId)

      if (mountedRef.current) {
        setFork({ ...initialFork, phase: ACTION_PHASE.PENDING, deckId })
      }

      for (let attempt = 0; ; attempt += 1) {
        try {
          const result = await publicContentService.forkDeckForOnboarding(deckId, idempotencyKey)

          // The action completed; a later fork is a new action with a new key.
          forkActionRef.current = null
          writeStoredForkAction(null)

          if (mountedRef.current) {
            setFork({
              phase: ACTION_PHASE.SUCCEEDED,
              deckId,
              forkedDeck: result.forkedDeck,
              created: result.created,
              error: null
            })
            if (result.onboarding?.status) {
              setJourney((previous) => ({
                ...(previous || {}),
                status: result.onboarding.status,
                activated_at: result.onboarding.activated_at ?? previous?.activated_at ?? null
              }))
            }
          }

          // Best effort: a failed re-read cannot undo the activation we were told
          // about, and `status` above is already the server's.
          await reload({ silent: true })

          return {
            ok: true,
            created: result.created,
            forkedDeck: result.forkedDeck,
            activated: result.onboarding?.status === 'activated'
          }
        } catch (error) {
          const classified = classifyError(error, RECOVERABLE_FORK_CODES)

          if (classified.code === 'fork_in_progress' && attempt < MAX_FORK_IN_PROGRESS_RETRIES) {
            // Our own concurrent attempt holds the claim. Waiting and repeating
            // the identical request is the documented fix and cannot duplicate.
            await sleep(forkRetryDelayMs)
            if (!mountedRef.current) return { ok: false, error: classified }
            continue
          }

          if (mountedRef.current) {
            setFork((previous) => ({ ...previous, phase: ACTION_PHASE.ERROR, deckId, error: classified }))
          }
          return { ok: false, error: classified }
        }
      }
    },
    [forkRetryDelayMs, idempotencyKeyFor, reload]
  )

  /**
   * Retry the fork the user already chose, with the same idempotency key.
   * Safe for every recoverable code, including `activation_failed` where the
   * deck already exists and only the activation write is outstanding.
   */
  const retryFork = useCallback(async () => {
    const deckId = fork.deckId || forkActionRef.current?.deckId
    if (!deckId) return { ok: false, error: null }
    return forkOfficialDeck(deckId)
  }, [fork.deckId, forkOfficialDeck])

  /**
   * The explicit AI fallback (FR-032, FR-033).
   *
   * Only a caller's deliberate action reaches this; nothing here runs on mount
   * or when a browse ends empty. It writes no journey state and returns no
   * activation — success leaves onboarding incomplete, by design.
   */
  const requestAiFallback = useCallback(async (topicContext, cardCount) => {
    if (mountedRef.current) setFallback({ phase: ACTION_PHASE.PENDING, cards: null, error: null })
    try {
      const cards = await cardsService.generateOnboardingFallback(topicContext, cardCount)
      if (mountedRef.current) setFallback({ phase: ACTION_PHASE.SUCCEEDED, cards, error: null })
      return { ok: true, cards }
    } catch (error) {
      const classified = classifyError(error)
      if (mountedRef.current) setFallback({ phase: ACTION_PHASE.ERROR, cards: null, error: classified })
      return { ok: false, error: classified }
    }
  }, [])

  return useMemo(
    () => ({
      // Confirmed server state — the only source of activation and resume.
      journey,
      status: journey?.status ?? null,
      isActivated: journey?.status === 'activated',
      resumeScreen: journey?.resume_screen ?? null,
      showReentry: journey?.show_reentry === true,
      lastMeaningfulPoint: journey?.last_meaningful_point ?? null,

      // Journey read lifecycle.
      journeyPhase,
      isJourneyLoading: journeyPhase === JOURNEY_PHASE.LOADING,
      journeyError,
      reload,

      // Meaningful point.
      recordPoint,
      retryRecordPoint,
      pointState: point,

      // Postponement.
      postpone,
      postponeState,

      // Curated browse.
      browseState: browse,
      loadOfficialDecks,
      retryOfficialDecks,

      // Fork — activation.
      forkState: fork,
      forkOfficialDeck,
      retryFork,

      // Explicit AI fallback — never activates.
      fallbackState: fallback,
      requestAiFallback
    }),
    [
      journey,
      journeyPhase,
      journeyError,
      reload,
      recordPoint,
      retryRecordPoint,
      point,
      postpone,
      postponeState,
      browse,
      loadOfficialDecks,
      retryOfficialDecks,
      fork,
      forkOfficialDeck,
      retryFork,
      fallback,
      requestAiFallback
    ]
  )
}

export default useOnboardingJourney
