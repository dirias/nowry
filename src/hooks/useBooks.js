import { useState, useEffect, useCallback } from 'react'
import { booksService } from '../api/services'
import { apiCache } from '../api/utils/cache'

const BOOKS_TTL = 30000 // 30s cache

export const useBooks = () => {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadBooks = useCallback(async (isCancelled = () => false, forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      let fetchedBooks
      if (forceRefresh) {
        apiCache.invalidate('books:all')
        fetchedBooks = await booksService.getAll()
      } else {
        fetchedBooks = await apiCache.get('books:all', BOOKS_TTL, () => booksService.getAll())
      }

      if (isCancelled()) return
      setBooks(fetchedBooks || [])
    } catch (err) {
      if (!isCancelled()) {
        console.error('Error fetching books:', err)
        setError(err)
      }
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadBooks(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [loadBooks])

  return { books, loading, error, reload: () => loadBooks(() => false, true) }
}

export default useBooks
