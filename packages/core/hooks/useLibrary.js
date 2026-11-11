import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { booksService } from '../api/services'
import { LIBRARY_PAGE_SIZE } from '../api/services/books.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

const LIBRARY_STALE_TIME = 30000
/** How long the reader may keep typing before the search is asked. */
export const SEARCH_DEBOUNCE_MS = 300

const EMPTY_COUNTS = Object.freeze({ all: 0, written: 0, imported: 0 })

/** The value, a moment after it stopped changing. */
function useSettled(value, delay) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    if (value === settled) return undefined
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, settled, delay])
  return settled
}

/** Pages flattened to rows, a document that moved between two pages kept once. */
export const libraryRows = (pages = []) => {
  const seen = new Set()
  const rows = []
  pages.forEach((page) =>
    (page?.items || []).forEach((book) => {
      if (seen.has(book._id)) return
      seen.add(book._id)
      rows.push(book)
    })
  )
  return rows
}

/** Where the next page starts, or undefined when every matching document is loaded. */
export const nextLibraryOffset = (lastPage, pages) => {
  const loaded = pages.reduce((count, page) => count + (page?.items?.length || 0), 0)
  if (!lastPage?.items?.length) return undefined
  return loaded < (lastPage.total ?? 0) ? loaded : undefined
}

/**
 * useLibrary — the library, a page at a time (ADR-063).
 *
 * The screen states a question (which kind, which words, which tags, in which
 * order) and gets the rows that answer it, loaded as it asks for more; the
 * counts by kind, the tags and the document to continue describe the whole
 * library and come with every page. Both clients read this hook, so neither
 * holds the whole list or filters it itself: a library of any size shows its
 * newest document first and finds any document by search.
 *
 * The query key starts with `['books', userId]`, so everything that already
 * invalidates the book list (an import, a save, a deletion) refreshes this too.
 */
export function useLibrary({ kind = 'all', search = '', tags = [], sort = 'edited', pageSize = LIBRARY_PAGE_SIZE } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const settledSearch = useSettled(search.trim(), SEARCH_DEBOUNCE_MS)
  const tagKey = [...tags].sort().join('\u0000')
  const question = useMemo(
    () => ({ kind, search: settledSearch, tags: tagKey ? tagKey.split('\u0000') : [], sort }),
    [kind, settledSearch, tagKey, sort]
  )

  const query = useInfiniteQuery({
    queryKey: ['books', userId, 'library', question, pageSize],
    queryFn: ({ pageParam }) => booksService.getLibrary({ ...question, offset: pageParam, limit: pageSize }),
    initialPageParam: 0,
    getNextPageParam: nextLibraryOffset,
    enabled: !!userId,
    staleTime: LIBRARY_STALE_TIME,
    // The rows of the last question stay while the next one is asked, so a
    // keystroke never blanks the list.
    placeholderData: keepPreviousData
  })

  const pages = query.data?.pages
  const rows = useMemo(() => libraryRows(pages), [pages])
  const first = pages?.[0]

  const reload = async () => {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: ['books', userId] })
  }

  return {
    rows,
    total: first?.total ?? 0,
    counts: first?.counts ?? EMPTY_COUNTS,
    tags: first?.tags ?? [],
    continueBook: first?.continue_book ?? null,
    loading: query.isLoading,
    // True while an answer to a changed question is on its way and the old rows are still shown.
    refreshing: query.isPlaceholderData || search.trim() !== settledSearch,
    loadingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore: () => (query.hasNextPage && !query.isFetchingNextPage ? query.fetchNextPage() : Promise.resolve()),
    error: query.error ?? null,
    reload
  }
}

export default useLibrary
