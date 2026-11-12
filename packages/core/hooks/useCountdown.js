/**
 * Seconds left before something may be asked again (ADR-078: "send again" waits a minute).
 *
 * `start(seconds)` begins the count; `left` falls by one each second to zero.
 * No JSX, no browser globals (ADR-031, ADR-026).
 */
import { useCallback, useEffect, useState } from 'react'

export const useCountdown = () => {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (left <= 0) return undefined
    const timer = setTimeout(() => setLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => clearTimeout(timer)
  }, [left])

  const start = useCallback((seconds) => setLeft(Math.max(0, Math.ceil(Number(seconds) || 0))), [])
  return { left, start }
}

export default useCountdown
