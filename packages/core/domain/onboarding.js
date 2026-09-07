/**
 * The onboarding journey's phases, error codes and classification — the part of
 * `useOnboardingJourney` that is pure data and pure functions.
 *
 * Extracted in MOB-004. The hook itself stays in the web client: it keeps a
 * one-shot fork action in `sessionStorage`, which the platform port deliberately
 * does not model, and onboarding is out of mobile v1 (ADR-030). But shared code
 * needs these codes — `useProgressivePreferences` classifies the same errors —
 * so the data half comes here and the hook imports it back.
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

/** The server's way of saying the work is already done, not that it failed. */
export const ALREADY_ACTIVATED_CODE = 'onboarding_already_activated'
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

/** How long to wait before repeating a fork the server says is already running. */
export const DEFAULT_FORK_RETRY_DELAY_MS = 1200

/**
 * Automatic repeats of `fork_in_progress` before the error reaches the user.
 * Two is enough to ride out a concurrent attempt of our own; beyond that the
 * honest answer is an error with a retry, not an invisible loop.
 */
export const MAX_FORK_IN_PROGRESS_RETRIES = 2
