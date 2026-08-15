/**
 * ONB-012 — Home's onboarding re-entry.
 *
 * The tests are the claims a plausible implementation gets wrong:
 *
 *   1. visibility comes from the server's `show_reentry`, never from a local
 *      reading of `postponed_at` or the device clock;
 *   2. dismissing hides the card and writes *nothing* anywhere — no storage, no
 *      request, no journey state;
 *   3. the read never gates Home: in flight it renders nothing at all, and a
 *      recoverable failure is an error with a retry, not an empty result.
 *
 * The real `useOnboardingJourney` runs here, mocked only at the service
 * boundary, so the mapping from the response body to what the user sees is
 * actually exercised rather than assumed.
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

jest.mock('../../../../api/services/user.service', () => ({
  userService: {
    getOnboardingState: jest.fn(),
    recordOnboardingPoint: jest.fn(),
    postponeOnboarding: jest.fn()
  }
}))
jest.mock('../../../../api/services/publicContent.service', () => ({
  publicContentService: { browseOfficialDecks: jest.fn(), forkDeckForOnboarding: jest.fn() }
}))
jest.mock('../../../../api/services/cards.service', () => ({
  cardsService: { generateOnboardingFallback: jest.fn() }
}))

import React from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'

import OnboardingReentry from '../OnboardingReentry'
import { userService } from '../../../../api/services/user.service'
import en from '../../../../locales/en/translation.json'

const copy = en.home.onboardingReentry

/** The server's own verdict — the only thing this component is allowed to read. */
const journey = (overrides = {}) => ({
  status: 'incomplete',
  last_meaningful_point: 'welcome',
  postponed_at: null,
  activated_at: null,
  updated_at: '2026-08-15T10:00:00Z',
  show_reentry: true,
  resume_screen: 'welcome',
  ...overrides
})

const httpError = (status, detail) => {
  const error = new Error('Request failed')
  error.response = { status, data: detail === undefined ? {} : { detail } }
  return error
}

/** Anything at all in the DOM besides the always-mounted live region. */
const renderedCard = () => screen.queryByRole('region')

/**
 * Let the journey read settle. The interesting assertions here are about what
 * is *absent*, so there is no element to await — the resolution has to be
 * flushed inside `act` explicitly instead.
 */
const settleRead = () =>
  act(async () => {
    await Promise.resolve()
  })

beforeEach(() => {
  jest.clearAllMocks()
})

describe('visibility is the server’s decision', () => {
  it('invites the user when the journey is incomplete and show_reentry is true', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())

    render(<OnboardingReentry />)

    expect(await screen.findByText(copy.title)).toBeInTheDocument()
    expect(screen.getByText(copy.body)).toBeInTheDocument()
  })

  it('stays hidden inside the grace period, even with a postponement timestamp present', async () => {
    // The server has already applied the 24-hour rule; a client that re-derived
    // it from `postponed_at` would show the card here. Nothing may.
    userService.getOnboardingState.mockResolvedValue(journey({ postponed_at: '2026-08-15T09:00:00Z', show_reentry: false }))

    const { container } = render(<OnboardingReentry />)

    await settleRead()
    expect(screen.queryByText(copy.title)).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('stays hidden once the journey is activated', async () => {
    userService.getOnboardingState.mockResolvedValue(
      journey({ status: 'activated', activated_at: '2026-08-15T09:00:00Z', show_reentry: false })
    )

    const { container } = render(<OnboardingReentry />)

    await settleRead()
    expect(container).toBeEmptyDOMElement()
  })

  it('refuses a show_reentry that contradicts an activated status', async () => {
    // Defensive: both halves of the rule are asserted locally, so a malformed
    // snapshot cannot invite an activated user back into onboarding.
    userService.getOnboardingState.mockResolvedValue(journey({ status: 'activated', show_reentry: true }))

    const { container } = render(<OnboardingReentry />)

    await settleRead()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('re-entry never opens onboarding by itself', () => {
  it('navigates to /onboarding only when the user presses the action', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())

    render(<OnboardingReentry />)
    await screen.findByText(copy.title)

    expect(mockNavigate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: copy.cta }))
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding')
    // The route resolves the screen from the server; this end names no screen.
    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })
})

describe('dismissal is view state only', () => {
  it('hides the card without writing storage, journey state or a request', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())
    const sessionSpy = jest.spyOn(Storage.prototype, 'setItem')

    render(<OnboardingReentry />)
    await screen.findByText(copy.title)

    fireEvent.click(screen.getByRole('button', { name: copy.dismiss }))

    expect(screen.queryByText(copy.title)).not.toBeInTheDocument()
    expect(sessionSpy).not.toHaveBeenCalled()
    expect(userService.postponeOnboarding).not.toHaveBeenCalled()
    expect(userService.recordOnboardingPoint).not.toHaveBeenCalled()
    // Only the initial read, ever.
    expect(userService.getOnboardingState).toHaveBeenCalledTimes(1)

    sessionSpy.mockRestore()
  })

  it('announces the dismissal and leaves focus somewhere predictable', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())

    render(<OnboardingReentry />)
    await screen.findByText(copy.title)

    fireEvent.click(screen.getByRole('button', { name: copy.dismiss }))

    expect(screen.getByText(copy.dismissed)).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
  })

  it('comes back on the next Home view, because nothing was persisted', async () => {
    userService.getOnboardingState.mockResolvedValue(journey())

    const first = render(<OnboardingReentry />)
    await screen.findByText(copy.title)
    fireEvent.click(screen.getByRole('button', { name: copy.dismiss }))
    first.unmount()

    render(<OnboardingReentry />)
    expect(await screen.findByText(copy.title)).toBeInTheDocument()
  })
})

describe('the read costs Home nothing', () => {
  it('renders nothing at all while the journey read is in flight', () => {
    userService.getOnboardingState.mockReturnValue(new Promise(() => {}))

    const { container } = render(<OnboardingReentry />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('states a recoverable failure as an error with a retry, not as an empty result', async () => {
    userService.getOnboardingState.mockRejectedValueOnce(httpError(503, 'service_unavailable'))

    render(<OnboardingReentry />)

    expect(await screen.findByText(copy.error.title)).toBeInTheDocument()
    // Distinct from the invitation, and never dressed as "nothing to show".
    expect(screen.queryByText(copy.title)).not.toBeInTheDocument()
    expect(renderedCard()).toBeNull()

    userService.getOnboardingState.mockResolvedValueOnce(journey())
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.shell.retry }))

    expect(await screen.findByText(copy.title)).toBeInTheDocument()
    expect(screen.queryByText(copy.error.title)).not.toBeInTheDocument()
  })

  it('says nothing at all when the failure is terminal', async () => {
    userService.getOnboardingState.mockRejectedValue(httpError(403, 'forbidden'))

    const { container } = render(<OnboardingReentry />)

    await settleRead()
    expect(container).toBeEmptyDOMElement()
  })
})
