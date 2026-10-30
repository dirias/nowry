/**
 * What the screen in front of the learner is about, for the companion bubble
 * (CHAT-010, ADR-055 §1).
 *
 * The bubble sits on every tab and opened the chat about nothing, so a
 * question asked from a deck or a book was answered from whatever the last
 * conversation was about. Each screen now declares its subject while it is
 * focused, and the bubble hands it to the chat. The study session is not here:
 * it hands its card over itself, with the side and the grade (MOB-086).
 *
 * One value, set on focus and cleared on blur, so a subject never outlives the
 * screen that declared it.
 */
import { useCallback } from 'react'
import { useFocusEffect } from 'expo-router'

let current = null

/** The focused screen's subject, or null. */
export const currentScreenSubject = () => current

/** For tests, and for a sign-out. */
export function clearScreenSubject() {
  current = null
}

/**
 * Declare `subject` while this screen is focused. Pass a value that only
 * changes when the subject does (a `useMemo`), or the focus effect re-runs
 * every render.
 */
export function useScreenSubject(subject) {
  useFocusEffect(
    useCallback(() => {
      current = subject ?? null
      return () => {
        if (current === subject) current = null
      }
    }, [subject])
  )
}
