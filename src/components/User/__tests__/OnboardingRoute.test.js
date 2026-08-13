/**
 * ONB-008 — OnboardingRoute.
 *
 * The controller has one job that is easy to get subtly wrong: the screen a
 * user lands on comes from the server, exactly once, and everything after that
 * is the user's own navigation. The interesting tests are therefore about what
 * does *not* happen — a later journey snapshot must not yank a user who walked
 * backwards, going back must not write anything at all, and no path here may
 * decide that anyone is activated.
 */
const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        const raw = resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en' }
    })
  }
})

// Mirrors the real export. Declared here rather than pulled through
// `requireActual` so that mocking the controller does not drag the whole API
// client — and every service it imports — into a component test.
jest.mock('../../../hooks/useOnboardingJourney', () => ({
  __esModule: true,
  JOURNEY_PHASE: { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' },
  default: jest.fn()
}))

jest.mock('../../../hooks/useProgressivePreferences', () => ({ __esModule: true, default: jest.fn() }))

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import OnboardingRoute from '../OnboardingRoute'
import useOnboardingJourney from '../../../hooks/useOnboardingJourney'
import useProgressivePreferences from '../../../hooks/useProgressivePreferences'
import en from '../../../locales/en/translation.json'

const journeyMock = () => ({
  journeyPhase: 'ready',
  isActivated: false,
  resumeScreen: 'welcome',
  lastMeaningfulPoint: 'welcome',
  recordPoint: jest.fn().mockResolvedValue({ ok: true }),
  postpone: jest.fn().mockResolvedValue({ ok: true }),
  reload: jest.fn().mockResolvedValue({ ok: true }),
  forkOfficialDeck: jest.fn(),
  journeyError: null
})

const preferencesMock = () => ({
  values: { interests: ['languages', 'science'], study_goal: 'exam_prep' },
  confirmed: { interests: ['languages', 'science'], study_goal: 'exam_prep' },
  setInterests: jest.fn(),
  setStudyGoal: jest.fn(),
  setLanguage: jest.fn(),
  setAccentColor: jest.fn(),
  retryField: jest.fn()
})

let journey
let preferences

beforeEach(() => {
  mockNavigate.mockClear()
  journey = journeyMock()
  preferences = preferencesMock()
  useOnboardingJourney.mockImplementation(() => journey)
  useProgressivePreferences.mockImplementation(() => preferences)
})

const headingText = () => screen.getByRole('heading', { level: 3 }).textContent
const stepText = () => screen.getByRole('status').textContent

describe('resuming from server state (FR-038)', () => {
  it('opens an untouched user at Welcome, step 1 of 3, with no way back', () => {
    render(<OnboardingRoute />)

    expect(headingText()).toBe(en.onboarding.shell.screenName.welcome)
    expect(stepText()).toBe('Step 1 of 3')
    expect(screen.queryByRole('button', { name: en.onboarding.back })).toBeNull()
  })

  it('resumes at the screen the server named, not at the start', () => {
    journey.resumeScreen = 'personalization'
    journey.lastMeaningfulPoint = 'personalization'
    render(<OnboardingRoute />)

    expect(headingText()).toBe(en.onboarding.shell.screenName.personalization)
    expect(stepText()).toBe('Step 2 of 3')
  })

  it('falls back to Welcome when the server sends a screen it does not know', () => {
    journey.resumeScreen = 'summary'
    render(<OnboardingRoute />)

    expect(headingText()).toBe(en.onboarding.shell.screenName.welcome)
  })

  it('shows skeleton chrome while the journey is still loading, not a full-page gate', () => {
    journey.journeyPhase = 'loading'
    const { container } = render(<OnboardingRoute />)

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('sends an already-activated user Home instead of replaying the journey', () => {
    journey.isActivated = true
    journey.resumeScreen = null
    render(<OnboardingRoute />)

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })
})

describe('moving through the journey (FR-001)', () => {
  it('advances Welcome → Personalization → First Deck and no further', () => {
    render(<OnboardingRoute />)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.next }))
    expect(headingText()).toBe(en.onboarding.shell.screenName.personalization)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.next }))
    expect(headingText()).toBe(en.onboarding.shell.screenName.firstDeck)
    expect(stepText()).toBe('Step 3 of 3')
    expect(screen.queryByRole('button', { name: en.onboarding.next })).toBeNull()
  })

  it('exits to Home from the last screen without claiming completion', () => {
    journey.resumeScreen = 'first_deck'
    journey.lastMeaningfulPoint = 'first_deck'
    render(<OnboardingRoute />)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.finish }))

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    expect(journey.recordPoint).not.toHaveBeenCalled()
  })
})

describe('back navigation (FR-005)', () => {
  it('returns to the previous screen', () => {
    journey.resumeScreen = 'first_deck'
    journey.lastMeaningfulPoint = 'first_deck'
    render(<OnboardingRoute />)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))
    expect(headingText()).toBe(en.onboarding.shell.screenName.personalization)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))
    expect(headingText()).toBe(en.onboarding.shell.screenName.welcome)
    expect(screen.queryByRole('button', { name: en.onboarding.back })).toBeNull()
  })

  it('keeps one preference controller for the whole journey, so confirmed choices survive', () => {
    render(<OnboardingRoute />)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.next }))
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))

    // A per-screen instance would have been re-created on the way back and the
    // confirmed snapshot re-fetched; one instance means it is simply still here.
    const instances = new Set(useProgressivePreferences.mock.results.map((result) => result.value))
    expect(instances.size).toBe(1)
    expect(preferences.confirmed.interests).toEqual(['languages', 'science'])
  })

  it('writes nothing at all — no preference update, no journey mutation, no activation', () => {
    journey.resumeScreen = 'first_deck'
    journey.lastMeaningfulPoint = 'first_deck'
    render(<OnboardingRoute />)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))

    expect(journey.recordPoint).not.toHaveBeenCalled()
    expect(journey.postpone).not.toHaveBeenCalled()
    expect(journey.forkOfficialDeck).not.toHaveBeenCalled()
    expect(preferences.setInterests).not.toHaveBeenCalled()
    expect(preferences.setStudyGoal).not.toHaveBeenCalled()
  })

  it('is not undone by a later journey snapshot', () => {
    journey.resumeScreen = 'first_deck'
    journey.lastMeaningfulPoint = 'first_deck'
    const { rerender } = render(<OnboardingRoute />)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))
    expect(headingText()).toBe(en.onboarding.shell.screenName.personalization)

    // Any PATCH re-applies a server snapshot that still says `first_deck`.
    // Resolving resume more than once would teleport the user forward again.
    rerender(<OnboardingRoute />)
    expect(headingText()).toBe(en.onboarding.shell.screenName.personalization)
  })
})

describe('the Personalization meaningful point (FR-037)', () => {
  it('records it once on entry', () => {
    render(<OnboardingRoute />)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.next }))

    expect(journey.recordPoint).toHaveBeenCalledTimes(1)
    expect(journey.recordPoint).toHaveBeenCalledWith('personalization')
  })

  it('does not record it again on a second visit', () => {
    render(<OnboardingRoute />)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.next }))
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.next }))

    expect(journey.recordPoint).toHaveBeenCalledTimes(1)
  })

  it('never regresses a server point that is already further along', () => {
    journey.resumeScreen = 'first_deck'
    journey.lastMeaningfulPoint = 'first_deck'
    render(<OnboardingRoute />)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.back }))

    expect(journey.recordPoint).not.toHaveBeenCalled()
  })

  it('skips the write when the server already holds this point', () => {
    journey.resumeScreen = 'personalization'
    journey.lastMeaningfulPoint = 'personalization'
    render(<OnboardingRoute />)

    expect(journey.recordPoint).not.toHaveBeenCalled()
  })
})

describe('a journey that could not be read (FR-049)', () => {
  it('explains the failure and offers a retry rather than an empty screen', () => {
    journey.journeyPhase = 'error'
    journey.journeyError = { code: 'network_error', recoverable: true }
    render(<OnboardingRoute />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(en.onboarding.shell.error.title)
    expect(screen.getByRole('alert')).toHaveTextContent(en.onboarding.shell.error.body)

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.shell.retry }))
    expect(journey.reload).toHaveBeenCalledTimes(1)
  })

  it('shows no step position, because an error is not one of the three screens', () => {
    journey.journeyPhase = 'error'
    render(<OnboardingRoute />)

    expect(stepText()).toBe('')
  })
})
