/**
 * The mobile client's notification surface.
 *
 * The counterpart of the web's Snackbar. The state comes from
 * `useNotificationState` in @nowry/core, exactly as the web provider's does, so
 * both clients agree on what a notification is and disagree only about how it
 * looks. The transport differs too: `window` events there, an in-process
 * emitter here.
 *
 * Styling is intentionally minimal. The design system arrives in MOB-009 and
 * this is replaced by a real Toast primitive in MOB-013.
 */
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNotificationState } from '@nowry/core/context/useNotificationState'
import { subscribeToNotifications } from '../platform/notifications'

const COLORS = {
  error: '#B3261E',
  warning: '#8A5A00',
  success: '#1B5E20',
  info: '#1F2937'
}

export function NotificationHost() {
  const { notification, showNotification, dismiss } = useNotificationState()

  useEffect(() => subscribeToNotifications(({ message, severity }) => showNotification(message, severity)), [showNotification])

  useEffect(() => {
    if (!notification) return undefined
    const timer = setTimeout(dismiss, 5000)
    return () => clearTimeout(timer)
  }, [notification, dismiss])

  if (!notification) return null

  return (
    <Pressable onPress={dismiss} style={styles.wrap} accessibilityRole='alert'>
      <View style={[styles.toast, { backgroundColor: COLORS[notification.severity] || COLORS.info }]}>
        <Text style={styles.text}>{notification.message}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 32 },
  toast: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  text: { color: '#FFFFFF', fontSize: 14 }
})

export default NotificationHost
