/**
 * Phase 34 Plan 04 — regression coverage for the Blackboard autosave/error-state fixes.
 *
 * Covers three RESEARCH.md findings, all D-04 "fix-now" candidates:
 *  - F12: `scheduleSave`'s timer callback closed over the *schedule-time* `activeBoardId`.
 *         Switching boards inside the 1.5s debounce window wrote board B's content into
 *         board A's document.
 *  - F13: the unmount cleanup `clearTimeout`-ed a pending save instead of flushing it, so
 *         any edit made in the last 1.5s before closing the modal was silently discarded.
 *  - F2:  `getBoard().catch(() => {})` swallowed every load failure — the user saw a
 *         spinner then a blank canvas with no indication anything went wrong.
 *
 * Harness idiom: react-i18next `t: (k) => k` mock (matches the other Blackboard tests),
 * plus lightweight `@xyflow/react` stand-ins so `BlackboardCanvas` can mount in jsdom
 * without the real canvas/ResizeObserver dependencies.
 */
import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
  // `src/i18n.js` is pulled in transitively (BoardListSelector -> useSubscription ->
  // AuthContext) and calls `i18n.use(initReactI18next)` at module scope.
  initReactI18next: { type: '3rdParty', init: () => {} }
}))

jest.mock('../../../api/services/blackboard.service', () => ({
  blackboardService: {
    getBoard: jest.fn(),
    saveBoard: jest.fn(),
    clearBoard: jest.fn(),
    listBoards: jest.fn(),
    createBoard: jest.fn()
  }
}))

// The toolbar is irrelevant to these fixes and pulls in `useReactFlow`; stub it out.
jest.mock('../BlackboardToolbar', () => () => null)

// Captures the props ReactFlow was last rendered with, so tests can invoke the
// canvas callbacks (`onMoveEnd`) that schedule an autosave.
let mockFlowProps = null

jest.mock('@xyflow/react', () => {
  const ReactMod = require('react')
  return {
    __esModule: true,
    ReactFlow: (props) => {
      mockFlowProps = props
      return ReactMod.createElement('div', { 'data-testid': 'react-flow' }, props.children)
    },
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    BackgroundVariant: { Dots: 'dots' },
    // The real hooks return [state, setState, onChange] — all three are destructured.
    useNodesState: (initial) => {
      const [state, setState] = ReactMod.useState(initial)
      return [state, setState, () => {}]
    },
    useEdgesState: (initial) => {
      const [state, setState] = ReactMod.useState(initial)
      return [state, setState, () => {}]
    },
    addEdge: (params, eds) => [...eds, params],
    ReactFlowProvider: (props) => props.children,
    useReactFlow: () => ({}),
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' }
  }
})

const { blackboardService } = require('../../../api/services/blackboard.service')
const { BlackboardCanvas } = require('../BlackboardModal')

const EMPTY_BOARD = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }

const renderCanvas = (activeBoardId) =>
  render(<BlackboardCanvas goals={[]} priorities={[]} tasks={[]} activeBoardId={activeBoardId} currentBoardName='Board' tier='pro' />)

// Drains the microtask queue (service promises + their .finally) without touching
// the faked timers that drive the 1.5s autosave debounce.
const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('BlackboardCanvas autosave + error state', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockFlowProps = null
    blackboardService.getBoard.mockReset()
    blackboardService.saveBoard.mockReset()
    blackboardService.getBoard.mockResolvedValue(EMPTY_BOARD)
    blackboardService.saveBoard.mockResolvedValue({})
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // F12
  it('flushes the save with the live board id after switching boards inside the debounce window', async () => {
    const { rerender } = renderCanvas('board-A')
    await flushPromises()

    // Schedule a save while board A is still the active board.
    act(() => {
      mockFlowProps.onMoveEnd(null, { x: 10, y: 20, zoom: 1 })
    })

    // Switch to board B before the 1.5s debounce elapses.
    rerender(<BlackboardCanvas goals={[]} priorities={[]} tasks={[]} activeBoardId='board-B' currentBoardName='Board' tier='pro' />)
    await flushPromises()

    act(() => {
      jest.advanceTimersByTime(1500)
    })

    expect(blackboardService.saveBoard).toHaveBeenCalledTimes(1)
    expect(blackboardService.saveBoard.mock.calls[0][0]).toBe('board-B')
  })

  // F13
  it('flushes a pending save on unmount instead of dropping it', async () => {
    const { unmount } = renderCanvas('board-A')
    await flushPromises()

    act(() => {
      mockFlowProps.onMoveEnd(null, { x: 5, y: 5, zoom: 2 })
    })

    // Close the modal before the debounce fires — the edit must NOT be discarded.
    act(() => {
      unmount()
    })

    expect(blackboardService.saveBoard).toHaveBeenCalledTimes(1)
    expect(blackboardService.saveBoard.mock.calls[0][0]).toBe('board-A')
    expect(blackboardService.saveBoard.mock.calls[0][1].viewport).toEqual({ x: 5, y: 5, zoom: 2 })
  })

  it('does not save on unmount when no edit was pending', async () => {
    const { unmount } = renderCanvas('board-A')
    await flushPromises()

    act(() => {
      unmount()
    })

    expect(blackboardService.saveBoard).not.toHaveBeenCalled()
  })

  // F2
  it('shows an error state with retry when the board fails to load', async () => {
    blackboardService.getBoard.mockRejectedValueOnce(new Error('403 Forbidden'))

    renderCanvas('board-A')
    await flushPromises()

    expect(screen.getByText('blackboard.canvasError.message')).toBeInTheDocument()
    expect(screen.queryByTestId('react-flow')).not.toBeInTheDocument()

    const retry = screen.getByText('blackboard.canvasError.retry')
    expect(blackboardService.getBoard).toHaveBeenCalledTimes(1)

    blackboardService.getBoard.mockResolvedValueOnce(EMPTY_BOARD)
    fireEvent.click(retry)
    await flushPromises()

    expect(blackboardService.getBoard).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('blackboard.canvasError.message')).not.toBeInTheDocument()
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })
})
