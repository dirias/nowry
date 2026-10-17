/**
 * BOARD-003 — the boards page (PRD D1): its four states, New board opening the
 * board it made, the plan's limit said under the key, and each tile's menu.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : options?.name ? `${key}:${options.name}` : key),
    i18n: { language: 'en' }
  })
}))
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }))
let mockTier = 'plus'
const mockUpgrade = jest.fn()
jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: mockTier }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: mockUpgrade }) }))
jest.mock('@nowry/core/api/services/blackboard.service', () => ({ blackboardService: { inviteCollaborator: jest.fn() } }))

const mockUseBoards = jest.fn()
jest.mock('@nowry/core/hooks/useBoards', () => ({ useBoards: () => mockUseBoards() }))

const BoardsPage = require('../BoardsPage').default

const SUMMARY = {
  id: 'b1',
  name: 'Photosynthesis',
  isOwner: true,
  ownerName: '',
  collaborators: [],
  updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  counts: { notes: 12, links: 6, items: 0, cards: 3 },
  outline: [
    { x: 0, y: 0, w: 300, h: 390, kind: 'frame', color: null },
    { x: 40, y: 30, w: 220, h: 80, kind: 'note', color: 'blue' }
  ]
}

const hooks = (over = {}) => ({
  boards: [SUMMARY],
  loading: false,
  error: null,
  create: jest.fn(),
  rename: jest.fn().mockResolvedValue({}),
  duplicate: jest.fn().mockResolvedValue({}),
  remove: jest.fn().mockResolvedValue({}),
  reload: jest.fn(),
  ...over
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <BoardsPage />
    </MemoryRouter>
  )

beforeEach(() => {
  mockTier = 'plus'
})

describe('BoardsPage — states', () => {
  it('loading: tile skeletons, no count', () => {
    mockUseBoards.mockReturnValue(hooks({ boards: null, loading: true }))
    renderPage()
    expect(screen.getByTestId('boards-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('boards-count')).toBeNull()
  })

  it('empty: one sentence, and the page’s one key', () => {
    mockUseBoards.mockReturnValue(hooks({ boards: [] }))
    renderPage()
    expect(screen.getByTestId('boards-empty')).toHaveTextContent('boards.empty')
    expect(screen.getByRole('button', { name: 'boards.newBoard' })).toBeInTheDocument()
    expect(screen.getByTestId('boards-count')).toHaveTextContent('boards.count:0')
  })

  it('error: a sentence and Retry', () => {
    const reload = jest.fn()
    mockUseBoards.mockReturnValue(hooks({ boards: null, error: new Error('down'), reload }))
    renderPage()
    expect(screen.getByText('boards.loadError')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(reload).toHaveBeenCalled()
  })

  it('list: one tile per board, with its outline, name and meta line', () => {
    mockUseBoards.mockReturnValue(hooks())
    renderPage()
    const tile = screen.getByTestId('board-tile')
    expect(within(tile).getByText('Photosynthesis')).toBeInTheDocument()
    expect(within(tile).getByText('boards.tile.edited.hours:2 · boards.tile.notes:12 · boards.tile.cards:3')).toBeInTheDocument()
    expect(within(tile).getByTestId('board-outline').querySelectorAll('rect')).toHaveLength(2)
    expect(screen.getByTestId('boards-count')).toHaveTextContent('boards.count:1')
  })

  it('a tile opens its board', () => {
    mockUseBoards.mockReturnValue(hooks())
    renderPage()
    fireEvent.click(screen.getByTestId('board-tile'))
    expect(mockNavigate).toHaveBeenCalledWith('/boards/b1')
  })
})

describe('BoardsPage — New board', () => {
  it('makes an untitled board and opens it on its first note', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'new1' })
    mockUseBoards.mockReturnValue(hooks({ create }))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'boards.newBoard' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/boards/new1?new=1'))
    expect(create).toHaveBeenCalledWith('boards.untitled')
  })

  it('a full plan says so in one line under the key, and the key stays pressable', async () => {
    const create = jest.fn().mockRejectedValue({ response: { status: 402, data: { detail: 'board_limit_reached' } } })
    mockUseBoards.mockReturnValue(hooks({ create }))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'boards.newBoard' }))
    expect(await screen.findByTestId('boards-limit')).toHaveTextContent('boards.limit')
    expect(screen.getByRole('link', { name: 'boards.seePlans' })).toHaveAttribute('href', '/plans')
    expect(screen.getByRole('button', { name: 'boards.newBoard' })).not.toBeDisabled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('BoardsPage — the tile menu', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'boards.tile.menu:Photosynthesis' }))

  it('renames in place', async () => {
    jest.useFakeTimers()
    const rename = jest.fn().mockResolvedValue({})
    mockUseBoards.mockReturnValue(hooks({ rename }))
    renderPage()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.rename' }))
    act(() => jest.runAllTimers())
    jest.useRealTimers()
    const field = screen.getByRole('textbox', { name: 'boards.rename.label' })
    fireEvent.change(field, { target: { value: 'Light' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() => expect(rename).toHaveBeenCalledWith('b1', 'Light'))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('duplicates', async () => {
    const duplicate = jest.fn().mockResolvedValue({ id: 'copy' })
    mockUseBoards.mockReturnValue(hooks({ duplicate }))
    renderPage()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.duplicate' }))
    await waitFor(() => expect(duplicate).toHaveBeenCalledWith('b1'))
  })

  it('deletes only after the confirmation', async () => {
    const remove = jest.fn().mockResolvedValue({})
    mockUseBoards.mockReturnValue(hooks({ remove }))
    renderPage()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.delete' }))
    expect(remove).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'boards.delete.confirm' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('b1'))
  })

  it('shares on Plus, and opens the plans on Free', () => {
    mockUseBoards.mockReturnValue(hooks())
    const { unmount } = renderPage()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.share' }))
    expect(screen.getByText('boards.share.title')).toBeInTheDocument()
    unmount()
    mockTier = 'free'
    renderPage()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.share' }))
    expect(mockUpgrade).toHaveBeenCalledWith('boards.share.upgrade')
  })

  it('a board shared with me cannot be shared or deleted from my tile', () => {
    mockUseBoards.mockReturnValue(hooks({ boards: [{ ...SUMMARY, isOwner: false, ownerName: 'Ana', collaborators: ['me'] }] }))
    renderPage()
    expect(screen.getByText(/boards\.tile\.sharedBy:Ana/)).toBeInTheDocument()
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'boards.menu.share' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'boards.menu.delete' })).toBeNull()
  })
})
