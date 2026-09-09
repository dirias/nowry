/**
 * The React Query cache, kept on the device (MOB-026).
 *
 * A phone loses its signal in a way a desktop browser does not, and the study
 * loop is the part that has to survive it: the Study tab must render the last
 * known due queue in a tunnel rather than an empty state.
 *
 * **The synchronous persister, because MMKV is synchronous.** That is the whole
 * reason ADR-027 chose MMKV. The async persister exists for AsyncStorage and
 * would add a restore phase to guard for nothing.
 *
 * **Only the study loop is written down.** A persisted cache is a copy of the
 * user's data sitting on the device, so it holds what offline study actually
 * needs and nothing else. Anything not on this list is memory-only, as before.
 *
 * **Sign-out erases it.** `logout` clears the in-memory cache; without the line
 * below the next account on this phone would restore the previous one's decks
 * from disk. `removeClient` is called explicitly rather than relying on the
 * empty cache being written back, because that is a race with the unmount.
 */
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { storage } from '@nowry/core'
import { queryClient } from '@nowry/core/api/queryClient'

const KEY = 'NOWRY_QUERY_CACHE'

/** A day: long enough that yesterday's queue is still there this morning. */
const MAX_AGE = 24 * 60 * 60 * 1000

/** The resources the study loop reads. Everything else stays in memory. */
const PERSISTED = ['decks', 'cards', 'groups', 'forecast', 'tags']

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.remove(key)
  },
  key: KEY
})

export const startQueryPersistence = () =>
  persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_AGE,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // A failed query has nothing worth restoring, and restoring an error
        // would show the user yesterday's failure as today's state.
        if (query.state.status !== 'success') return false
        return PERSISTED.includes(query.queryKey?.[0])
      }
    }
  })

export const clearPersistedQueries = () => {
  try {
    persister.removeClient()
  } catch {
    // Nothing the caller can do, and the in-memory clear has already happened.
  }
}

export default startQueryPersistence
