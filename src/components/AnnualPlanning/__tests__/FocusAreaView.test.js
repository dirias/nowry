/**
 * Phase 25 Plan 04 — FocusAreaView pure-function tests (GOAL-01, D-02/D-03).
 * Behaviors 1-7: goal-state completed short-circuit + on_track/at_risk/
 * behind thresholds, calculateTimeElapsedPercentage past/future-quarter and
 * yearly full-year handling (Pitfall 3 regression guard).
 *
 * These tests import the module's named exports directly and never render the
 * component — no RTL render(), no DOM assertions. The jest.mock() calls below
 * are still required because importing FocusAreaView executes its module-level
 * imports: the services barrel ('../../api/services') eagerly re-exports every
 * service module and pulls in the real axios client (Jest ESM parse failure —
 * same issue documented in AllPrioritiesPage.test.js / PriorityList.test.js),
 * and AuthContext pulls in firebase + the axios apiClient.
 */

jest.mock('../../../api/services', () => ({
  annualPlanningService: {}
}))
jest.mock('../../../hooks/useAnnualPlan', () => ({
  useAnnualPlan: jest.fn()
}))
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn()
}))
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
  Link: () => null
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}))
// Sibling components imported by FocusAreaView that pull in services/router
// context via their own direct submodule imports (bypassing the barrel mock).
jest.mock('../GoalDialog', () => () => null)
jest.mock('../PriorityDialog', () => () => null)
jest.mock('../PriorityList', () => () => null)
jest.mock('../CloseQuarterModal', () => () => null)
jest.mock('../GoalCard', () => () => null)
jest.mock('../GoalRow', () => () => null)
jest.mock('../../Common/DeleteConfirmationModal', () => () => null)

import { calculateTimeElapsedPercentage, calculateProgress, getCurrentQuarter } from '../FocusAreaView'
import { getGoalState } from '../goalDerivation'

// 2026-07-20 falls in Q3 — getCurrentQuarter() returns 3 for these tests.
const FIXED_NOW = new Date('2026-07-20T12:00:00')

beforeAll(() => {
  jest.useFakeTimers()
})

beforeEach(() => {
  jest.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  jest.useRealTimers()
})

describe('getGoalState (D-02, via goalDerivation)', () => {
  // Behavior 1: completed status short-circuits regardless of progress/time
  test('returns "completed" for a completed goal regardless of low progress', () => {
    expect(getGoalState({ status: 'completed', progress: 10 })).toBe('completed')
  })

  // Behavior 2: progress exactly equal to time-elapsed% → on_track
  test('returns "on_track" when progress equals the time-elapsed percentage', () => {
    const currentQuarter = getCurrentQuarter()
    expect(currentQuarter).toBe(3)
    const elapsed = calculateTimeElapsedPercentage({ type: 'quarterly', quarter: currentQuarter }, currentQuarter)
    const goal = {
      status: 'in_progress',
      type: 'quarterly',
      quarter: currentQuarter,
      milestones: [],
      progress: elapsed
    }
    expect(getGoalState(goal)).toBe('on_track')
  })

  // Behavior 3: progress 10 points below time-elapsed% → at_risk
  test('returns "at_risk" when progress is 10 points behind time elapsed', () => {
    const currentQuarter = getCurrentQuarter()
    const elapsed = calculateTimeElapsedPercentage({ type: 'quarterly', quarter: currentQuarter }, currentQuarter)
    const goal = {
      status: 'in_progress',
      type: 'quarterly',
      quarter: currentQuarter,
      milestones: [],
      progress: elapsed - 10
    }
    expect(getGoalState(goal)).toBe('at_risk')
  })

  // Behavior 4: progress 30 points below time-elapsed% → behind
  test('returns "behind" when progress is 30 points behind time elapsed', () => {
    const currentQuarter = getCurrentQuarter()
    const elapsed = calculateTimeElapsedPercentage({ type: 'quarterly', quarter: currentQuarter }, currentQuarter)
    const goal = {
      status: 'in_progress',
      type: 'quarterly',
      quarter: currentQuarter,
      milestones: [],
      progress: elapsed - 30
    }
    expect(getGoalState(goal)).toBe('behind')
  })
})

describe('calculateTimeElapsedPercentage (D-03)', () => {
  // Behavior 5: a future quarter has not started yet → 0
  test('returns 0 for a quarterly goal in a future quarter', () => {
    const currentQuarter = getCurrentQuarter()
    expect(calculateTimeElapsedPercentage({ type: 'quarterly', quarter: currentQuarter + 1 }, currentQuarter)).toBe(0)
  })

  // Behavior 6: a past quarter has fully elapsed → 100
  test('returns 100 for a quarterly goal in a past quarter', () => {
    const currentQuarter = getCurrentQuarter()
    expect(calculateTimeElapsedPercentage({ type: 'quarterly', quarter: currentQuarter - 1 }, currentQuarter)).toBe(100)
  })

  // Behavior 7 (Pitfall 3 regression guard): a yearly goal in January must be
  // computed against the FULL calendar year — mid-January is ~4% of the year,
  // never artificially near 100% as it would be if measured against Q1 alone.
  test('yearly goal in January returns a low percentage (full-year window)', () => {
    jest.setSystemTime(new Date('2026-01-15T12:00:00'))
    const elapsed = calculateTimeElapsedPercentage({ type: 'yearly' }, 1)
    expect(elapsed).toBeGreaterThanOrEqual(0)
    expect(elapsed).toBeLessThan(15)
  })
})

describe('calculateProgress', () => {
  test('uses milestone completion ratio when milestones exist', () => {
    const goal = {
      progress: 90,
      milestones: [{ completed: true }, { completed: false }, { completed: false }, { completed: false }]
    }
    expect(calculateProgress(goal)).toBe(25)
  })

  test('falls back to the manual progress field without milestones', () => {
    expect(calculateProgress({ progress: 40, milestones: [] })).toBe(40)
    expect(calculateProgress({})).toBe(0)
  })
})
