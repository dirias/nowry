/**
 * IMPORT-016 / ADR-063 — useLibrary: the library a page at a time. The server
 * answers the question; the hook only strings the pages together.
 */
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'

import { libraryRows, nextLibraryOffset, useLibrary } from './useLibrary'
import { queryClient } from '../api/queryClient'

jest.mock('../api/services', () => ({ booksService: { getLibrary: jest.fn() } }))
jest.mock('../api/services/books.service', () => ({ LIBRARY_PAGE_SIZE: 24 }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const { booksService } = require('../api/services')

const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
const book = (n) => ({ _id: `b${n}`, title: `doc ${n}` })
const page = (from, count, total, extra = {}) => ({
  items: Array.from({ length: count }, (_, i) => book(from + i)),
  total,
  offset: from,
  limit: 2,
  counts: { all: total, written: total, imported: 0 },
  tags: [{ tag: 'bio', count: 1 }],
  continue_book: book(0),
  ...extra
})

beforeEach(() => {
  queryClient.clear()
  booksService.getLibrary.mockReset()
})

describe('the pure pieces', () => {
  it('knows where the next page starts and when there is none', () => {
    const first = page(0, 2, 5)
    expect(nextLibraryOffset(first, [first])).toBe(2)
    const last = page(4, 1, 5)
    expect(nextLibraryOffset(last, [first, page(2, 2, 5), last])).toBeUndefined()
    expect(nextLibraryOffset(page(0, 0, 0), [page(0, 0, 0)])).toBeUndefined()
  })

  it('keeps a document that moved between two pages once', () => {
    expect(libraryRows([{ items: [book(1), book(2)] }, { items: [book(2), book(3)] }]).map((b) => b._id)).toEqual(['b1', 'b2', 'b3'])
  })
})

describe('useLibrary', () => {
  it('asks the server the question and returns the rows with the library summary', async () => {
    booksService.getLibrary.mockResolvedValue(page(0, 2, 5))
    const { result } = renderHook(() => useLibrary({ kind: 'imported', sort: 'title', tags: ['bio'], pageSize: 2 }), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(booksService.getLibrary).toHaveBeenCalledWith({ kind: 'imported', search: '', tags: ['bio'], sort: 'title', offset: 0, limit: 2 })
    expect(result.current.rows.map((b) => b._id)).toEqual(['b0', 'b1'])
    expect(result.current).toMatchObject({ total: 5, hasMore: true, counts: { all: 5 }, tags: [{ tag: 'bio', count: 1 }], continueBook: { _id: 'b0' } })
  })

  it('loads the next page from where the last one ended, until there is no more', async () => {
    booksService.getLibrary.mockImplementation(({ offset }) => Promise.resolve(page(offset, offset >= 4 ? 1 : 2, 5)))
    const { result } = renderHook(() => useLibrary({ pageSize: 2 }), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    await act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.rows).toHaveLength(4))
    await act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.rows).toHaveLength(5))
    expect(result.current.hasMore).toBe(false)
    expect(booksService.getLibrary.mock.calls.map(([q]) => q.offset)).toEqual([0, 2, 4])
    await act(() => result.current.loadMore())
    expect(booksService.getLibrary).toHaveBeenCalledTimes(3)
  })

  it('searches after the reader stops typing, not on every keystroke', async () => {
    booksService.getLibrary.mockResolvedValue(page(0, 1, 1))
    const { result, rerender } = renderHook(({ search }) => useLibrary({ search, pageSize: 2 }), { wrapper, initialProps: { search: '' } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender({ search: 'm' })
    rerender({ search: 'mi' })
    rerender({ search: 'mito ' })
    expect(result.current.refreshing).toBe(true)
    await waitFor(() => expect(booksService.getLibrary).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(booksService.getLibrary.mock.calls.map(([q]) => q.search)).toEqual(['', 'mito'])
  })

  it('reload refreshes everything filed under the book list', async () => {
    booksService.getLibrary.mockResolvedValue(page(0, 1, 1))
    const { result } = renderHook(() => useLibrary({ pageSize: 2 }), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.reload())
    expect(booksService.getLibrary).toHaveBeenCalledTimes(2)
  })
})
