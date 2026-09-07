/**
 * ONB-023 / ADR-024 — Home's post-activation next steps.
 *
 * The claims a plausible implementation gets wrong:
 *
 *   1. visibility is the server's `show_next_steps`, and it is the complement
 *      of `show_reentry` — the two Home surfaces may never both render;
 *   2. dismissal is a *request*, so it follows the account rather than the
 *      device, and it is applied optimistically because a failed one costs the
 *      user nothing but a panel that returns;
 *   3. FR-070 — a done row stops being an invitation, and FR-073 — a panel with
 *      nothing left to suggest retires itself without a dismissal;
 *   4. FR-075 — an in-flight read puts nothing on Home at all.
 *
 * The real `useOnboardingJourney` runs here, mocked only at the service
 * boundary, so the mapping from response body to what the user sees is
 * exercised rather than assumed. It is reached through `OnboardingSurfaces`,
 * which owns that one read for both Home surfaces (ONB-023); the panel takes
 * the snapshot as a prop and would be handed nothing if rendered bare. `useNextSteps` is mocked: its own signal
 * resolution is pinned in `hooks/useNextSteps.test.js`, and re-deriving it
 * through three services here would test that file twice and this one not at
 * all.
 */
jest.mock('react-i18next', () => {
  const bundle = require('../../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        const raw = resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en', changeLanguage: jest.fn() }
    })
  }
})

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

jest.mock('@nowry/core/api/services/user.service', () => ({
  userService: {
    getOnboardingState: jest.fn(),
    recordOnboardingPoint: jest.fn(),
    postponeOnboarding: jest.fn(),
    dismissOnboardingNextSteps: jest.fn()
  }
}))
jest.mock('@nowry/core/api/services/publicContent.service', () => ({
  publicContentService: { browseOfficialDecks: jest.fn(), forkDeckForOnboarding: jest.fn() }
}))
jest.mock('@nowry/core/api/services/cards.service', () => ({
  cardsService: { generateOnboardingFallback: jest.fn() }
}))

const mockNextSteps = jest.fn()
jest.mock('../../../../hooks/useNextSteps', () => ({
  __esModule: true,
  default: () => mockNextSteps()
}))

import React from 'react'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'

import OnboardingSurfaces from '../OnboardingSurfaces'
import { userService } from '@nowry/core/api/services/user.service'
import en from '../../../../locales/en/translation.json'

const copy = en.home.nextSteps

/** The server's own verdict — the only thing this component may read. */
const journey = (overrides = {}) => ({
  status: 'activated',
  last_meaningful_point: 'first_deck',
  postponed_at: null,
  activated_at: '2026-09-01T10:00:00Z',
  next_steps_dismissed_at: null,
  updated_at: '2026-09-01T10:00:00Z',
  show_reentry: false,
  show_next_steps: true,
  resume_screen: null,
  ...overrides
})

const steps = (done = {}) => ({
  steps: [
    { id: 'study', i18nKey: 'study', to: '/study', Icon: () => null, done: done.study === true },
    { id: 'book', i18nKey: 'book', to: '/books', Icon: () => null, done: done.book === true },
    { id: 'plan', i18nKey: 'plan', to: '/annual-planning', Icon: () => null, done: done.plan === true }
  ],
  resolved: true,
  allDone: done.study === true && done.book === true && done.plan === true
})

const settleRead = () =>
  act(async () => {
    await Promise.resolve()
  })

beforeEach(() => {
  jest.clearAllMocks()
  mockNextSteps.mockReturnValue(steps())
  userService.dismissOnboardingNextSteps.mockResolvedValue(
    journey({ next_steps_dismissed_at: '2026-09-07T00:00:00Z', show_next_steps: false })
  )
})

describe('visibility is the server’s decision', () => {
  it('offers the panel to an activated, undismissed user', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())

    render(<OnboardingSurfaces />)

    expect(await screen.findByText(copy.title)).toBeInTheDocument()
    expect(screen.getByText(copy.items.study.title)).toBeInTheDocument()
    expect(screen.getByText(copy.items.book.title)).toBeInTheDocument()
    expect(screen.getByText(copy.items.plan.title)).toBeInTheDocument()
  })

  it('stays hidden for an incomplete journey — the re-entry card owns that user', async () => {
    userService.getOnboardingState.mockResolvedValue(
      journey({ status: 'incomplete', activated_at: null, show_reentry: true, show_next_steps: false, resume_screen: 'welcome' })
    )

    render(<OnboardingSurfaces />)

    // The complement, asserted from both ends: the other surface is offered and
    // this one is absent. FR-074 is the whole point of the pairing.
    expect(await screen.findByText(en.home.onboardingReentry.title)).toBeInTheDocument()
    expect(screen.queryByText(copy.title)).toBeNull()
    expect(screen.queryByTestId('next-step-study')).toBeNull()
  })

  it('stays hidden once the server holds a dismissal, on this device or any other', async () => {
    userService.getOnboardingState.mockResolvedValue(journey({ next_steps_dismissed_at: '2026-09-05T00:00:00Z', show_next_steps: false }))

    const { container } = render(<OnboardingSurfaces />)
    await settleRead()

    expect(container).toBeEmptyDOMElement()
  })

  it('puts nothing on Home while the read is in flight (FR-075)', () => {
    userService.getOnboardingState.mockReturnValue(new Promise(() => {}))

    const { container } = render(<OnboardingSurfaces />)

    expect(container).toBeEmptyDOMElement()
  })

  it('puts nothing on Home when the read fails — an unasked-for suggestion is not worth an error', async () => {
    userService.getOnboardingState.mockRejectedValue(new Error('offline'))

    render(<OnboardingSurfaces />)
    await settleRead()

    // The re-entry card owns the read-failure row (FR-049); this panel adds no
    // second error beside it.
    expect(screen.queryByText(copy.title)).toBeNull()
    expect(screen.queryByTestId('next-step-study')).toBeNull()
  })
})

describe('a row is a destination', () => {
  it('opens the route the row names', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())
    render(<OnboardingSurfaces />)
    await screen.findByText(copy.title)

    fireEvent.click(screen.getByRole('button', { name: copy.openLabel.replace('{{title}}', copy.items.book.title) }))

    expect(mockNavigate).toHaveBeenCalledWith('/books')
  })

  it('stops inviting a row the data says is done (FR-070)', async () => {
    mockNextSteps.mockReturnValue(steps({ study: true }))
    userService.getOnboardingState.mockResolvedValue(journey())

    render(<OnboardingSurfaces />)
    await screen.findByText(copy.title)

    // Still listed, so progress stays visible — but no longer a control.
    expect(screen.getByText(copy.items.study.title)).toBeInTheDocument()
    expect(screen.getByTestId('next-step-study')).toHaveAttribute('data-done', 'true')
    expect(screen.queryByRole('button', { name: copy.openLabel.replace('{{title}}', copy.items.study.title) })).toBeNull()
    // And its prompt is gone: a finished row is a record, not a pitch.
    expect(screen.queryByText(copy.items.study.description)).toBeNull()
  })

  it('retires itself once every row is done, without a dismissal (FR-073)', async () => {
    mockNextSteps.mockReturnValue(steps({ study: true, book: true, plan: true }))
    userService.getOnboardingState.mockResolvedValue(journey())

    const { container } = render(<OnboardingSurfaces />)
    await settleRead()

    expect(container).toBeEmptyDOMElement()
    expect(userService.dismissOnboardingNextSteps).not.toHaveBeenCalled()
  })
})

describe('dismissal follows the account, not the device', () => {
  it('hides the panel and asks the server to remember it', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())
    render(<OnboardingSurfaces />)
    await screen.findByText(copy.title)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: copy.dismiss }))
    })

    expect(screen.queryByText(copy.title)).toBeNull()
    expect(userService.dismissOnboardingNextSteps).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(copy.dismissed)
  })

  it('writes no local storage — the server holds the flag (ADR-024)', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
    userService.getOnboardingState.mockResolvedValue(journey())
    render(<OnboardingSurfaces />)
    await screen.findByText(copy.title)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: copy.dismiss }))
    })

    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('keeps the panel hidden even when the dismissal request fails', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())
    userService.dismissOnboardingNextSteps.mockRejectedValue(new Error('offline'))
    render(<OnboardingSurfaces />)
    await screen.findByText(copy.title)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: copy.dismiss }))
    })

    // Optimistic on purpose: the cost of a failure is a panel that comes back
    // next load, which is not worth an error row on somebody's Home.
    await waitFor(() => expect(screen.queryByText(copy.title)).toBeNull())
  })
})
