import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { agentService } from '../api/services/agent.service'
import { storage } from '../platform'
import { blockMoments } from '../domain/blocks/moments'
import { allowIntervention } from '../domain/interventionPolicy'

/** Keys this device has already claimed, so a refetch never asks the server twice. */
const CLAIMED_KEY = 'nowry_block_moments_claimed'
const CLAIMED_KEPT = 100

const readClaimed = () => {
  try {
    const raw = storage.get(CLAIMED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const remember = (key) => {
  try {
    const next = [...readClaimed().filter((k) => k !== key), key].slice(-CLAIMED_KEPT)
    storage.set(CLAIMED_KEY, JSON.stringify(next))
  } catch {
    // Forgotten on this device only; the server still dedups.
  }
}

/**
 * useBlockMoments — the companion speaks from the log (PLAN-009).
 *
 * Reads the three moments off the recent occurrences (sixty days with logs,
 * as the Day view holds them), asks the policy whether the companion may
 * speak, claims the first new moment on the server (which dedups across
 * devices) and hands back the sentence to draw inside the summary object,
 * never over content (ADR-022). Dismissing forgets it for the session.
 */
export function useBlockMoments({ occurrences, todayKey, settings = null, enabled = true }) {
  const { t, i18n } = useTranslation()
  const [moment, setMoment] = useState(null)
  const [dismissed, setDismissed] = useState(null)
  const asking = useRef(false)

  const candidates = useMemo(() => (occurrences && todayKey ? blockMoments(occurrences, todayKey) : []), [occurrences, todayKey])

  useEffect(() => {
    if (!enabled || moment || asking.current) return
    if (!allowIntervention('block_moment', { settings })) return
    const claimed = readClaimed()
    const next = candidates.find((m) => !claimed.includes(m.key) && m.key !== dismissed)
    if (!next) return
    asking.current = true
    agentService
      .postIntervention({ type: 'block_moment', block_reason: next.reason, moment_key: next.key }, i18n.language)
      .then((reply) => {
        remember(next.key)
        if (!reply?.already_seen) setMoment(next)
      })
      .catch(() => {})
      .finally(() => {
        asking.current = false
      })
  }, [candidates, enabled, moment, dismissed, settings, i18n.language])

  const dismiss = useCallback(() => {
    if (moment) setDismissed(moment.key)
    setMoment(null)
  }, [moment])

  return {
    moment,
    text: moment ? t(`blocks.moments.${moment.reason}`, moment.params) : null,
    dismiss
  }
}

export default useBlockMoments
