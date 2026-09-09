/**
 * The study stack.
 *
 * `/study` is the tab root, `/study/:deckId` is an active session,
 * `/study/deck/:deckId` is the deck's detail, and `/study/card/new` and
 * `/study/card/:cardId` author a card. The session is pushed rather than
 * presented modally on purpose: it is a place you are, not a thing you opened,
 * and the Android back gesture should leave it the same way the header does.
 *
 * A `Stack`, not a group of screens: the card editor blocks its own removal
 * while it holds unsaved writing, and `beforeRemove` only fires for a screen
 * inside a stack navigator.
 */
import { Stack } from 'expo-router'

export default function StudyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
