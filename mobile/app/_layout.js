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

import { QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@nowry/core/context/AuthContext'
import { PomodoroProvider } from '@nowry/core/context/PomodoroContext'
import { queryClient } from '@nowry/core/api/queryClient'
import { AppearanceProvider } from '../src/theme/AppearanceProvider'
import { OfflineSync } from '../src/platform/OfflineSync'
import { NotificationHost } from '../src/ui/Toast'
import { AuthGate } from '../src/navigation/AuthGate'

export default function RootLayout() {
  /*
   * `AppearanceProvider` owns both halves of how the app looks and mounts the
   * theme itself: the account's accent colour, and the device's light/dark
   * choice. It sits inside the query provider because it reads the profile.
   */
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
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
            <NotificationHost />
          </AppearanceProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
