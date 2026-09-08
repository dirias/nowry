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
import { ThemeProvider } from '../src/theme'
import { NotificationHost } from '../src/ui/Toast'

export default function RootLayout() {
  /*
   * `themeColor` is the app default for now. MOB-018 passes the account's
   * chosen colour once Home reads the profile; the provider already
   * regenerates the palette when it changes.
   */
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <NotificationHost />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
