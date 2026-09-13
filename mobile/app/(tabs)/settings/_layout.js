/**
 * The settings stack.
 *
 * `/settings` is the page and `/settings/companion` is the companion's own,
 * which is the route the web serves at `/settings/agent` under the name this
 * client already uses for the creature (MOB-091).
 *
 * A stack rather than a group, so the companion's screen is PUSHED over the
 * settings page and leaves the way every other pushed screen does — the app
 * bar's arrow and the system gesture agreeing, which is the thing MOB-087 had
 * to fix by hand for a screen that was not in one.
 */
import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
