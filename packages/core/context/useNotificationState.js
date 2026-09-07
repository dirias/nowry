/**
 * The state behind a notification surface, without the surface.
 *
 * `NotificationContext` used to hold this alongside a Joy `Snackbar`, which made
 * the whole provider a view and kept it out of the shared layer. The rule that
 * settles it: a provider that renders a component belongs to its client; the
 * state it holds does not.
 *
 * So each client keeps its own provider — rendering a Snackbar on the web, a
 * Toast on mobile — and both drive it from here. Neither the transport nor the
 * markup is this module's business; it only remembers what is being said.
 */
import { useCallback, useState } from 'react'

export const useNotificationState = () => {
  const [notification, setNotification] = useState(null) // { message, severity }

  const showNotification = useCallback((message, severity = 'error') => {
    setNotification({ message, severity })
  }, [])

  const dismiss = useCallback(() => setNotification(null), [])

  return { notification, showNotification, dismiss }
}

export default useNotificationState
