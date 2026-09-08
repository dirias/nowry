/**
 * The study stack.
 *
 * `/study` is the tab root, `/study/:deckId` is an active session, and
 * `/study/deck/:deckId` is the deck's detail. The session is pushed rather than
 * presented modally on purpose: it is a place you are, not a thing you opened,
 * and the Android back gesture should leave it the same way the header does.
 */
import { Stack } from 'expo-router'

export default function StudyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
