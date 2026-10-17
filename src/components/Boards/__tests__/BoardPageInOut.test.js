/**
 * BOARD-008 / BOARD-009 — the page's part of in and out: the board menu's
 * Import a file… and Export items reach the canvas, the picker takes the
 * formats a board reads, and a status line with Undo undoes the paste.
 */
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { IMPORT_ACCEPT } from '../canvas/useBoardClipboard'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
}))
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => jest.fn() }))
jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'pro' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))
jest.mock('@nowry/core/api/services/blackboard.service', () => ({ blackboardService: { inviteCollaborator: jest.fn() } }))

const mockUseBoard = jest.fn()
jest.mock('@nowry/core/hooks/useBoard', () => ({ useBoard: (id) => mockUseBoard(id) }))
jest.mock('@nowry/core/hooks/useBoards', () => ({ useBoards: () => ({ duplicate: jest.fn(), remove: jest.fn() }) }))

let mockCanvasProps = null
const mockCommands = { importFile: jest.fn(() => Promise.resolve(true)), exportAs: jest.fn(), focus: jest.fn() }
jest.mock('../canvas/BoardCanvas', () => {
  const CanvasStub = (props) => {
    mockCanvasProps = props
    if (props.commandsRef) props.commandsRef.current = mockCommands
    return <div data-testid='canvas-stub' />
  }
  return CanvasStub
})

jest.mock('../BoardLinks', () => ({ __esModule: true, default: ({ children }) => children }))

const BoardPage = require('../BoardPage').default

const BOARD = { id: 'b1', name: 'Cells', ownerId: 'me', collaborators: [], nodes: [], links: [], viewport: { x: 0, y: 0, zoom: 1 } }

const undo = jest.fn()
const renderPage = () => {
  mockUseBoard.mockReturnValue({
    board: BOARD,
    loading: false,
    error: null,
    status: 'idle',
    hasPending: false,
    apply: jest.fn(),
    checkpoint: jest.fn(),
    undo,
    redo: jest.fn(),
    setViewport: jest.fn(),
    rename: jest.fn(),
    reload: jest.fn()
  })
  return render(
    <MemoryRouter initialEntries={['/boards/b1']}>
      <Routes>
        <Route path='/boards/:id' element={<BoardPage />} />
      </Routes>
    </MemoryRouter>
  )
}

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: 'boards.bar.more' }))
  return screen.getByRole('menu')
}

beforeEach(() => {
  mockCanvasProps = null
  jest.clearAllMocks()
})

describe('the board menu: Import a file… and Export', () => {
  it('Import a file… opens a picker for the formats a board reads', () => {
    renderPage()
    const input = screen.getByTestId('board-import-input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', IMPORT_ACCEPT)
    expect(IMPORT_ACCEPT.split(',')).toEqual(['.mmd', '.mermaid', '.md', '.markdown', '.txt', '.canvas'])
    const click = jest.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: /boards.menu.import/ }))
    expect(click).toHaveBeenCalled()
  })

  it('a chosen file goes to the canvas, and focus comes back to it', async () => {
    renderPage()
    const input = screen.getByTestId('board-import-input')
    const file = new File(['flowchart LR\n A --> B'], 'map.mmd')
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })
    expect(mockCommands.importFile).toHaveBeenCalledWith(file)
    expect(mockCommands.focus).toHaveBeenCalled()
  })

  it.each([
    ['boards.menu.exportPng', 'png'],
    ['boards.menu.exportSvg', 'svg'],
    ['boards.menu.exportOutline', 'outline'],
    ['boards.menu.exportCanvas', 'canvas']
  ])('%s exports as %s', (label, format) => {
    renderPage()
    const menu = openMenu()
    expect(within(menu).getByText('boards.menu.export')).toBeInTheDocument()
    fireEvent.click(within(menu).getByRole('menuitem', { name: label }))
    expect(mockCommands.exportAs).toHaveBeenCalledWith(format)
  })
})

describe('the status line', () => {
  it('names what came in, politely, and its Undo undoes the paste', () => {
    renderPage()
    act(() => mockCanvasProps.onStatus({ text: 'Pasted 7 notes, 6 links and a frame from Mermaid', undo: true }))
    const line = screen.getByRole('status')
    expect(line).toHaveTextContent('Pasted 7 notes, 6 links and a frame from Mermaid')
    fireEvent.click(within(line).getByRole('button', { name: 'boards.inOut.undo' }))
    expect(undo).toHaveBeenCalledTimes(1)
    expect(mockCommands.focus).toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('a refusal has no Undo and goes by itself after a while', () => {
    jest.useFakeTimers()
    renderPage()
    act(() => mockCanvasProps.onStatus({ text: 'That would make 612 notes; a board holds 500.' }))
    expect(screen.getByRole('status')).toHaveTextContent('That would make 612 notes')
    expect(within(screen.getByRole('status')).queryByRole('button')).toBeNull()
    act(() => jest.advanceTimersByTime(7000))
    expect(screen.queryByRole('status')).toBeNull()
    jest.useRealTimers()
  })

  it("an export that fails says so in the page's error line", () => {
    renderPage()
    act(() => mockCanvasProps.onError('The image could not be made. Try again.'))
    expect(screen.getByRole('alert')).toHaveTextContent('The image could not be made. Try again.')
  })
})
