/**
 * The unauthenticated stack.
 *
 * A route group, so the URLs stay `/login`, `/register` and `/resetPassword` —
 * the same paths the web serves. The group exists only so the auth gate can ask
 * "is this screen public?" by reading one segment.
 */
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
