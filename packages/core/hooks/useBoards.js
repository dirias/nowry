import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { blackboardService } from '../api/services/blackboard.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'
import { readBoard, readBoardSummary } from '../domain/board'

/** The React Query key family: `['boards', userId]` is every list of boards. */
export const boardsKey = (userId) => ['boards', userId]

const rowsOf = (data) => (Array.isArray(data) ? data : (data?.boards ?? []))

/**
 * useBoards — the boards page (BOARD-002, PRD D1): the list with its counts
 * and outlines, and the four things done to a board from its tile. Every
 * mutation invalidates the family; `create` and `duplicate` return the new
 * board, read, so the page can open it.
 */
export function useBoards({ enabled = true } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: boardsKey(userId),
    queryFn: async () => rowsOf(await blackboardService.listBoards()).map(readBoardSummary),
    enabled: Boolean(userId) && enabled
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['boards', userId] })

  const create = useMutation({ mutationFn: async (name) => readBoard(await blackboardService.createBoard(name)), onSuccess: invalidate })
  const rename = useMutation({
    // A rename from a tile sends the revision the list does not carry; the
    // board's own page renames through `useBoard`, which knows it.
    mutationFn: async ({ id, name }) => {
      const board = await queryClient.fetchQuery({
        queryKey: ['board', id],
        queryFn: async () => readBoard(await blackboardService.getBoard(id))
      })
      return blackboardService.renameBoard(id, name, board?.rev ?? 0)
    },
    onSuccess: (_, { id }) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['board', id] })
    }
  })
  const duplicate = useMutation({ mutationFn: async (id) => readBoard(await blackboardService.duplicateBoard(id)), onSuccess: invalidate })
  const remove = useMutation({
    mutationFn: (id) => blackboardService.deleteBoard(id),
    onSuccess: (_, id) => {
      invalidate()
      queryClient.removeQueries({ queryKey: ['board', id] })
    }
  })

  const boards = useMemo(() => data ?? null, [data])

  return {
    boards,
    loading: isLoading,
    fetching: isFetching,
    error: error ?? null,
    create: create.mutateAsync,
    rename: (id, name) => rename.mutateAsync({ id, name }),
    duplicate: duplicate.mutateAsync,
    remove: remove.mutateAsync,
    reload: invalidate
  }
}

export default useBoards
