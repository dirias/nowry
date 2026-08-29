/**
 * useNews — React Query-backed home news feed (ADR-008 convention).
 *
 * Replaces the hand-rolled `useEffect` + `fetchedRef` fetch that used to live
 * inside `NewsCarousel.js`. That version had three defects this hook exists to
 * close:
 *
 * 1. **No cache.** Every mount of Home (or `/news`) re-hit the API, and the
 *    result was reshuffled on arrival, so an unchanged feed looked brand new on
 *    every visit. `staleTime` now holds the same articles — in the same order —
 *    for the whole window, matching the backend's own `NEWS_CACHE` TTL.
 * 2. **A last-write-wins race.** The old effect fired once immediately with no
 *    preferences loaded (`user` is null on first render, see `AuthContext.js`),
 *    requesting `general`, then again once preferences arrived. Neither request
 *    was cancelled, so whenever the `general` one resolved second it overwrote
 *    the personalized feed — the intermittent "shows general even though my
 *    interests are set" report. `enabled` now gates the query until preferences
 *    exist, and React Query discards responses from superseded keys.
 * 3. **A biased shuffle re-run per render.** `sort(() => Math.random() - 0.5)`
 *    is not a uniform shuffle and ran on every fetch; this uses Fisher-Yates,
 *    once, inside the queryFn, so the cached result is a stable order.
 *
 * The feed is not user-specific data — it is fully determined by language and
 * categories — but the key carries `userId` anyway to follow the convention
 * documented in `api/queryClient.js` and to keep logout's `queryClient.clear()`
 * meaningful.
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getNewsCategory, DEFAULT_NEWS_CATEGORY } from '../constants/learningTaxonomy'

// RSS sources publish on the order of tens of minutes. Kept deliberately in
// step with the backend's own cache window (`NEWS_CACHE`, default 15 minutes,
// in `Nowry-API/app/routers/news.py`) so a revisit inside the window costs
// neither a request nor a reshuffle.
export const NEWS_STALE_TIME = 15 * 60000 // 15 minutes

// Upper bound on cards rendered in the carousel.
const MAX_ARTICLES = 15

/**
 * Map the user's interests onto the distinct feed categories to request.
 *
 * Several topics share a feed (artificial_intelligence and technology both map
 * to 'technology'), so the set dedupes them into one request. An interest that
 * resolves to no dedicated feed falls through to the default category rather
 * than being dropped.
 *
 * @param   {string[]} interests Selected topic values.
 * @returns {string[]}           Distinct categories, never empty.
 */
export const resolveCategories = (interests) => {
  const categories = [...new Set((interests ?? []).map(getNewsCategory))]
  return categories.length > 0 ? categories : [DEFAULT_NEWS_CATEGORY]
}

/**
 * Fisher-Yates, so categories interleave instead of arriving in blocks.
 * Returns a new array; does not mutate the input.
 *
 * @param   {Array} items
 * @returns {Array}
 */
const shuffle = (items) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Fetch every requested category in parallel and merge into one feed.
 *
 * A category that fails is skipped rather than failing the whole feed — one
 * dead RSS source should not blank the carousel. The query only rejects if
 * every category failed, so the UI can tell "nothing matched" (empty state)
 * apart from "the feed is down" (error state).
 *
 * @param   {string}   language
 * @param   {string[]} categories
 * @returns {Promise<Array>}
 */
const fetchNews = async (language, categories) => {
  const settled = await Promise.all(
    categories.map((category) =>
      apiClient
        .get(`/news/${language}/${category}`)
        .then((res) => {
          const data = res.data
          if (data?.status === 'success' && Array.isArray(data.articles)) {
            // Tag each article so the card can render its category chip.
            return data.articles.map((article) => ({ ...article, category }))
          }
          return []
        })
        .catch(() => null)
    )
  )

  if (settled.every((result) => result === null)) {
    throw new Error('All news categories failed to load')
  }

  const articles = settled.filter(Boolean).flat()
  const unique = articles.filter((article, index, self) => index === self.findIndex((other) => other.url === article.url))

  return shuffle(unique).slice(0, MAX_ARTICLES)
}

/**
 * The home news feed for a set of preferences.
 *
 * @param   {string|null|undefined}   language  Preferred language; the query stays idle until it exists.
 * @param   {string[]|null|undefined} interests Selected topic values.
 * @returns {{articles: Array, loading: boolean, error: Error|null, refetch: Function}}
 */
export function useNews(language, interests) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const categories = resolveCategories(interests)

  const { data, isPending, error, refetch } = useQuery({
    // categories is a fresh array each render, so join it into a stable
    // primitive — an array literal here would never hit the cache.
    queryKey: ['news', userId, language, categories.join(',')],
    queryFn: () => fetchNews(language, categories),
    // Nothing is requested until preferences have actually loaded. This is what
    // removes the "general" first-render request that used to race the real one.
    enabled: !!language,
    staleTime: NEWS_STALE_TIME
  })

  return {
    articles: data ?? [],
    // `isPending` rather than `isLoading`: in React Query v5 `isLoading` is
    // `isPending && isFetching`, so a query held back by `enabled` reports
    // false — the carousel would flash its empty state in the window before
    // preferences arrive. `isPending` covers both "waiting to be enabled" and
    // "first fetch in flight", and goes false during background refetches so a
    // stale-but-present feed keeps rendering instead of reverting to skeletons.
    loading: isPending,
    error: error ?? null,
    refetch
  }
}

export default useNews
