/**
 * The root layout. Every screen mounts inside this.
 *
 * The first two imports are the whole point of the file's order: the platform
 * port is installed, then i18next is initialised against it. Both are module
 * side effects, so they have run before any screen renders.
 */
import '../src/platform/configure'
import '../src/i18n'

import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NotificationHost } from '../src/ui/Toast'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <NotificationHost />
    </SafeAreaProvider>
  )
}
