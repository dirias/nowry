import { useEffect } from 'react'
import { useOptionalPet } from '@nowry/core/context/AgentContext'

/**
 * Declare what this page is about to the floating chat (CHAT-010, ADR-055 §1).
 *
 * The panel floats over every page and was told about two of them, so a
 * question asked from Home or a board was answered from the last conversation.
 * A page passes its subject (a `todayContext`, `boardContext`…) memoised, and
 * the chat names it, keys its thread on it, and offers its questions. Leaving
 * the page hands the chat back to General.
 */
export function useChatSubject(subject) {
  // A page outside the companion's provider (a shared view, a test) declares nothing.
  const setViewContext = useOptionalPet()?.setViewContext
  useEffect(() => {
    if (!subject || !setViewContext) return undefined
    setViewContext(subject)
    return () => setViewContext(null)
  }, [subject, setViewContext])
}

export default useChatSubject
