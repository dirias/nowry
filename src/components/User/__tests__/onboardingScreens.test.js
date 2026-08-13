/**
 * ONB-008 — the journey's screen vocabulary.
 *
 * FR-001 is a three-line requirement and these are the three lines: exactly
 * three screens, always the same order, and a resume value that came from the
 * server rather than from anything the client inferred.
 */
import {
  ONBOARDING_SCREEN,
  ONBOARDING_SCREEN_ORDER,
  TOTAL_ONBOARDING_SCREENS,
  nextScreen,
  normalizeResumeScreen,
  previousScreen,
  screenIndex,
  screenStep
} from '../onboardingScreens'

describe('the three screens (FR-001)', () => {
  it('is exactly Welcome, Personalization and First Deck, in that order', () => {
    expect(ONBOARDING_SCREEN_ORDER).toEqual(['welcome', 'personalization', 'first_deck'])
    expect(TOTAL_ONBOARDING_SCREENS).toBe(3)
  })

  it('uses the API wire values verbatim, so no client-side mapping can drift', () => {
    expect(ONBOARDING_SCREEN).toEqual({
      WELCOME: 'welcome',
      PERSONALIZATION: 'personalization',
      FIRST_DECK: 'first_deck'
    })
  })
})

describe('positions', () => {
  it('numbers the screens one-based for display', () => {
    expect(screenStep('welcome')).toBe(1)
    expect(screenStep('personalization')).toBe(2)
    expect(screenStep('first_deck')).toBe(3)
  })

  it('returns null rather than 0 for a non-screen, so "Step 0 of 3" is unreachable', () => {
    expect(screenStep(null)).toBeNull()
    expect(screenStep('journey-error')).toBeNull()
    expect(screenIndex('journey-error')).toBe(-1)
  })
})

describe('movement within the journey', () => {
  it('advances in order and stops at the end', () => {
    expect(nextScreen('welcome')).toBe('personalization')
    expect(nextScreen('personalization')).toBe('first_deck')
    expect(nextScreen('first_deck')).toBeNull()
  })

  it('goes back in order and stops at the start', () => {
    expect(previousScreen('first_deck')).toBe('personalization')
    expect(previousScreen('personalization')).toBe('welcome')
    expect(previousScreen('welcome')).toBeNull()
  })
})

describe('resuming (FR-038)', () => {
  it('passes a server screen through untouched', () => {
    ONBOARDING_SCREEN_ORDER.forEach((screen) => expect(normalizeResumeScreen(screen)).toBe(screen))
  })

  it('falls back to Welcome for null or an unrecognised value', () => {
    expect(normalizeResumeScreen(null)).toBe('welcome')
    expect(normalizeResumeScreen(undefined)).toBe('welcome')
    expect(normalizeResumeScreen('summary')).toBe('welcome')
  })
})
