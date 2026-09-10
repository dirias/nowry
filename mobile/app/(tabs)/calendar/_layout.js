/**
 * The Plan stack.
 *
 * `/calendar` is the tab root — the calendar and the year's plan on one
 * segment — and `/calendar/goal/:goalId` is one goal pushed over it.
 *
 * **A directory in a tab group needs this file, and the lack of it is what put
 * two stray tabs in the bar.** Expo Router does not make a nested navigator out
 * of a folder on its own: without a layout it flattens the folder's routes into
 * the parent, so `annual-planning/index` and `annual-planning/goal/[goalId]`
 * became two more tabs, and the `href: null` that was meant to hide the
 * directory matched nothing. Reported as "planning and annual-planning menus".
 *
 * The goal lives under this tab rather than under `/annual-planning` because a
 * pushed screen should keep the tab it was pushed from. There is no web URL to
 * mirror here either: the web opens a goal in a drawer, not at a route.
 */
import { Stack } from 'expo-router'

export default function PlanLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
