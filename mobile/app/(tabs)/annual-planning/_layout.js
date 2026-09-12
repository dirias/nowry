/**
 * The `/annual-planning` stack.
 *
 * The web's own path, and now two screens rather than one: the path itself
 * still redirects into the Plan tab, and the routine editor sits under it at
 * the address the web gives it (MOB-080).
 *
 * **A directory inside the tab group needs this file.** Expo Router does not
 * make a nested navigator out of a folder on its own — without a layout it
 * flattens the folder's routes into the parent, which is how two stray tabs
 * appeared in the bar the last time a directory was added here (see the Plan
 * stack's own layout for the report). The `href: null` in the tab layout hides
 * the directory; this is what makes it a stack.
 */
import { Stack } from 'expo-router'

export default function AnnualPlanningLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
