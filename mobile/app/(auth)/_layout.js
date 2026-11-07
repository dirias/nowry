/**
 * The unauthenticated stack.
 *
 * A route group, so the URLs stay `/login`, `/register` and `/resetPassword` —
 * the same paths the web serves. The group exists only so the auth gate can ask
 * "is this screen public?" by reading one segment.
 *
 * **It draws the app bar** (MOB-122, ADR-061). The guest screens used to have
 * no chrome at all, and that was the fault Didier named first on the emulator:
 * nothing claimed the top inset, the brand floated in the body, and the moment
 * of signing in jumped from no bar to the accent bar on Home. The bar is the
 * same object the tab group draws, so a guest meets the head they will live
 * under; it holds the top inset, which is why the provider says `top` and
 * every screen inside stops insetting that edge for itself.
 */
import { Stack } from 'expo-router'
import { AppBar } from '../../src/ui'
import { ScreenChromeProvider } from '../../src/ui/screenChrome'

export default function AuthLayout() {
  return (
    <ScreenChromeProvider top>
      {/* The board's bar, not a navigator's — the same line the tab group writes. */}
      <Stack screenOptions={{ header: () => <AppBar /> }} />
    </ScreenChromeProvider>
  )
}
