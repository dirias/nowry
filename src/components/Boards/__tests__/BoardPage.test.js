/**
 * BOARD-003 — one board's page (PRD D1): loading and missing states, the bar
 * over the canvas, a new board opening on its first note with the name
 * following that note, and the warning on leaving with unsaved edits.
 */
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : options?.name ? `${key}:${options.name}` : key),
    i18n: { language: 'en' }
  })
}))
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'pro' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))
jest.mock('@nowry/core/api/services/blackboard.service', () => ({ blackboardService: { inviteCollaborator: jest.fn() } }))

const mockUseBoard = jest.fn()
jest.mock('@nowry/core/hooks/useBoard', () => ({ useBoard: (id) => mockUseBoard(id) }))
const mockBoardsHooks = { duplicate: jest.fn(), remove: jest.fn() }
jest.mock('@nowry/core/hooks/useBoards', () => ({ useBoards: () => mockBoardsHooks }))

let mockCanvasProps = null
jest.mock('../canvas/BoardCanvas', () => {
  const CanvasStub = (props) => {
    mockCanvasProps = props
    return <div data-testid='canvas-stub' />
  }
  return CanvasStub
})
// The live items and Make cards read the plan and the decks (BoardLinks.test.js covers them).
jest.mock('../BoardLinks', () => ({ __esModule: true, default: ({ children }) => children }))

const BoardPage = require('../BoardPage').default

const BOARD = {
  id: 'b1',
  name: 'boards.untitled',
  ownerId: 'me',
  collaborators: [],
  nodes: [],
  links: [],
  viewport: { x: 0, y: 0, zoom: 1 }
}

const state = (over = {}) => ({
  board: BOARD,
  loading: false,
  error: null,
  status: 'idle',
  hasPending: false,
  apply: jest.fn(),
  checkpoint: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  setViewport: jest.fn(),
  rename: jest.fn(),
  reload: jest.fn(),
  ...over
})

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/boards/:id' element={<BoardPage />} />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  mockCanvasProps = null
})

describe('BoardPage — states', () => {
  it('loading: a skeleton of the bar over the canvas ground', () => {
    mockUseBoard.mockReturnValue(state({ board: null, loading: true }))
    renderAt('/boards/b1')
    expect(screen.getByTestId('board-loading')).toBeInTheDocument()
    expect(mockUseBoard).toHaveBeenCalledWith('b1')
  })

  it('a board that is not there, or not mine: a sentence and the way back', () => {
    mockUseBoard.mockReturnValue(state({ board: null, error: { response: { status: 404 } } }))
    renderAt('/boards/missing')
    expect(screen.getByText('boards.page.notFound')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'boards.page.backToBoards' })).toHaveAttribute('href', '/boards')
  })

  it('a board that failed to load: a sentence and Retry', () => {
    const reload = jest.fn()
    mockUseBoard.mockReturnValue(state({ board: null, error: { response: { status: 500 } }, reload }))
    renderAt('/boards/b1')
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(reload).toHaveBeenCalled()
  })

  it('loaded: the bar over the canvas, wired to the board', () => {
    const hooks = state({ board: { ...BOARD, name: 'Photosynthesis', collaborators: ['ana'] } })
    mockUseBoard.mockReturnValue(hooks)
    renderAt('/boards/b1')
    expect(screen.getByTestId('board-name')).toHaveTextContent('Photosynthesis')
    expect(screen.getByRole('group', { name: 'boards.bar.collaborators:1' })).toBeInTheDocument()
    expect(mockCanvasProps).toMatchObject({
      apply: hooks.apply,
      checkpoint: hooks.checkpoint,
      undo: hooks.undo,
      redo: hooks.redo,
      startWithNote: false
    })
  })
})

describe('BoardPage — a new board', () => {
  it('opens on a typing note with the hint, and the name follows the first note', () => {
    const hooks = state()
    mockUseBoard.mockReturnValue(hooks)
    const { rerender } = renderAt('/boards/b1?new=1')
    expect(mockCanvasProps).toMatchObject({ startWithNote: true, hint: true })
    const note = { id: 'n1', kind: 'note', text: 'Photosynthesis\nLight into sugar' }
    mockUseBoard.mockReturnValue({ ...hooks, board: { ...BOARD, nodes: [note] } })
    rerender(
      <MemoryRouter initialEntries={['/boards/b1?new=1']}>
        <Routes>
          <Route path='/boards/:id' element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(hooks.rename).toHaveBeenCalledWith('Photosynthesis')
  })

  it('the hint goes after the second note', () => {
    mockUseBoard.mockReturnValue(
      state({
        board: {
          ...BOARD,
          nodes: [
            { id: 'a', kind: 'note', text: 'A' },
            { id: 'b', kind: 'note', text: 'B' }
          ]
        }
      })
    )
    renderAt('/boards/b1?new=1')
    expect(mockCanvasProps.hint).toBe(false)
  })

  it('stops following once the person renames the board', () => {
    const hooks = state({ board: { ...BOARD, nodes: [{ id: 'n1', kind: 'note', text: '' }] } })
    mockUseBoard.mockReturnValue(hooks)
    renderAt('/boards/b1?new=1')
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.renameAria:boards.untitled' }))
    const field = screen.getByRole('textbox', { name: 'boards.rename.label' })
    fireEvent.change(field, { target: { value: 'Mine' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(hooks.rename).toHaveBeenLastCalledWith('Mine')
    hooks.rename.mockClear()
    mockUseBoard.mockReturnValue({ ...hooks, board: { ...BOARD, name: 'Mine', nodes: [{ id: 'n1', kind: 'note', text: 'Typed later' }] } })
    act(() => mockCanvasProps.onShowKeys())
    expect(hooks.rename).not.toHaveBeenCalled()
  })

  it('an existing board never renames itself', () => {
    const hooks = state({ board: { ...BOARD, name: 'Kept', nodes: [{ id: 'n1', kind: 'note', text: 'Other' }] } })
    mockUseBoard.mockReturnValue(hooks)
    renderAt('/boards/b1')
    expect(hooks.rename).not.toHaveBeenCalled()
  })
})

describe('BoardPage — leaving and the menu', () => {
  it('warns before the tab closes while edits are not saved', () => {
    mockUseBoard.mockReturnValue(state({ hasPending: true }))
    renderAt('/boards/b1')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not warn when everything is saved', () => {
    mockUseBoard.mockReturnValue(state())
    renderAt('/boards/b1')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('duplicate opens the copy; delete confirms, then returns to the list', async () => {
    mockBoardsHooks.duplicate = jest.fn().mockResolvedValue({ id: 'copy' })
    mockBoardsHooks.remove = jest.fn().mockResolvedValue({})
    mockUseBoard.mockReturnValue(state({ board: { ...BOARD, name: 'Photosynthesis' } }))
    renderAt('/boards/b1')
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.more' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.duplicate' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/boards/copy'))
    fireEvent.click(screen.getByRole('button', { name: 'boards.bar.more' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'boards.menu.delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'boards.delete.confirm' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/boards'))
    expect(mockBoardsHooks.remove).toHaveBeenCalledWith('b1')
  })

  it('the keys sheet opens from the canvas', () => {
    mockUseBoard.mockReturnValue(state())
    renderAt('/boards/b1')
    act(() => mockCanvasProps.onShowKeys())
    expect(screen.getByText('boards.keys.title')).toBeInTheDocument()
  })
})
