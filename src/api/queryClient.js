/**
 * queryClient — Shared TanStack Query client (ADR-008).
 *
 * This is the foundational setup for the incremental migration off the
 * hand-rolled `apiCache` singleton (`nowry/src/api/utils/cache.js`) onto
 * TanStack Query. See ADR-008 in `docs/decisions.md` for the full context:
 * `apiCache` has no subscriber notification, so invalidating a cache key in
 * one hook instance doesn't re-render other mounted components reading that
 * same key — two screens can silently drift out of sync. React Query's
 * `queryClient.invalidateQueries(key)` fixes that structurally by notifying
 * every subscribed component.
 *
 * IMPORTANT: this file only wires up the client + provider. No hook has been
 * migrated yet — `apiCache` remains the active cache for all 8 hooks
 * (`useDeckData`, `useCardData`, `useBooks`, `useStatistics`, `useAnnualPlan`,
 * `useTaskData`, `useVoiceSettings`, `useSegmentedSpeech`) until each is
 * migrated individually in a later task (CACHE-003+).
 *
 * ── Query key convention ─────────────────────────────────────────────
 * Keys are arrays, most-generic segment first, so `invalidateQueries` can
 * target a whole resource or a narrow slice of it. Mirror the resource's
 * current `apiCache` key shape (see the string keys in `useDeckData.js` /
 * `useCardData.js`) as an array instead of a colon-joined string:
 *
 *   ['decks', userId, deckType]            // was `decks:${deckType}:${user.id}`
 *   ['decks', userId]                       // invalidates every deckType for a user
 *   ['cards', userId, { tags, search }]    // was `cards:filtered:t:...:s:...`
 *   ['cards', userId]                       // invalidates every filter/search variant
 *
 * General shape for any future resource: `[resourceName, userId, ...scopeParams]`.
 * - `resourceName` — plural noun matching the hook's domain (`'decks'`, `'cards'`,
 *   `'books'`, `'statistics'`, `'annualPlan'`, `'tasks'`, `'voiceSettings'`, ...).
 * - `userId` — always included right after the resource name (all 8 hooks scope
 *   by the logged-in user today via `apiCache`'s manual key prefixing); keeps
 *   per-user data from colliding and lets `invalidateQueries(['decks', userId])`
 *   invalidate everything for that user without affecting other accounts.
 * - trailing scope params — anything that narrows the query further (deck type,
 *   filter/search object, pagination cursor, etc.), in the same order the current
 *   `apiCache` key already encodes them.
 *
 * Migrated hooks should reuse this shape so `queryClient.invalidateQueries({
 * queryKey: ['decks', userId] })` reliably catches every related query,
 * including filtered/paginated variants, without hooks needing to know about
 * each other's exact key.
 * ─────────────────────────────────────────────────────────────────────
 */

import { QueryClient } from '@tanstack/react-query'

// Default staleTime picked to sit inside the existing apiCache TTL range used
// by the two busiest hooks (useDeckData: 60000ms, useCardData: 30000ms) —
// 45s is a reasonable default for "how long is cached server data considered
// fresh" across resources in general. Individual queries are expected to
// override `staleTime` per-resource when migrated (e.g. decks at 60000,
// cards at 30000) to match today's behavior exactly.
const DEFAULT_STALE_TIME = 45000 // 45 seconds

// gcTime (garbage collection of inactive query data) is kept comfortably
// above staleTime so a remounted component still gets an instant render from
// cache (matching apiCache's "pre-seed from cache" pattern in useDeckData /
// useCardData) before a background refetch.
const DEFAULT_GC_TIME = 5 * 60 * 1000 // 5 minutes

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME,
      gcTime: DEFAULT_GC_TIME,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})
