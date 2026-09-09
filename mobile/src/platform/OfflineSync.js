/**
 * Offline plumbing, mounted once (MOB-026).
 *
 * Renders nothing. It exists because three things have to happen at the edges
 * of the app's life rather than inside any screen:
 *
 *   - **Start persisting the query cache**, so the Study tab has something to
 *     draw in a tunnel.
 *   - **Send what is queued whenever the app comes forward.** Returning to the
 *     app is the moment a phone most often has signal again, and it costs one
 *     listener instead of a native connectivity module.
 *   - **Erase both on sign-out.** The in-memory cache is cleared by `logout`;
 *     the copy on disk and the outbox are this file's job, and leaving either
 *     behind would hand the next account the previous one's decks, or send
 *     their grades under the wrong session.
 */
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '@nowry/core/context/AuthContext'
import { clearPersistedQueries, startQueryPersistence } from './queryPersistence'
import { clearQueue } from './syncQueue'
import { flushOutbox } from './outbox'

export function OfflineSync() {
  const { user } = useAuth()
  const wasSignedIn = useRef(false)

  useEffect(() => {
    startQueryPersistence()
  }, [])

  useEffect(() => {
    if (user) {
      wasSignedIn.current = true
      return
    }
    // Only on the transition. A cold start with nobody signed in must not wipe
    // a cache that a resuming session is about to restore.
    if (!wasSignedIn.current) return
    wasSignedIn.current = false
    clearPersistedQueries()
    clearQueue()
  }, [user])

  useEffect(() => {
    flushOutbox()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushOutbox()
    })
    return () => subscription.remove()
  }, [])

  return null
}

export default OfflineSync
