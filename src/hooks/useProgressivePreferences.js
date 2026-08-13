import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { userService } from '../api/services/user.service'
import { derivePrimaryTopic } from '../constants/learningTaxonomy'
import { ACTION_PHASE, classifyError } from './useOnboardingJourney'

/**
 * useProgressivePreferences — progressive preference persistence (ONB-006).
 *
 * Two ideas carry this module.
 *
 * **1. A visible selection is not a saved selection (FR-040).** `values` is what
 * the user sees, `confirmed` is what the server has echoed back, and they are
 * separate objects on purpose. A field only leaves `unsavedFields` when the API
 * has answered for it. Nothing here ever presents an unacknowledged choice as
 * persisted, and a failure keeps the draft visible while naming the field that
 * did not save (FR-039).
 *
 * **2. Writes are serialized per field, never globally.** Each of `language`,
 * `theme_color`, `interests` and `study_goal` owns an independent single-slot
 * queue: one request in flight, and at most one pending intent behind it. Rapid
 * changes coalesce into that slot, so the intermediate values are dropped rather
 * than queued, and the last thing the user chose is the last thing sent. A slow
 * interests write therefore cannot delay an accent write, and two requests for
 * the same field can never be in flight at once — which is what makes response
 * reordering *within* a field structurally impossible rather than merely
 * unlikely (architecture, "Progressive preference update").
 *
 * The remaining reordering risk is *across* fields, because the endpoint echoes
 * the whole preferences document: a slow interests response also carries a
 * `language` that may predate a language write that already landed. Every
 * confirmed key therefore records the sequence number of the request that wrote
 * it, and a response may only write a key it does not own if its own sequence is
 * newer. Keys the request *does* own are stamped at arrival — per-field
 * serialization already proves them to be the newest word on that field.
 *
 * Validation is not duplicated here. The backend owns the 14-value taxonomy, the
 * five-interest cap and the derivation of `primary_topic` from `interests[0]`;
 * `learningTaxonomy.js` owns the definitions. This hook sends what it is given
 * and reports what comes back.
 *
 * Like the journey controller, it holds no UI and no copy: it publishes
 * machine-readable codes and the screens map them to `t()` keys.
 */

// ── Fields ───────────────────────────────────────────────────────────────────

/**
 * The four progressively-saved preferences, keyed by their wire names so that a
 * reported failure names exactly what was sent.
 */
export const PREFERENCE_FIELD = {
  LANGUAGE: 'language',
  ACCENT_COLOR: 'theme_color',
  INTERESTS: 'interests',
  STUDY_GOAL: 'study_goal'
}

/** @type {string[]} */
export const PREFERENCE_FIELDS = [
  PREFERENCE_FIELD.LANGUAGE,
  PREFERENCE_FIELD.ACCENT_COLOR,
  PREFERENCE_FIELD.INTERESTS,
  PREFERENCE_FIELD.STUDY_GOAL
]

/**
 * Keys of the echoed response this hook tracks. `primary_topic` is read-only
 * here: the server derives it from `interests[0]`, and no control writes it
 * (FR-019).
 */
const CONFIRMED_KEYS = [...PREFERENCE_FIELDS, 'primary_topic', 'updated_at']

/**
 * Keys an accepted write is authoritative for. Sending `interests` also makes
 * the response authoritative for the `primary_topic` the server derived from it.
 */
const OWNED_KEYS = {
  [PREFERENCE_FIELD.LANGUAGE]: [PREFERENCE_FIELD.LANGUAGE],
  [PREFERENCE_FIELD.ACCENT_COLOR]: [PREFERENCE_FIELD.ACCENT_COLOR],
  [PREFERENCE_FIELD.INTERESTS]: [PREFERENCE_FIELD.INTERESTS, 'primary_topic'],
  [PREFERENCE_FIELD.STUDY_GOAL]: [PREFERENCE_FIELD.STUDY_GOAL]
}

// ── Phases ───────────────────────────────────────────────────────────────────

/** Lifecycle of the initial confirmed read. */
export const PREFERENCES_PHASE = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error'
}

/** Per-field write lifecycle. Reused from the journey controller verbatim. */
export { ACTION_PHASE }

// ── Errors ───────────────────────────────────────────────────────────────────

/**
 * A rejected value. FastAPI answers a failed request-model validation with a
 * `detail` *array*, which carries no stable code, so the shared classifier
 * reports it as unknown. It is not unknown: the server refused this specific
 * value — an unsupported locale, a non-canonical topic, a sixth interest — and
 * repeating the identical request cannot succeed.
 */
export const VALIDATION_ERROR_CODE = 'validation_error'

/**
 * Classify a preference write failure.
 *
 * No `4xx` code on this route is recoverable: the endpoint is a plain partial
 * update, so a rejected body stays rejected. Network failures, `5xx` and `429`
 * remain recoverable through the shared classifier.
 *
 * @param   {Error} error Rejected Axios error
 * @returns {{code: string, status: number|null, recoverable: boolean, message: string}}
 */
export const classifyPreferenceError = (error) => {
  const classified = classifyError(error)
  if (classified.status === 422 && classified.code === 'unknown_error') {
    return { ...classified, code: VALIDATION_ERROR_CODE }
  }
  return classified
}

// ── Value comparison ─────────────────────────────────────────────────────────

/**
 * Compare two preference values. Ordered interests compare element-wise —
 * reordering the same topics is a real change (FR-018), so this is deliberately
 * order-sensitive.
 *
 * @param   {*}       left  First value
 * @param   {*}       right Second value
 * @returns {boolean}       Whether the two represent the same selection
 */
const valuesEqual = (left, right) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    return left.length === right.length && left.every((item, index) => item === right[index])
  }
  return Object.is(left, right)
}

// ── Initial state ────────────────────────────────────────────────────────────

const emptyConfirmed = () => ({
  [PREFERENCE_FIELD.LANGUAGE]: null,
  [PREFERENCE_FIELD.ACCENT_COLOR]: null,
  [PREFERENCE_FIELD.INTERESTS]: [],
  [PREFERENCE_FIELD.STUDY_GOAL]: null,
  primary_topic: null,
  updated_at: null
})

const initialFieldStatuses = () =>
  PREFERENCE_FIELDS.reduce((accumulator, field) => {
    accumulator[field] = { phase: ACTION_PHASE.IDLE, error: null }
    return accumulator
  }, {})

/**
 * @param {Object}  [options]
 * @param {boolean} [options.autoLoad=true] - Read confirmed preferences on mount
 */
const useProgressivePreferences = ({ autoLoad = true } = {}) => {
  const [phase, setPhase] = useState(PREFERENCES_PHASE.IDLE)
  const [loadError, setLoadError] = useState(null)
  const [confirmed, setConfirmed] = useState(emptyConfirmed)
  const [drafts, setDrafts] = useState({})
  const [fieldStatuses, setFieldStatuses] = useState(initialFieldStatuses)

  const mountedRef = useRef(true)

  // Everything the queues read must be synchronously current, so the authority
  // lives in refs and React state is a render mirror of it. A change made two
  // keystrokes ago must be visible to the drain loop immediately, not after the
  // next commit.
  const confirmedRef = useRef(null)
  const draftsRef = useRef({})
  const stampsRef = useRef({})
  const seqRef = useRef(0)
  const queueRef = useRef({})
  const inFlightRef = useRef({})

  if (confirmedRef.current === null) confirmedRef.current = emptyConfirmed()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /** Monotonic request sequence. The ordering authority for confirmed writes. */
  const nextSeq = useCallback(() => {
    seqRef.current += 1
    return seqRef.current
  }, [])

  const setFieldStatus = useCallback((field, status) => {
    if (!mountedRef.current) return
    setFieldStatuses((previous) => ({ ...previous, [field]: status }))
  }, [])

  const writeDraft = useCallback((field, value) => {
    draftsRef.current = { ...draftsRef.current, [field]: value }
    if (mountedRef.current) setDrafts(draftsRef.current)
  }, [])

  const clearDraft = useCallback((field) => {
    if (!(field in draftsRef.current)) return
    const next = { ...draftsRef.current }
    delete next[field]
    draftsRef.current = next
    if (mountedRef.current) setDrafts(next)
  }, [])

  /**
   * Merge a server payload into the confirmed snapshot — the only writer of
   * confirmed truth, and it is only ever fed a server response.
   *
   * Owned keys are applied unconditionally and stamped on arrival: the field's
   * queue guarantees no newer request for them can already have answered. Every
   * other key is applied only if this request was issued after whatever last
   * wrote that key, which is what discards a stale echo riding along on a slow
   * response for a different field.
   *
   * @param {Object}   payload            Echoed `GeneralPreferencesResponse`
   * @param {Object}   options
   * @param {number}   options.issueSeq   Sequence assigned when the request was sent
   * @param {string[]} [options.ownedKeys] Keys this request is authoritative for
   */
  const applyPayload = useCallback(
    (payload, { issueSeq, ownedKeys = [] }) => {
      if (!payload || typeof payload !== 'object') return

      const next = { ...confirmedRef.current }
      let touched = false

      CONFIRMED_KEYS.forEach((key) => {
        if (!(key in payload)) return

        // `updated_at` describes the write itself, so any owned write is the
        // freshest word on it.
        const owned = key === 'updated_at' ? ownedKeys.length > 0 : ownedKeys.includes(key)
        if (!owned && issueSeq <= (stampsRef.current[key] ?? 0)) return

        next[key] = payload[key]
        stampsRef.current[key] = owned ? nextSeq() : issueSeq
        touched = true
      })

      if (!touched) return
      confirmedRef.current = next
      if (mountedRef.current) setConfirmed(next)
    },
    [nextSeq]
  )

  /**
   * Send the queued intent for one field until the queue is empty.
   *
   * Exactly one of these runs per field. The pending value is claimed out of the
   * slot before the request goes out, so a change arriving mid-flight refills the
   * slot and is picked up on the next turn instead of racing this one.
   *
   * @param {string} field Wire field name
   */
  const drainField = useCallback(
    async (field) => {
      inFlightRef.current[field] = true
      try {
        while (queueRef.current[field] !== undefined) {
          const { value } = queueRef.current[field]
          delete queueRef.current[field]
          const issueSeq = nextSeq()

          try {
            const payload = await userService.updateGeneralPreferences({ [field]: value })
            applyPayload(payload, { issueSeq, ownedKeys: OWNED_KEYS[field] })

            // The draft is only retired when it is still the value that was just
            // confirmed. A newer intent queued mid-flight keeps the field unsaved
            // and pending — which is the truth until its own response arrives.
            if (queueRef.current[field] === undefined && valuesEqual(draftsRef.current[field], value)) {
              clearDraft(field)
              setFieldStatus(field, { phase: ACTION_PHASE.SUCCEEDED, error: null })
            }
          } catch (error) {
            // A newer intent supersedes this failure: the user has already moved
            // on, so keep draining rather than reporting a value nobody wants.
            if (queueRef.current[field] !== undefined) continue

            setFieldStatus(field, { phase: ACTION_PHASE.ERROR, error: classifyPreferenceError(error) })
            // The draft stays visible and unconfirmed until a retry or a new
            // change restarts this loop (FR-039).
            break
          }
        }
      } finally {
        inFlightRef.current[field] = false
      }
    },
    [applyPayload, clearDraft, nextSeq, setFieldStatus]
  )

  /**
   * Record a new value for one field and make sure it reaches the server.
   *
   * The write starts immediately rather than on a debounce timer: a timer is a
   * window in which a closed tab loses the change, while coalescing behind the
   * in-flight request bounds the request count just as well and adapts to the
   * real round trip (NFR-016).
   *
   * @param   {string} field Wire field name
   * @param   {*}      value Value to persist
   * @returns {void}
   */
  const setPreference = useCallback(
    (field, value) => {
      if (!PREFERENCE_FIELDS.includes(field)) return

      const isClean = !(field in draftsRef.current) && queueRef.current[field] === undefined && !inFlightRef.current[field]

      // Re-selecting the value the server already holds is not a change.
      if (isClean && valuesEqual(value, confirmedRef.current[field])) return

      writeDraft(field, value)
      queueRef.current[field] = { value }
      setFieldStatus(field, { phase: ACTION_PHASE.PENDING, error: null })

      if (!inFlightRef.current[field]) void drainField(field)
    },
    [drainField, setFieldStatus, writeDraft]
  )

  const setLanguage = useCallback((language) => setPreference(PREFERENCE_FIELD.LANGUAGE, language), [setPreference])
  const setAccentColor = useCallback((themeColor) => setPreference(PREFERENCE_FIELD.ACCENT_COLOR, themeColor), [setPreference])
  const setInterests = useCallback((interests) => setPreference(PREFERENCE_FIELD.INTERESTS, interests), [setPreference])
  const setStudyGoal = useCallback((studyGoal) => setPreference(PREFERENCE_FIELD.STUDY_GOAL, studyGoal), [setPreference])

  /**
   * Retry the unsaved draft of one field. Sends the value currently on screen,
   * not the one that failed — if the user edited after the failure, the visible
   * value is the intent worth persisting.
   *
   * @param   {string} field Wire field name
   * @returns {boolean}      Whether there was an unsaved draft to retry
   */
  const retryField = useCallback(
    (field) => {
      if (!(field in draftsRef.current)) return false
      const value = draftsRef.current[field]
      queueRef.current[field] = { value }
      setFieldStatus(field, { phase: ACTION_PHASE.PENDING, error: null })
      if (!inFlightRef.current[field]) void drainField(field)
      return true
    },
    [drainField, setFieldStatus]
  )

  /** Retry every field that is still unconfirmed. Each keeps its own queue. */
  const retryUnsaved = useCallback(() => {
    const retried = Object.keys(draftsRef.current).filter((field) => retryField(field))
    return retried
  }, [retryField])

  /**
   * Read the confirmed preferences. Also the retry for a failed read, so the two
   * cannot diverge.
   *
   * Drafts survive a reload by construction: they are stored separately and
   * shadow the confirmed value, so an unsaved selection is never cleared by the
   * refresh that goes looking for the truth behind it (FR-039).
   */
  const load = useCallback(async () => {
    const issueSeq = nextSeq()
    if (mountedRef.current) setPhase(PREFERENCES_PHASE.LOADING)
    try {
      const payload = await userService.getGeneralPreferences()
      applyPayload(payload, { issueSeq })
      if (mountedRef.current) {
        setPhase(PREFERENCES_PHASE.READY)
        setLoadError(null)
      }
      return { ok: true, preferences: payload }
    } catch (error) {
      const classified = classifyPreferenceError(error)
      if (mountedRef.current) {
        setPhase(PREFERENCES_PHASE.ERROR)
        setLoadError(classified)
      }
      return { ok: false, error: classified }
    }
  }, [applyPayload, nextSeq])

  useEffect(() => {
    if (autoLoad) load()
  }, [autoLoad, load])

  // ── Derived, render-facing view ────────────────────────────────────────────

  /** What the user sees: the draft when one exists, the confirmed value otherwise. */
  const values = useMemo(
    () =>
      PREFERENCE_FIELDS.reduce((accumulator, field) => {
        accumulator[field] = field in drafts ? drafts[field] : confirmed[field]
        return accumulator
      }, {}),
    [confirmed, drafts]
  )

  /**
   * Per-field state. `isConfirmed` is the honesty flag FR-040 turns on: false
   * means the value on screen has not been acknowledged and must not be
   * presented as saved.
   */
  const fields = useMemo(
    () =>
      PREFERENCE_FIELDS.reduce((accumulator, field) => {
        const status = fieldStatuses[field]
        const hasDraft = field in drafts
        accumulator[field] = {
          field,
          phase: status.phase,
          error: status.error,
          isSaving: status.phase === ACTION_PHASE.PENDING,
          isConfirmed: !hasDraft,
          justSaved: !hasDraft && status.phase === ACTION_PHASE.SUCCEEDED,
          canRetry: status.phase === ACTION_PHASE.ERROR && hasDraft,
          unsavedValue: hasDraft ? drafts[field] : null,
          confirmedValue: confirmed[field]
        }
        return accumulator
      }, {}),
    [confirmed, drafts, fieldStatuses]
  )

  const unsavedFields = useMemo(() => PREFERENCE_FIELDS.filter((field) => field in drafts), [drafts])

  const failedFields = useMemo(
    () => PREFERENCE_FIELDS.filter((field) => fieldStatuses[field].phase === ACTION_PHASE.ERROR),
    [fieldStatuses]
  )

  return useMemo(
    () => ({
      // Read lifecycle.
      phase,
      isLoading: phase === PREFERENCES_PHASE.LOADING,
      loadError,
      reload: load,

      // What to render.
      values,
      /** Visible primary topic — the first selected interest (FR-018). */
      primaryTopic: derivePrimaryTopic(values[PREFERENCE_FIELD.INTERESTS]),

      // What the server has actually acknowledged.
      confirmed,
      confirmedPrimaryTopic: confirmed.primary_topic ?? null,
      confirmedUpdatedAt: confirmed.updated_at ?? null,

      // Per-field save state.
      fields,
      unsavedFields,
      failedFields,
      hasUnsavedChanges: unsavedFields.length > 0,
      isSaving: PREFERENCE_FIELDS.some((field) => fields[field].isSaving),

      // Writers.
      setPreference,
      setLanguage,
      setAccentColor,
      setInterests,
      setStudyGoal,
      retryField,
      retryUnsaved
    }),
    [
      phase,
      loadError,
      load,
      values,
      confirmed,
      fields,
      unsavedFields,
      failedFields,
      setPreference,
      setLanguage,
      setAccentColor,
      setInterests,
      setStudyGoal,
      retryField,
      retryUnsaved
    ]
  )
}

export default useProgressivePreferences
