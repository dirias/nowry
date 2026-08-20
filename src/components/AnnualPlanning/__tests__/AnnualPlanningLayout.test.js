/**
 * AnnualPlanningLayout tests.
 *
 * Supersedes AnnualPlanningHome.test.js: the routine tile (RTN-03, D-07, D-08) and
 * the plan header moved from AnnualPlanningHome into the layout shell when the four
 * tab routes were collapsed under a single route element. Also covers FE-AP-1's
 * two load-bearing guarantees: exactly one useAnnualPlan call for the whole feature,
 * and quarter scope resolved once and handed to children via outlet context.
 */
import fs from 'fs'
import path from 'path'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom'

// Interpolating stub so assertions can see the values passed to t(), not just the key.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) =>
      opts && typeof opts === 'object'
        ? `${key}(${Object.entries(opts)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')})`
        : key
  })
}))

jest.mock('../../../api/services', () => ({
  annualPlanningService: {
    updateAnnualPlan: jest.fn(),
    createAnnualPlan: jest.fn()
  }
}))

// AnnualPlanningLayout now reads the daily routine through useDailyRoutine()
// (CACHE-007 / ADR-008) rather than apiCache — mocked at the hook boundary like
// useAnnualPlan below, since real useQuery would need a QueryClientProvider this
// test doesn't set up.
let mockRoutineData = null
jest.mock('../../../hooks/useDailyRoutine', () => ({
  useDailyRoutine: () => ({ routine: mockRoutineData, loading: false, error: null, invalidate: jest.fn(), refetch: jest.fn() })
}))

const YEAR = new Date().getFullYear()

// Must be a stable object reference: a fresh literal per call gives the arrays a new
// identity on every render, which re-triggers the metrics useEffect (its dependency
// array includes them) and hangs the test in an infinite re-render loop.
const mockAnnualPlanState = {
  plan: { _id: 'plan1', year: YEAR, title: 'My Plan' },
  focusAreas: [{ _id: 'area1', name: 'Health', progress: 40 }],
  goals: [
    { _id: 'g1', quarter: 1, focus_area_id: 'area1', progress: 100, status: 'completed' },
    { _id: 'g2', quarter: 2, focus_area_id: 'area1', progress: 50, status: 'in_progress' },
    { _id: 'g3', quarter: 2, focus_area_id: 'area1', progress: 0, status: 'not_started' }
  ],
  priorities: [],
  quarterReports: [],
  loading: false,
  error: null,
  reload: jest.fn()
}

// Plain factory rather than a jest.fn: CRA's jest config sets resetMocks, which
// would strip the implementation off a jest.fn between tests.
jest.mock('../../../hooks/useAnnualPlan', () => ({
  __esModule: true,
  default: () => mockAnnualPlanState
}))

// NOTE: real useAuth()-backed hooks (e.g. useDailyRoutine, prior to being mocked
// above) derive their query-key userId from `user.id`, not `user.uid` — kept as
// `id` here to match that convention (see hooks/useDailyRoutine.js).
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-user', uid: 'test-user' } }) }))
jest.mock('../../../hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'free' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))
jest.mock('../../../api/services/goalAI.service', () => ({ analyzeGoals: jest.fn() }))
jest.mock('../CloseQuarterModal', () => () => null)
jest.mock('../GoalAIPanel', () => () => null)

const AnnualPlanningLayout = require('../AnnualPlanningLayout').default

// Probe child: proves the tab gets its data from outlet context, not its own hook call.
const ContextProbe = () => {
  const { quarterGoals, quarter, metrics } = useOutletContext()
  return (
    <div>
      <span data-testid='scope'>{quarter}</span>
      <span data-testid='scoped-count'>{quarterGoals.length}</span>
      <span data-testid='progress'>{metrics.progress}</span>
    </div>
  )
}

const renderLayout = (initialEntry = '/annual-planning') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/annual-planning' element={<AnnualPlanningLayout />}>
          <Route index element={<ContextProbe />} />
          <Route path='goals' element={<ContextProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  jest.clearAllMocks()
  mockRoutineData = null
})

describe('RTN-03 / D-07 / D-08: daily routine chip in the persistent header', () => {
  it('shows completedToday / total once the routine query resolves', async () => {
    mockRoutineData = {
      morning_routine: [{ id: 'a' }, { id: 'b' }],
      afternoon_routine: [{ id: 'c' }],
      evening_routine: [],
      daily_completions: { [new Date().toISOString().slice(0, 10)]: ['a'] }
    }
    renderLayout()
    await waitFor(() => expect(screen.getByText('annualPlanning.header.routineRatio(completed=1,total=3)')).toBeInTheDocument())
  })

  it('renders no chip when the routine has zero items', async () => {
    mockRoutineData = { morning_routine: [], afternoon_routine: [], evening_routine: [], daily_completions: {} }
    renderLayout()
    await screen.findByText('My Plan')
    expect(screen.queryByText(/annualPlanning\.header\.routineRatio/)).not.toBeInTheDocument()
  })

  it('links the chip to /annual-planning/daily-routine', async () => {
    mockRoutineData = {
      morning_routine: [{ id: 'a' }],
      afternoon_routine: [],
      evening_routine: [],
      daily_completions: {}
    }
    renderLayout()
    const label = await screen.findByText(/annualPlanning\.header\.routineRatio/)
    // The chip's link lives in Joy's `action` slot, which renders as an overlay
    // sibling of the label rather than an ancestor of it — so walk up to the chip
    // root and find the anchor there instead of using closest('a').
    const chipRoot = label.closest('[class*="MuiChip-root"]')
    expect(chipRoot.querySelector('a')).toHaveAttribute('href', '/annual-planning/daily-routine')
  })
})

describe('FE-AP-1: one hook call, shared quarter scope', () => {
  beforeEach(() => {
    mockRoutineData = { morning_routine: [], afternoon_routine: [], evening_routine: [], daily_completions: {} }
  })

  it('leaves the layout as the only useAnnualPlan caller among the tab views', () => {
    // Static invariant rather than a render assertion: a tab that re-adds its own
    // hook call would still render fine, it would just quietly reintroduce the
    // duplicate loading/error states this shell exists to remove. Only the three
    // tabs are constrained — the standalone sibling routes (FocusAreaView,
    // AllPrioritiesPage, DailyRoutinePlanner, FocusAreaSetup) have no layout above
    // them and must keep loading their own data.
    const dir = path.join(__dirname, '..')
    // AllPrioritiesPage joined this list in FE-AP-6, when Priorities moved from a
    // bare sibling route to a child of the layout.
    const tabViews = ['OverviewTabView.js', 'GoalsTabView.js', 'ReportsTabView.js', 'AllPrioritiesPage.js']
    tabViews.forEach((file) => {
      expect(fs.readFileSync(path.join(dir, file), 'utf8')).not.toMatch(/from '\.\.\/\.\.\/hooks\/useAnnualPlan'/)
    })
    expect(fs.readFileSync(path.join(dir, 'AnnualPlanningLayout.js'), 'utf8')).toMatch(/from '\.\.\/\.\.\/hooks\/useAnnualPlan'/)
  })

  it('scopes goals and metrics to ?q= before handing them to the child', async () => {
    renderLayout('/annual-planning/goals?q=2')
    await waitFor(() => expect(screen.getByTestId('scope')).toHaveTextContent('2'))
    expect(screen.getByTestId('scoped-count')).toHaveTextContent('2')
    // Q2 goals are 50% and 0% -> 25% average
    expect(screen.getByTestId('progress')).toHaveTextContent('25')
  })

  it('passes the whole year through when ?q=All', async () => {
    renderLayout('/annual-planning/goals?q=All')
    await waitFor(() => expect(screen.getByTestId('scope')).toHaveTextContent('All'))
    expect(screen.getByTestId('scoped-count')).toHaveTextContent('3')
  })

  it('renders the plan title in the header rather than gating the page', async () => {
    renderLayout()
    expect(await screen.findByText('My Plan')).toBeInTheDocument()
  })
})
