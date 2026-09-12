/**
 * The reader's stack.
 *
 * A folder inside the tab group needs a layout or Expo Router flattens its
 * files into the parent and each becomes a tab of its own — which is what put
 * two stray tabs in the bar in MOB-048. One screen, named `book`, hidden from
 * the bar by the tab layout.
 */
import { Stack } from 'expo-router'

export default function BookLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
