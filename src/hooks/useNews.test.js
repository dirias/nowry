/**
 * useNews — home news feed regression tests.
 *
 * Three reported symptoms motivated this hook, and each has a test here that
 * fails against the old `NewsCarousel.js` implementation:
 *
 *   1. "The news refresh every single time." The old effect re-fetched on every
 *      mount and reshuffled the result, so an unchanged feed looked new on each
 *      visit — covered by the remount test.
 *   2. "Sometimes they show general even when interests are set." The old effect
 *      fired once with no preferences loaded (requesting `general`) and again
 *      once they arrived, with no cancellation — whichever landed last won.
 *      Covered by the `enabled` gate test.
 *   3. Interests that silently produced the general feed anyway, because six of
 *      the fourteen topics mapped to `general` and `general` was then filtered
 *      out. Covered by the `resolveCategories` cases.
 */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useNews, resolveCategories, NEWS_STALE_TIME } from './useNews'

const mockGet = jest.fn()
jest.mock('../api/client', () => ({
  apiClient: {
    get: (...args) => mockGet(...args)
  }
}))

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}))

/** One article payload shaped like the backend's response entries. */
const article = (url, title = url) => ({
  title,
  description: 'desc',
  urlToImage: 'https://example.com/i.png',
  url,
  publishedAt: null
})

/** A successful axios-shaped response for a category. */
const ok = (articles) => ({ data: { status: 'success', articles } })

/**
 * A provider whose client is shared across every render in one test, so an
 * unmount/remount exercises the real cache rather than a fresh one.
 */
const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: NEWS_STALE_TIME } }
  })
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

beforeEach(() => {
  mockGet.mockReset()
})

// ─── resolveCategories() — the "general even though I set interests" bug ────

describe('resolveCategories', () => {
  it('maps the six formerly-orphaned topics to their own feed, not to general', () => {
    // Before the fix every one of these returned 'general', and 'general' was
    // then stripped — so a user who picked only these got exactly the feed of a
    // user who picked nothing.
    expect(resolveCategories(['mathematics'])).toEqual(['mathematics'])
    expect(resolveCategories(['history'])).toEqual(['history'])
    expect(resolveCategories(['languages'])).toEqual(['languages'])
    expect(resolveCategories(['philosophy'])).toEqual(['philosophy'])
    expect(resolveCategories(['design'])).toEqual(['design'])
    expect(resolveCategories(['psychology'])).toEqual(['psychology'])
  })

  it('dedupes topics that share one feed into a single request', () => {
    // artificial_intelligence and technology both resolve to 'technology'.
    expect(resolveCategories(['artificial_intelligence', 'technology'])).toEqual(['technology'])
    expect(resolveCategories(['literature', 'art', 'music'])).toEqual(['entertainment'])
  })

  it('falls back to general only when there is genuinely nothing to go on', () => {
    expect(resolveCategories([])).toEqual(['general'])
    expect(resolveCategories(null)).toEqual(['general'])
    expect(resolveCategories(undefined)).toEqual(['general'])
  })

  it('keeps an unrecognised interest as general rather than dropping it', () => {
    expect(resolveCategories(['not_a_topic'])).toEqual(['general'])
    expect(resolveCategories(['technology', 'not_a_topic'])).toEqual(['technology', 'general'])
  })
})

// ─── the fetch itself ───────────────────────────────────────────────────────

describe('useNews', () => {
  it('requests nothing until a language exists, so no general request can race the real one', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useNews(undefined, ['technology']), { wrapper })

    // The old code fired `/news/en/general` here, on the very first render,
    // before preferences had loaded.
    expect(mockGet).not.toHaveBeenCalled()
    // And it must read as loading, not as an empty feed, or the carousel shows
    // its "no articles" state while preferences are still in flight.
    expect(result.current.loading).toBe(true)
    expect(result.current.articles).toEqual([])
  })

  it('requests one feed per distinct category and tags each article with it', async () => {
    mockGet.mockImplementation((url) =>
      Promise.resolve(url.endsWith('/technology') ? ok([article('https://a')]) : ok([article('https://b')]))
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useNews('es', ['technology', 'health']), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenCalledWith('/news/es/technology')
    expect(mockGet).toHaveBeenCalledWith('/news/es/health')

    const byUrl = Object.fromEntries(result.current.articles.map((a) => [a.url, a.category]))
    expect(byUrl).toEqual({ 'https://a': 'technology', 'https://b': 'health' })
  })

  it('drops articles that appear in more than one feed', async () => {
    mockGet.mockImplementation((url) =>
      Promise.resolve(url.endsWith('/technology') ? ok([article('https://same'), article('https://t')]) : ok([article('https://same')]))
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useNews('en', ['technology', 'health']), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.articles.map((a) => a.url).sort()).toEqual(['https://same', 'https://t'])
  })

  it('caps the feed at 15 articles', async () => {
    mockGet.mockResolvedValue(ok(Array.from({ length: 40 }, (_, i) => article(`https://a${i}`))))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useNews('en', ['technology']), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.articles).toHaveLength(15)
  })

  it('serves the identical feed, in the identical order, on remount within the stale window', async () => {
    mockGet.mockResolvedValue(ok(Array.from({ length: 12 }, (_, i) => article(`https://a${i}`))))

    const { wrapper } = makeWrapper()
    const first = renderHook(() => useNews('en', ['technology']), { wrapper })
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    const firstOrder = first.result.current.articles.map((a) => a.url)
    first.unmount()

    const second = renderHook(() => useNews('en', ['technology']), { wrapper })
    await waitFor(() => expect(second.result.current.loading).toBe(false))

    // One request total, and the same shuffle — the old code re-fetched and
    // re-shuffled here, which is what made the feed look new on every visit.
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(second.result.current.articles.map((a) => a.url)).toEqual(firstOrder)
  })

  it('still renders the feed when only some categories fail', async () => {
    mockGet.mockImplementation((url) =>
      url.endsWith('/technology') ? Promise.resolve(ok([article('https://t')])) : Promise.reject(new Error('502'))
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useNews('en', ['technology', 'health']), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.articles.map((a) => a.url)).toEqual(['https://t'])
  })

  it('reports an error only when every category fails, so the UI can tell "down" from "empty"', async () => {
    mockGet.mockRejectedValue(new Error('502'))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useNews('en', ['technology', 'health']), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.articles).toEqual([])
  })

  it('refetches when the language changes', async () => {
    mockGet.mockResolvedValue(ok([article('https://a')]))

    const { wrapper } = makeWrapper()
    const { result, rerender } = renderHook(({ lang }) => useNews(lang, ['technology']), {
      wrapper,
      initialProps: { lang: 'en' }
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockGet).toHaveBeenCalledWith('/news/en/technology')

    rerender({ lang: 'fr' })
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/news/fr/technology'))
  })
})
