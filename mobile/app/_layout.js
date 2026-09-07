/**
 * The root layout. Every screen mounts inside this.
 *
 * Deliberately bare for MOB-005: this task proves the app builds, launches and
 * resolves `@nowry/core` across the workspace. The platform port is wired in
 * MOB-006, the theme in MOB-009, and the tab bar in MOB-015.
 */
import { Stack } from 'expo-router'

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
