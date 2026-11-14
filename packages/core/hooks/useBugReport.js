/**
 * Sending a bug report (BUG-001, ADMIN-008a; FR-007, FR-008), for both clients.
 *
 * `send(body)` posts the report and settles on one outcome the form says:
 * `{kind: 'sent'}`, `{kind: 'dailyLimit', retryAt}`, `{kind: 'tooLarge', field}`,
 * `{kind: 'closed'}` or `{kind: 'failed'}`. A body over the 7 MB limit is not
 * sent at all and reads as too large. Resolves with that outcome.
 */
import { useCallback, useState } from 'react'
import { bugsService } from '../api/services/bugs.service'
import { bodyFits, reportRefusal } from '../domain/bugReports'

export function useBugReport() {
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState(null)

  const send = useCallback(async (body) => {
    if (!bodyFits(body)) {
      const tooLarge = { kind: 'tooLarge', field: 'body' }
      setOutcome(tooLarge)
      return tooLarge
    }
    setOutcome(null)
    setSending(true)
    let answer
    try {
      await bugsService.submit(body)
      answer = { kind: 'sent' }
    } catch (error) {
      answer = reportRefusal(error)
    }
    setOutcome(answer)
    setSending(false)
    return answer
  }, [])

  const reset = useCallback(() => setOutcome(null), [])
  return { sending, outcome, send, reset }
}

export default useBugReport
