/**
 * BOARD-002 — useBoards: the list read once under `['boards', userId]`, and
 * the four tile actions, each refreshing the family.
 */
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'

import { useBoards } from './useBoards'
import { queryClient } from '../api/queryClient'

jest.mock('../api/services/blackboard.service', () => ({
  blackboardService: {
    listBoards: jest.fn(),
    getBoard: jest.fn(),
    createBoard: jest.fn(),
    renameBoard: jest.fn(),
    duplicateBoard: jest.fn(),
    deleteBoard: jest.fn()
  }
}))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const { blackboardService } = require('../api/services/blackboard.service')

const ROW = {
  id: 'b1',
  name: 'Biology',
  owner_user_id: 'user-1',
  owner_name: 'Didier',
  collaborators: [],
  is_owner: true,
  updated_at: '2026-10-17T09:00:00Z',
  counts: { notes: 3, links: 2, items: 0, cards: 5 },
  outline: [{ x: 0, y: 0, w: 220, h: 100, kind: 'note', color: 'yellow' }]
}
const BOARD = {
  id: 'b2',
  name: 'New',
  owner_user_id: 'user-1',
  collaborators: [],
  schema: 2,
  rev: 0,
  nodes: [],
  links: [],
  viewport: { x: 0, y: 0, zoom: 1 }
}

const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

const mount = async () => {
  const view = renderHook(() => useBoards(), { wrapper })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  queryClient.clear()
  blackboardService.listBoards.mockResolvedValue([ROW])
})

it('lists the boards under the user key, read into camelCase', async () => {
  const { result } = await mount()
  expect(queryClient.getQueryCache().findAll({ queryKey: ['boards', 'user-1'] })).toHaveLength(1)
  expect(result.current.boards).toEqual([
    expect.objectContaining({ id: 'b1', ownerName: 'Didier', isOwner: true, counts: { notes: 3, links: 2, items: 0, cards: 5 } })
  ])
  expect(result.current.boards[0].outline).toHaveLength(1)
})

it('creates and duplicates a board, returning it read, and refreshes the list', async () => {
  blackboardService.createBoard.mockResolvedValue(BOARD)
  blackboardService.duplicateBoard.mockResolvedValue({ ...BOARD, id: 'b3', name: 'Biology (copy)' })
  const { result } = await mount()
  let created
  await act(async () => {
    created = await result.current.create('New')
  })
  expect(blackboardService.createBoard).toHaveBeenCalledWith('New')
  expect(created).toMatchObject({ id: 'b2', name: 'New', nodes: [], viewport: { zoom: 1 } })
  await waitFor(() => expect(blackboardService.listBoards).toHaveBeenCalledTimes(2))
  let copy
  await act(async () => {
    copy = await result.current.duplicate('b1')
  })
  expect(blackboardService.duplicateBoard).toHaveBeenCalledWith('b1')
  expect(copy.id).toBe('b3')
  await waitFor(() => expect(blackboardService.listBoards).toHaveBeenCalledTimes(3))
})

it('renames with the board’s current revision, and deletes', async () => {
  blackboardService.getBoard.mockResolvedValue({ ...BOARD, id: 'b1', rev: 12 })
  blackboardService.renameBoard.mockResolvedValue({ rev: 13 })
  blackboardService.deleteBoard.mockResolvedValue({ ok: true })
  const { result } = await mount()
  await act(async () => {
    await result.current.rename('b1', 'Botany')
  })
  expect(blackboardService.renameBoard).toHaveBeenCalledWith('b1', 'Botany', 12)
  await waitFor(() => expect(blackboardService.listBoards).toHaveBeenCalledTimes(2))
  await act(async () => {
    await result.current.remove('b1')
  })
  expect(blackboardService.deleteBoard).toHaveBeenCalledWith('b1')
  await waitFor(() => expect(blackboardService.listBoards).toHaveBeenCalledTimes(3))
})

it('accepts a list wrapped in `boards`', async () => {
  blackboardService.listBoards.mockResolvedValue({ boards: [ROW] })
  const { result } = await mount()
  expect(result.current.boards).toHaveLength(1)
})
