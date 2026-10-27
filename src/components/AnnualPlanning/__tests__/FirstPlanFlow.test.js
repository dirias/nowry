/**
 * The first annual plan, end to end over the real query cache (QA-012, QA-013).
 *
 * A new account had no plan, so `['annualPlan', user, year]` held the "no plan"
 * answer. Creating the plan did not invalidate it, so the setup wizard read a
 * null plan, Finalize returned early and nothing was saved (QA-012). Once that
 * was fixed, Finalize navigated before the refetch landed, the layout read the
 * plan with no areas and redirected straight back to setup (QA-013).
 *
 * Everything between the screens and HTTP is real here — the services, the
 * hook, the shared queryClient — and the API is an in-memory fake, because
 * both faults lived in how those layers hand the cache to each other.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { queryClient } from '@nowry/core/api/queryClient'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts?.returnObjects ? [] : key),
    i18n: { language: 'en' }
  })
}))

// The fake API. Plain functions, not jest.fn: CRA's resetMocks would strip them.
const mockServer = { plan: null, areas: [], posts: [] }
const notFound = () => Promise.reject(Object.assign(new Error('404'), { response: { status: 404 } }))
jest.mock('@nowry/core/api/client', () => ({
  apiClient: {
    get: (url) => {
      if (url === '/annual-plan/full') {
        // A read takes a moment, as it does over a network: an instant answer
        // would hide the navigate-before-refetch race of QA-013.
        const answer = mockServer.plan
          ? {
              data: { plan: mockServer.plan, focus_areas: mockServer.areas, goals: [], activities: [], priorities: [], quarter_reports: [] }
            }
          : null
        return new Promise((resolve) => setTimeout(resolve, 30)).then(() => answer || notFound())
      }
      return Promise.resolve({ data: [] })
    },
    post: (url, body) => {
      mockServer.posts.push(url)
      if (url === '/annual-plan') {
        mockServer.plan = { _id: 'plan-1', ...body }
        return Promise.resolve({ data: mockServer.plan })
      }
      if (url === '/annual-plan/focus-areas') {
        const area = { _id: `area-${mockServer.areas.length + 1}`, ...body }
        mockServer.areas = [...mockServer.areas, area]
        return Promise.resolve({ data: area })
      }
      return Promise.resolve({ data: {} })
    },
    put: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({ data: {} })
  }
}))

jest.mock('@nowry/core/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'new-user', uid: 'new-user' } }) }))
jest.mock('@nowry/core/hooks/useDailyRoutine', () => ({
  useDailyRoutine: () => ({ routine: null, loading: false, error: null, invalidate: () => {}, refetch: () => {} })
}))
jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'free' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: () => {} }) }))
jest.mock('../../../context/NotificationContext', () => ({ useNotification: () => ({ showNotification: () => {} }) }))
jest.mock('@nowry/core/api/services/goalAI.service', () => ({ analyzeGoals: () => Promise.resolve(null) }))
jest.mock('../CloseQuarterModal', () => () => null)
jest.mock('../GoalAIPanel', () => () => null)

const AnnualPlanningLayout = require('../AnnualPlanningLayout').default
const FocusAreaSetup = require('../FocusAreaSetup').default

const Where = () => <span data-testid='where'>{useLocation().pathname}</span>

const renderApp = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/annual-planning']}>
        <Routes>
          <Route path='/annual-planning' element={<AnnualPlanningLayout />}>
            <Route index element={<span>plan home</span>} />
          </Route>
          <Route path='/annual-planning/setup' element={<FocusAreaSetup />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>
  )

const SETUP = 'annualPlanning.focusArea.setup'

beforeEach(() => {
  queryClient.clear()
  mockServer.plan = null
  mockServer.areas = []
  mockServer.posts = []
})

it('saves the first plan', async () => {
  renderApp()

  fireEvent.click(await screen.findByText('annualPlanning.home.createPlan'))
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/annual-planning/setup'))

  fireEvent.click(await screen.findByText(`${SETUP}.buttons.letsStart`))
  for (const [i, name] of ['Health', 'Career', 'Money'].entries()) {
    fireEvent.change(screen.getByPlaceholderText(`${SETUP}.namePlaceholder`), { target: { value: name } })
    fireEvent.click(screen.getByText(i === 2 ? `${SETUP}.buttons.review` : `${SETUP}.buttons.next`))
  }

  const finalize = screen.getByRole('button', { name: `${SETUP}.buttons.finalizePlan` })
  await waitFor(() => expect(finalize).not.toBeDisabled())
  fireEvent.click(finalize)

  await waitFor(() => expect(mockServer.posts.filter((url) => url === '/annual-plan/focus-areas')).toHaveLength(3))
})
