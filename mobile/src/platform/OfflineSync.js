/**
 * Offline plumbing, mounted once (MOB-026).
 *
 * Renders nothing. It exists because three things have to happen at the edges
 * of the app's life rather than inside any screen:
 *
 *   - **Erase the cache on sign-out.** Starting the persistence is not here:
 *     it has to happen ABOVE the screens, in `_layout.js`, so the restore
 *     finishes before anything queries.
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
import { queryClient } from '@nowry/core/api/queryClient'
import { clearPersistedQueries } from './queryPersistence'
import { clearQueue } from './syncQueue'
import { flushOutbox } from './outbox'

/**
 * What a delivered grade changes. The server has just recorded a review, so
 * every number derived from one is now wrong on screen (MOB-069).
 */
const AFTER_A_SEND = ['decks', 'cards', 'statistics', 'forecast']

export function OfflineSync() {
  const { user } = useAuth()
  const wasSignedIn = useRef(false)

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
    const send = () =>
      flushOutbox()
        .then(({ sent }) => {
          if (sent > 0) AFTER_A_SEND.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
        })
        // A failed drain leaves the queue as it found it and tries again on the
        // next foreground; there is nothing to report here.
        .catch(() => {})

    send()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') send()
    })
    return () => subscription.remove()
  }, [])

  return null
}

export default OfflineSync
