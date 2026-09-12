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
 *
 * **Restoring has to finish before anything queries.** It did not: the restore
 * was kicked off in an effect beside the screens, so the first fetch raced it,
 * failed offline, and the cache arrived too late to matter. `PERSIST_OPTIONS`
 * is handed to `PersistQueryClientProvider`, which holds rendering until the
 * cache is back — which is the whole difference between a working offline open
 * and "Couldn't load cards" over a queue that is already on the device.
 */
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { storage } from '@nowry/core'

const KEY = 'NOWRY_QUERY_CACHE'

/** A day: long enough that yesterday's queue is still there this morning. */
const MAX_AGE = 24 * 60 * 60 * 1000

/**
 * The resources the study loop reads. Everything else stays in memory.
 *
 * `statistics` joined them after the offline run: the dashboard reads today's
 * reviewed count and the streak from it, and without a copy on disk a cold
 * start with no network showed a Today object with its numbers missing and a
 * red "couldn't load your progress" under it (MOB-069). A persisted copy can be
 * a few hours stale, which is the same bargain the decks and cards already
 * make, and React Query refetches the moment the network comes back.
 */
const PERSISTED = ['decks', 'cards', 'groups', 'forecast', 'tags', 'statistics']

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.remove(key)
  },
  key: KEY
})

export const PERSIST_OPTIONS = {
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
}

export const clearPersistedQueries = () => {
  try {
    persister.removeClient()
  } catch {
    // Nothing the caller can do, and the in-memory clear has already happened.
  }
}

export default PERSIST_OPTIONS
