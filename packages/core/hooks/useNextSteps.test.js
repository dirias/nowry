/**
 * useNextSteps — ONB-023 / ADR-024. What an activated user has already done.
 *
 * The claims worth pinning are the ones a plausible implementation gets wrong:
 *
 *   1. FR-071 — a signal that is loading, failed, or shaped unexpectedly must
 *      leave its row *available*, never ticked. Defaulting the other way ticks
 *      boxes on no evidence and, worse, lets `allDone` retire the panel for a
 *      user who never saw a working row;
 *   2. `allDone` requires every signal resolved, not just every resolved signal
 *      done;
 *   3. FR-069 — every row carries a route.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import useNextSteps, { NEXT_STEP_DEFINITIONS } from './useNextSteps'

const mockStatistics = jest.fn()
jest.mock('./useStatistics', () => ({ useStatistics: () => mockStatistics() }))
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const mockGetBooks = jest.fn()
const mockGetGoals = jest.fn()
jest.mock('../api/services', () => ({
  booksService: { getAll: (...args) => mockGetBooks(...args) },
  annualPlanningService: { getGoals: (...args) => mockGetGoals(...args) }
}))

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return Wrapper
}

const stats = (reviewed) => ({ statistics: { summary: { reviewed_cards: reviewed } }, loading: false })

/** Every row keyed by id, for assertions that do not care about order. */
const byId = (steps) => Object.fromEntries(steps.map((step) => [step.id, step]))

beforeEach(() => {
  jest.clearAllMocks()
  mockStatistics.mockReturnValue(stats(0))
  mockGetBooks.mockResolvedValue([])
  mockGetGoals.mockResolvedValue([])
})

const renderNextSteps = () => renderHook(() => useNextSteps(), { wrapper: makeWrapper() })

it('every row names a route (FR-069)', () => {
  expect(NEXT_STEP_DEFINITIONS.length).toBeLessThanOrEqual(4)
  NEXT_STEP_DEFINITIONS.forEach((definition) => {
    expect(definition.to).toMatch(/^\//)
    // An icon is NAMED here, never returned as a component (MOB-003B):
    // this module is bound for @nowry/core, and each client draws its own.
    expect(typeof definition.iconKey).toBe('string')
    expect(definition.iconKey).not.toBe('')
  })
})

it('marks a row done only when its signal counts at least one', async () => {
  mockStatistics.mockReturnValue(stats(12))
  mockGetBooks.mockResolvedValue([{ id: 'b1' }])
  mockGetGoals.mockResolvedValue([])

  const { result } = renderNextSteps()
  await waitFor(() => expect(result.current.resolved).toBe(true))

  const steps = byId(result.current.steps)
  expect(steps.study.done).toBe(true)
  expect(steps.book.done).toBe(true)
  expect(steps.plan.done).toBe(false)
  expect(result.current.allDone).toBe(false)
})

it('retires the panel only when every row is done', async () => {
  mockStatistics.mockReturnValue(stats(3))
  mockGetBooks.mockResolvedValue([{ id: 'b1' }])
  mockGetGoals.mockResolvedValue([{ id: 'g1' }])

  const { result } = renderNextSteps()

  await waitFor(() => expect(result.current.allDone).toBe(true))
})

it('leaves a row available while its signal is still loading (FR-071)', () => {
  mockStatistics.mockReturnValue({ statistics: null, loading: true })

  const { result } = renderNextSteps()

  expect(result.current.steps.every((step) => step.done === false)).toBe(true)
  expect(result.current.resolved).toBe(false)
  expect(result.current.allDone).toBe(false)
})

it('leaves a row available when its signal fails, and never claims it done', async () => {
  mockStatistics.mockReturnValue(stats(9))
  mockGetBooks.mockRejectedValue(new Error('network down'))
  mockGetGoals.mockResolvedValue([{ id: 'g1' }])

  const { result } = renderNextSteps()
  await waitFor(() => expect(byId(result.current.steps).plan.done).toBe(true))

  expect(byId(result.current.steps).book.done).toBe(false)
  // One dead signal must not be allowed to retire the whole panel.
  expect(result.current.resolved).toBe(false)
  expect(result.current.allDone).toBe(false)
})

it('treats a payload that is not a list as no answer rather than as zero', async () => {
  mockStatistics.mockReturnValue(stats(1))
  mockGetBooks.mockResolvedValue({ unexpected: 'shape' })
  mockGetGoals.mockResolvedValue([{ id: 'g1' }])

  const { result } = renderNextSteps()
  await waitFor(() => expect(byId(result.current.steps).study.done).toBe(true))

  expect(byId(result.current.steps).book.done).toBe(false)
  expect(result.current.resolved).toBe(false)
})

it('reads a paginated list through its items array', async () => {
  mockGetBooks.mockResolvedValue({ items: [{ id: 'b1' }, { id: 'b2' }] })

  const { result } = renderNextSteps()
  await waitFor(() => expect(byId(result.current.steps).book.done).toBe(true))
})

it('counts a review, not a card the user merely owns', async () => {
  // A forked deck gives the user cards immediately; only `reviewed_cards`
  // separates "has a deck" from "has studied".
  mockStatistics.mockReturnValue({ statistics: { summary: { total_cards: 40, reviewed_cards: 0 } }, loading: false })

  const { result } = renderNextSteps()
  await waitFor(() => expect(result.current.resolved).toBe(true))

  expect(byId(result.current.steps).study.done).toBe(false)
})
