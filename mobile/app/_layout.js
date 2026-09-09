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
import { ThemeProvider } from '../src/theme'
import { NotificationHost } from '../src/ui/Toast'
import { AuthGate } from '../src/navigation/AuthGate'

export default function RootLayout() {
  /*
   * `themeColor` is the app default for now. MOB-018 passes the account's
   * chosen colour once Home reads the profile; the provider already
   * regenerates the palette when it changes.
   */
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            {/* Outside the gate: the timer is restored from storage on mount
                and must not be rebuilt every time the gate re-renders. */}
            <PomodoroProvider>
              <AuthGate>
                <Slot />
              </AuthGate>
            </PomodoroProvider>
            <NotificationHost />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
