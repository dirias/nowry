/**
 * The root layout: providers, then the auth gate.
 *
 * The first two imports are the whole point of the file's order — the platform
 * port is installed and i18next is initialised, both as module side effects, so
 * they have run before any screen renders.
 *
 * Everything below is the shape every screen sits inside. It is deliberately
 * one file: a provider added at a screen instead of here is a provider some
 * screens do not have.
 */
import '../src/platform/configure'
import '../src/i18n'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useFonts } from 'expo-font'
import { Slot } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@nowry/core/context/AuthContext'
import { PomodoroProvider } from '@nowry/core/context/PomodoroContext'
import { queryClient } from '@nowry/core/api/queryClient'
import { PERSIST_OPTIONS } from '../src/platform/queryPersistence'
import { AppearanceProvider } from '../src/theme/AppearanceProvider'
import { OfflineSync } from '../src/platform/OfflineSync'
import { PushBridge } from '../src/platform/PushBridge'
import { NotificationHost } from '../src/ui/Toast'
import { AuthGate } from '../src/navigation/AuthGate'
import { DISPLAY_FONTS } from '../src/ui/displayFonts'

// Held so the first frame is not the platform face swapping to Bricolage a
// moment later. The fonts are local assets, so the hold is milliseconds.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Already hidden, or no splash on this build. Neither is worth a crash. */
})

export default function RootLayout() {
  /*
   * The display face (DS-007B). `error` is honoured as well as `loaded`: a font
   * that fails to load must not hold the app behind a splash screen forever.
   * `Typography` already falls back to the platform face for any family React
   * Native cannot resolve, so the cost of failure is the wrong typeface, not a
   * dead app — and that is a cost worth paying to stay running.
   */
  const [fontsLoaded, fontError] = useFonts(DISPLAY_FONTS)

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {})
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  /*
   * `AppearanceProvider` owns both halves of how the app looks and mounts the
   * theme itself: the account's accent colour, and the device's light/dark
   * choice. It sits inside the query provider because it reads the profile.
   */
  return (
    <SafeAreaProvider>
      {/* Not `QueryClientProvider`: this one holds rendering until the cache
          is restored from disk. Without that wait the first query races the
          restore, fails with no signal, and the cache arrives too late to
          matter — which is what made an offline session say "Couldn't load
          cards" over a queue that was already on the device. */}
      <PersistQueryClientProvider client={queryClient} persistOptions={PERSIST_OPTIONS}>
        <AuthProvider>
          <AppearanceProvider>
            {/* Outside the gate: the timer is restored from storage on mount
                and must not be rebuilt every time the gate re-renders. */}
            <PomodoroProvider>
              <AuthGate>
                <Slot />
              </AuthGate>
            </PomodoroProvider>
            <OfflineSync />
            <PushBridge />
            <NotificationHost />
          </AppearanceProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
