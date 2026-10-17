import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blackboardService } from '../api/services/blackboard.service'
import { useAuth } from '../context/AuthContext'
import { canRedo, canUndo, createHistory, diffBoard, isEmptyChange, push, readBoard, redo, undo } from '../domain/board'
import { createSaveQueue } from './boardSaveQueue'

/** One board's cache entry. */
export const boardKey = (boardId) => ['board', boardId]

/**
 * useBoard — one board, edited and saved by change (BOARD-002, PRD D3–D5).
 *
 * The board is local state `{ nodes, links, name }`; every edit goes through
 * `apply(board => nextBoard)`, which records the state before it for undo
 * (unless `{ history: false }`), and queues the difference for the save
 * queue (`boardSaveQueue.js`): 800 ms after the last change, one request at a
 * time, retried with backoff, flushed when the board is left.
 *
 * `board.viewport` is the one the board opened with; `setViewport` saves the
 * view without re-rendering and never enters history. `hasPending` says
 * edits are not yet saved, so the page can warn on leaving; the page owns
 * that listener, core never touches the browser.
 *
 * Server data replaces the local board only while nothing is pending, so a
 * refetch never erases an edit.
 */
export function useBoard(boardId) {
  const { user } = useAuth()
  const client = useQueryClient()
  const [local, setLocal] = useState(null)
  const [history, setHistory] = useState(createHistory)
  const [save, setSave] = useState({ status: 'idle', error: null, hasPending: false })
  const localRef = useRef(null)
  const historyRef = useRef(history)
  const viewportRef = useRef(null)
  const adoptedRef = useRef(null)
  const queueRef = useRef(null)

  const query = useQuery({
    queryKey: boardKey(boardId),
    queryFn: async () => readBoard(await blackboardService.getBoard(boardId)),
    enabled: Boolean(boardId && user?.id),
    staleTime: 0,
    refetchOnWindowFocus: () => !queueRef.current?.busy
  })

  const setBoardState = useCallback((next) => {
    localRef.current = next
    setLocal(next)
  }, [])
  const setHistoryState = useCallback((next) => {
    historyRef.current = next
    setHistory(next)
  }, [])

  /** The cache follows what was saved, so coming back to the board shows it at once. */
  const cacheSaved = useCallback(
    (key, saved, rev, viewport) =>
      client.setQueryData(key, (old) =>
        old ? { ...old, nodes: saved.nodes, links: saved.links, name: saved.name, rev, viewport: viewport ?? old.viewport } : old
      ),
    [client]
  )

  // One save queue per board. Leaving the board (or opening another) closes
  // it: what it holds goes once, after any flight, and the state starts over.
  useEffect(() => {
    const key = boardKey(boardId)
    const queue = createSaveQueue({
      send: (body) => blackboardService.patchBoard(boardId, body),
      onState: ({ status, error, hasPending, rev }) => {
        setSave({ status, error, hasPending })
        if (status !== 'saved' || !localRef.current) return
        cacheSaved(key, localRef.current, rev, viewportRef.current)
        adoptedRef.current = client.getQueryData(key)
      }
    })
    queueRef.current = queue
    setLocal(null)
    setHistoryState(createHistory())
    setSave({ status: 'idle', error: null, hasPending: false })
    return () => {
      const last = localRef.current
      const lastViewport = viewportRef.current
      queue.close().then((ok) => ok && last && cacheSaved(key, last, queue.rev, lastViewport))
      if (queueRef.current === queue) queueRef.current = null
      adoptedRef.current = null
      localRef.current = null
    }
  }, [boardId, client, cacheSaved, setHistoryState])

  // Server data replaces the board only while nothing is waiting to be saved.
  useEffect(() => {
    const data = query.data
    const queue = queueRef.current
    if (!data || !queue || data === adoptedRef.current || queue.busy) return
    adoptedRef.current = data
    queue.setRev(data.rev)
    viewportRef.current = data.viewport
    setBoardState({ nodes: data.nodes, links: data.links, name: data.name })
  }, [query.data, setBoardState])

  /** Moves to `next`, queueing the difference; `record` keeps the state before for undo. */
  const commit = useCallback(
    (next, record) => {
      const prev = localRef.current
      const change = diffBoard(prev, next)
      if (isEmptyChange(change)) return
      if (record) setHistoryState(push(historyRef.current, prev))
      setBoardState(next)
      queueRef.current?.queue(change)
    },
    [setBoardState, setHistoryState]
  )

  const apply = useCallback(
    (updater, { history: record = true } = {}) => {
      const prev = localRef.current
      if (!prev) return
      const result = updater({ nodes: prev.nodes, links: prev.links, name: prev.name })
      if (!result) return
      commit({ nodes: result.nodes ?? prev.nodes, links: result.links ?? prev.links, name: prev.name }, record)
    },
    [commit]
  )

  /** Records the board as it is now, for an edit made of many `history: false` steps (a drag). */
  const checkpoint = useCallback(() => {
    if (localRef.current) setHistoryState(push(historyRef.current, localRef.current))
  }, [setHistoryState])

  const step = useCallback(
    (move) => {
      const current = localRef.current
      if (!current) return
      const res = move(historyRef.current, current)
      if (!res) return
      setHistoryState(res.history)
      const next = { ...current, nodes: res.snapshot.nodes, links: res.snapshot.links }
      const change = diffBoard(current, next)
      setBoardState(next)
      queueRef.current?.queue(change)
    },
    [setBoardState, setHistoryState]
  )
  const undoStep = useCallback(() => step(undo), [step])
  const redoStep = useCallback(() => step(redo), [step])

  const setViewport = useCallback((viewport) => {
    viewportRef.current = viewport
    queueRef.current?.queueViewport(viewport)
  }, [])

  const rename = useCallback(
    (name) => {
      const current = localRef.current
      if (!current || current.name === name) return
      setBoardState({ ...current, name })
      queueRef.current?.queueName(name)
    },
    [setBoardState]
  )

  const flush = useCallback(() => queueRef.current?.flush() ?? Promise.resolve(true), [])
  const reload = useCallback(() => client.invalidateQueries({ queryKey: boardKey(boardId) }), [client, boardId])

  const board = useMemo(() => (local && query.data ? { ...query.data, ...local } : null), [local, query.data])

  return {
    board,
    loading: Boolean(boardId) && !local && !query.error,
    error: save.error ?? query.error ?? null,
    status: save.status,
    hasPending: save.hasPending,
    apply,
    checkpoint,
    undo: undoStep,
    redo: redoStep,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    setViewport,
    rename,
    flush,
    reload
  }
}

export default useBoard
