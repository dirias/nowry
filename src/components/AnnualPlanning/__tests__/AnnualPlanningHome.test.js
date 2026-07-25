/**
 * Phase 26 Plan 04 — AnnualPlanningHome tests (RTN-03, D-07, D-08).
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { apiCache } from '../../../api/utils/cache'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}))

const mockGetDailyRoutine = jest.fn()

jest.mock('../../../api/services', () => ({
  annualPlanningService: {
    getDailyRoutine: (...args) => mockGetDailyRoutine(...args),
    updateAnnualPlan: jest.fn(),
    createAnnualPlan: jest.fn()
  }
}))

// Mocked hook return value must be a stable object reference — a fresh literal
// per call would give hookAreas/hookGoals/etc. a new array identity on every
// render, which re-triggers AnnualPlanningHome.js's metrics useEffect
// (dependency array includes hookAreas/hookGoals/...) and hangs the test in
// an infinite re-render loop (same pitfall documented in Plan 26-02).
const mockAnnualPlanState = {
  plan: { _id: 'plan1', year: 2026, title: 'My Plan' },
  focusAreas: [],
  goals: [],
  priorities: [],
  quarterReports: [],
  loading: false,
  error: null,
  reload: jest.fn()
}

jest.mock('../../../hooks/useAnnualPlan', () => ({
  __esModule: true,
  default: () => mockAnnualPlanState
}))

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-user' } })
}))
jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ tier: 'free' })
}))
jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() })
}))
jest.mock('../../../api/services/goalAI.service', () => ({
  analyzeGoals: jest.fn()
}))

jest.mock('../PriorityDialog', () => () => null)
jest.mock('../PriorityList', () => () => null)
jest.mock('../CloseQuarterModal', () => () => null)
jest.mock('../GoalAIPanel', () => () => null)
jest.mock('../AnnualPlanningTabBar', () => () => null)

const AnnualPlanningHome = require('../AnnualPlanningHome').default

const renderHome = () =>
  render(
    <MemoryRouter>
      <AnnualPlanningHome />
    </MemoryRouter>
  )

beforeEach(() => {
  jest.clearAllMocks()
  // apiCache is a module-level singleton shared across tests/files — the 2-minute
  // 'dailyRoutine' TTL would otherwise serve a stale response from a prior test.
  apiCache.clear()
})

describe('RTN-03: hub tile renders with accurate count', () => {
  it('Test 1: shows completedToday / total once getDailyRoutine resolves', async () => {
    mockGetDailyRoutine.mockResolvedValue({
      morning_routine: [{ id: 'a' }, { id: 'b' }],
      afternoon_routine: [{ id: 'c' }],
      evening_routine: [],
      daily_completions: { [new Date().toISOString().slice(0, 10)]: ['a'] }
    })
    renderHome()
    await waitFor(() => expect(screen.getByText('annualPlanning.home.routineCompletion')).toBeInTheDocument())
    // Use the normalized direct-text content testing-library provides (own text nodes only),
    // not node.textContent, which would also pick up the nested routineCompletion label span.
    expect(screen.getByText((content) => content === '1 / 3')).toBeInTheDocument()
  })
})

describe('D-07: tile hidden when Y=0', () => {
  it('Test 2: renders no tile, no separator, when routine has zero items', async () => {
    mockGetDailyRoutine.mockResolvedValue({
      morning_routine: [],
      afternoon_routine: [],
      evening_routine: [],
      daily_completions: {}
    })
    renderHome()
    await waitFor(() => expect(mockGetDailyRoutine).toHaveBeenCalled())
    expect(screen.queryByText('annualPlanning.home.routineCompletion')).not.toBeInTheDocument()
  })
})

describe('D-08: tile is clickable', () => {
  it('Test 3: tile links to /annual-planning/daily-routine', async () => {
    mockGetDailyRoutine.mockResolvedValue({
      morning_routine: [{ id: 'a' }],
      afternoon_routine: [],
      evening_routine: [],
      daily_completions: {}
    })
    renderHome()
    await waitFor(() => expect(screen.getByText('annualPlanning.home.routineCompletion')).toBeInTheDocument())
    const link = screen.getByText('annualPlanning.home.routineCompletion').closest('a')
    expect(link).toHaveAttribute('href', '/annual-planning/daily-routine')
  })
})
