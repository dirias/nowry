/**
 * The companion, speaking unasked (MOB-088, `docs/prd-mobile-agent.md`).
 *
 * Part three of the agent's phone milestone. The chat answers when asked
 * (MOB-085) about the card in front of you (MOB-086); this is the half that
 * arrives on its own — a line after a card you got wrong, a line after the
 * last card.
 *
 * **Whether it may speak is not decided here.** `interventionPolicy` in the
 * shared package holds the four gates and the web's provider now asks the same
 * ones, because a learner who turned wrong-answer nudges off on the web must
 * not get them on their phone, and nothing about the phone's code would have
 * shown that it does.
 *
 * **What IS decided here is the phone's half**: the count and the silent window
 * live wherever a session does, and on this client that is a screen rather than
 * a provider. `AgentProvider` keeps them in the same reducer as the chat, the
 * quiz and avatar generation; mounting it to count to two is the thing D10
 * refused.
 *
 * **A failure is silence.** Every path out of a failed intervention is the
 * message simply not arriving. It was not asked for, so there is no one waiting
 * for it, and an error line about a message the learner never requested would
 * be the interruption the settings exist to prevent.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { agentService } from '@nowry/core/api/services'
import { plainReply } from '@nowry/core/domain/agentChat'
import { allowIntervention, silenceUntil } from '@nowry/core/domain/interventionPolicy'

/**
 * How long to wait for a reply before giving up on it, in ms.
 *
 * The web's number, and its reasoning holds: the model can be slow, and a line
 * that lands a minute after the card it is about is worse than no line.
 */
const PATIENCE = 12000

export function useInterventions({ settings = null, inSession = true } = {}) {
  const [message, setMessage] = useState(null)

  /*
   * The settings arrive newly built on every render — `interventionSettings`
   * constructs them — so holding them in a ref is what keeps `queue` stable
   * enough to be called from a timer set several seconds ago.
   */
  const current = useRef(settings)
  current.current = settings

  const count = useRef(0)
  const silent = useRef(null)
  const timer = useRef(null)
  const run = useRef(0)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      run.current += 1
      clearTimeout(timer.current)
    }
  }, [])

  /**
   * Put the message away, and stay quiet for a while.
   *
   * Dismissing is the clearest signal a learner can give about a message they
   * did not ask for, so it buys silence — twenty minutes, ten or three,
   * depending on how often they said they wanted to hear from it.
   */
  const dismiss = useCallback(() => {
    run.current += 1
    clearTimeout(timer.current)
    silent.current = silenceUntil(current.current?.frequency)
    setMessage(null)
  }, [])

  /**
   * Ask for one, if the settings allow it.
   *
   * @param {object|null} event - from `wrongAnswerEvent` or `sessionSummaryEvent`
   */
  const queue = useCallback(
    async (event) => {
      if (!event) return
      const allowed = allowIntervention(event.type, {
        settings: current.current,
        count: count.current,
        silentUntil: silent.current,
        inSession
      })
      if (!allowed) return

      run.current += 1
      const mine = run.current
      const mineStill = () => live.current && run.current === mine

      // Giving up is the same state as being dismissed, silence included: a
      // reply that did not come in twelve seconds is a reason to stop asking
      // for a while rather than to ask again on the next card.
      clearTimeout(timer.current)
      timer.current = setTimeout(() => mineStill() && dismiss(), PATIENCE)

      try {
        const reply = await agentService.postIntervention(event)
        if (!mineStill()) return
        clearTimeout(timer.current)
        // Only a message that actually arrived is spent against the session's
        // budget — a request that failed cost the learner no interruption.
        if (!reply?.message) return
        count.current += 1
        /*
         * Markdown-free, the same way a chat reply is (FR-005). The server's
         * own prompt forbids markdown and the model emits it anyway — the first
         * nudge seen on a device read "similar to Spanish *Bastante*" — so the
         * markers come off here rather than onto the screen.
         */
        setMessage({ ...reply, message: plainReply(reply.message) })
      } catch {
        if (!mineStill()) return
        clearTimeout(timer.current)
        setMessage(null)
      }
    },
    [dismiss, inSession]
  )

  /*
   * No loading state is returned, and that is a decision rather than an
   * omission: nothing asked for this message, so there is no one waiting for
   * it, and a "thinking…" line would be the interruption arriving early.
   */
  return { message, queue, dismiss }
}

export default useInterventions
