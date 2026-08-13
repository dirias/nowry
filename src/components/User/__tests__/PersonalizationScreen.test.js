/**
 * ONB-010 — PersonalizationScreen.
 *
 * Four claims carry this screen, and each of them is easy to regress into
 * something that still looks fine:
 *
 *   1. with nothing selected the primary action is an enabled **skip**, not a
 *      disabled "Continue" — A5 and FR-021 turn on exactly that difference;
 *   2. once something is selected, the three ways of being incomplete are told
 *      apart (FR-022), and the zero state is still never an error;
 *   3. First Deck is reached only after the server has confirmed the
 *      preferences *and* accepted the `first_deck` point — drafts do not count;
 *   4. every failure keeps the selection on screen with a retry for the thing
 *      that actually failed.
 *
 * Plus two absences, which are the requirements nobody notices regressing: no
 * separate primary-topic control (FR-019) and no learning-style question
 * (FR-023).
 *
 * The selectors are *not* mocked. Order semantics are the product feature here
 * (FR-018), and mocking the control that owns them would test nothing.
 */
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
      i18n: { language: 'en', changeLanguage: jest.fn() }
    })
  }
})

// Mocked for its constants only: importing the real module drags in the API
// client and every service behind it, for three frozen objects.
jest.mock('../../../hooks/useProgressivePreferences', () => ({
  __esModule: true,
  ACTION_PHASE: { IDLE: 'idle', PENDING: 'pending', SUCCEEDED: 'succeeded', ERROR: 'error' },
  PREFERENCES_PHASE: { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' },
  PREFERENCE_FIELD: { LANGUAGE: 'language', ACCENT_COLOR: 'theme_color', INTERESTS: 'interests', STUDY_GOAL: 'study_goal' },
  default: jest.fn()
}))

import React from 'react'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'

import PersonalizationScreen, { PERSONALIZATION_ISSUE, evaluateSelection } from '../PersonalizationScreen'
import en from '../../../locales/en/translation.json'

const copy = en.onboarding.personalization
const taxonomy = en.taxonomy

const fill = (template, values) => template.replace(/{{(\w+)}}/g, (_, name) => String(values[name]))

const idleField = (overrides = {}) => ({
  phase: 'idle',
  error: null,
  isSaving: false,
  isConfirmed: true,
  justSaved: false,
  canRetry: false,
  ...overrides
})

let journey
let preferences
let onNext
let onBack
let onExit

const buildJourney = (overrides = {}) => ({
  recordPoint: jest.fn().mockResolvedValue({ ok: true }),
  pointState: { phase: 'idle', unsavedPoint: null, error: null },
  ...overrides
})

const buildPreferences = ({ interests = [], studyGoal = null, ...overrides } = {}) => ({
  phase: 'ready',
  values: { language: null, theme_color: null, interests, study_goal: studyGoal },
  // Default to a consistent world: what is on screen is what the server holds.
  confirmed: { language: null, theme_color: null, interests, study_goal: studyGoal, primary_topic: interests[0] ?? null },
  fields: { interests: idleField(), study_goal: idleField() },
  setPreference: jest.fn(),
  retryField: jest.fn(),
  retryUnsaved: jest.fn(() => []),
  reload: jest.fn(),
  ...overrides
})

const shell = { screenKey: 'personalization', stepNumber: 2, totalSteps: 3, onBack: jest.fn() }

const element = () => (
  <PersonalizationScreen shell={shell} journey={journey} preferences={preferences} onNext={onNext} onBack={onBack} onExit={onExit} />
)

const renderScreen = () => render(element())

/**
 * Let the point PATCH's own promise settle. `waitFor` can resolve on its first
 * synchronous check, which leaves the `await` inside the screen's advance
 * handler still parked — and in a browser the failure banner cannot appear
 * before that resolves, so a test clicking retry beforehand is testing a state
 * that does not exist.
 */
const settle = () => act(async () => {})

const primaryAction = () => screen.getByRole('button', { name: new RegExp(`${copy.skip}|${copy.continue}`) })
const topicChip = (label) => screen.getByRole('button', { name: new RegExp(`^${label.replace(/[&]/g, '\\&')}`) })

beforeEach(() => {
  onNext = jest.fn()
  onBack = jest.fn()
  onExit = jest.fn()
  journey = buildJourney()
  preferences = buildPreferences()
})

describe('the zero-selection exit (FR-021, A5)', () => {
  it('offers an enabled skip rather than a disabled continue', () => {
    renderScreen()

    const action = screen.getByRole('button', { name: new RegExp(copy.skip) })
    expect(action).toBeEnabled()
    expect(action).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('button', { name: new RegExp(copy.continue) })).toBeNull()
  })

  it('says where skipping leaves the user, so the action is legible before it is pressed', () => {
    renderScreen()

    expect(screen.getByText(copy.skipHint)).toBeInTheDocument()
  })

  it('exits to Home writing nothing at all — no preference, no journey point', () => {
    renderScreen()

    fireEvent.click(primaryAction())

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(journey.recordPoint).not.toHaveBeenCalled()
    expect(preferences.setPreference).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
    // Nothing about the zero state is presented as a failure.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('becomes a continue action, and drops the skip hint, as soon as anything is selected', () => {
    preferences = buildPreferences({ studyGoal: 'career' })
    renderScreen()

    expect(screen.getByRole('button', { name: new RegExp(copy.continue) })).toBeEnabled()
    expect(screen.queryByRole('button', { name: new RegExp(copy.skip) })).toBeNull()
    expect(screen.queryByText(copy.skipHint)).toBeNull()
  })
})

describe('validation tells the three cases apart (FR-016, FR-022)', () => {
  it('names a missing interest selection when only a goal has been chosen', () => {
    preferences = buildPreferences({ studyGoal: 'career' })
    renderScreen()

    fireEvent.click(primaryAction())

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(copy.validation.missingInterests)
    expect(alert).not.toHaveTextContent(copy.validation.missingGoal)
    expect(journey.recordPoint).not.toHaveBeenCalled()
  })

  it('names a missing goal when only interests have been chosen', () => {
    preferences = buildPreferences({ interests: ['technology'] })
    renderScreen()

    fireEvent.click(primaryAction())

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(copy.validation.missingGoal)
    expect(alert).not.toHaveTextContent(copy.validation.missingInterests)
    expect(journey.recordPoint).not.toHaveBeenCalled()
  })

  it('names the excess, with the numbers, when the server restored more than five', () => {
    const six = ['technology', 'science', 'history', 'music', 'art', 'design']
    preferences = buildPreferences({ interests: six, studyGoal: 'career' })
    renderScreen()

    fireEvent.click(primaryAction())

    expect(screen.getByRole('alert')).toHaveTextContent(fill(copy.validation.tooManyInterests, { count: 6, excess: 1, max: 5 }))
    expect(journey.recordPoint).not.toHaveBeenCalled()
  })

  it('clears once the selection is complete, without a second press', () => {
    preferences = buildPreferences({ interests: ['technology'] })
    const { rerender } = renderScreen()

    fireEvent.click(primaryAction())
    expect(screen.getByRole('alert')).toHaveTextContent(copy.validation.missingGoal)

    preferences = buildPreferences({ interests: ['technology'], studyGoal: 'career' })
    rerender(element())

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('never turns the zero state into an error, even after a failed press', () => {
    preferences = buildPreferences({ interests: ['technology'] })
    const { rerender } = renderScreen()

    fireEvent.click(primaryAction())
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // The user removes their only topic. That is the skip state, not a failure.
    preferences = buildPreferences()
    rerender(element())

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: new RegExp(copy.skip) })).toBeEnabled()
  })

  it('is a pure function of the selection, checked independently of the render', () => {
    expect(evaluateSelection([], 'career')).toBe(PERSONALIZATION_ISSUE.MISSING_INTERESTS)
    expect(evaluateSelection(['a', 'b', 'c', 'd', 'e', 'f'], 'career')).toBe(PERSONALIZATION_ISSUE.TOO_MANY_INTERESTS)
    expect(evaluateSelection(['a'], null)).toBe(PERSONALIZATION_ISSUE.MISSING_GOAL)
    expect(evaluateSelection(['a', 'b'], 'career')).toBeNull()
  })
})

describe('what gates First Deck (FR-037, FR-040)', () => {
  it('records the first_deck point and only then advances', async () => {
    preferences = buildPreferences({ interests: ['technology', 'science'], studyGoal: 'career' })
    renderScreen()

    fireEvent.click(primaryAction())

    await waitFor(() => expect(journey.recordPoint).toHaveBeenCalledWith('first_deck'))
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))
  })

  it('waits for an in-flight save instead of refusing the press, then completes it', async () => {
    preferences = buildPreferences({
      interests: ['technology'],
      studyGoal: 'career',
      fields: { interests: idleField({ phase: 'pending', isSaving: true, isConfirmed: false }), study_goal: idleField() }
    })
    const { rerender } = renderScreen()

    fireEvent.click(primaryAction())

    expect(journey.recordPoint).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()

    // The echo lands.
    preferences = buildPreferences({
      interests: ['technology'],
      studyGoal: 'career',
      fields: { interests: idleField({ phase: 'succeeded', justSaved: true }), study_goal: idleField() },
      setPreference: preferences.setPreference
    })
    rerender(element())

    await waitFor(() => expect(journey.recordPoint).toHaveBeenCalledWith('first_deck'))
    await waitFor(() => expect(onNext).toHaveBeenCalled())
  })

  it('reads the confirmed snapshot, not the visible draft, before it advances', async () => {
    // A visibly complete selection the server has not echoed. Nothing may
    // proceed on it: First Deck browses for the primary topic the *server*
    // derived, and there isn't one yet.
    preferences = buildPreferences({
      interests: ['technology'],
      studyGoal: 'career',
      confirmed: { interests: [], study_goal: null, primary_topic: null }
    })
    renderScreen()

    fireEvent.click(primaryAction())

    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(copy.continue) })).toBeEnabled())
    expect(journey.recordPoint).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('keeps the user here when the point PATCH fails, with the choices intact and a retry', async () => {
    journey = buildJourney({
      recordPoint: jest.fn().mockResolvedValue({ ok: false, error: { code: 'network_error', recoverable: true } }),
      pointState: { phase: 'error', unsavedPoint: 'first_deck', error: { code: 'network_error', recoverable: true } }
    })
    preferences = buildPreferences({ interests: ['technology'], studyGoal: 'career' })
    renderScreen()

    fireEvent.click(primaryAction())
    await waitFor(() => expect(journey.recordPoint).toHaveBeenCalled())
    await settle()

    expect(onNext).not.toHaveBeenCalled()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(copy.advanceError.title)
    expect(alert).toHaveTextContent(en.onboarding.failure.network)
    // The selection never rolls back on a failure.
    expect(topicChip(taxonomy.topics.technology)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: taxonomy.goals.career })).toBeChecked()

    journey.recordPoint.mockClear()
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.welcome.save.retry }))
    await waitFor(() => expect(journey.recordPoint).toHaveBeenCalledWith('first_deck'))
  })

  it('offers no retry for a failure repeating the request cannot fix', () => {
    journey = buildJourney({
      pointState: { phase: 'error', unsavedPoint: 'first_deck', error: { code: 'invalid_action', recoverable: false } }
    })
    preferences = buildPreferences({ interests: ['technology'], studyGoal: 'career' })
    renderScreen()

    expect(screen.getByRole('alert')).not.toHaveTextContent(en.onboarding.welcome.save.retry)
  })

  it('does not claim the route’s own personalization point as its failure', () => {
    journey = buildJourney({
      pointState: { phase: 'error', unsavedPoint: 'personalization', error: { code: 'network_error', recoverable: true } }
    })
    preferences = buildPreferences({ interests: ['technology'], studyGoal: 'career' })
    renderScreen()

    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('a failed preference save (FR-039, FR-049)', () => {
  it('names the field beside the control and offers its own retry', () => {
    preferences = buildPreferences({
      interests: ['technology'],
      studyGoal: 'career',
      fields: {
        interests: idleField({ phase: 'error', isConfirmed: false, canRetry: true, error: { code: 'network_error', recoverable: true } }),
        study_goal: idleField()
      }
    })
    renderScreen()

    expect(screen.getByText(en.onboarding.welcome.save.unsaved)).toBeInTheDocument()
    expect(screen.getByText(en.onboarding.failure.network)).toBeInTheDocument()
    expect(screen.queryByText(en.onboarding.welcome.save.saved)).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: en.onboarding.welcome.save.retry })[0])
    expect(preferences.retryField).toHaveBeenCalledWith('interests')
  })

  it('blocks the advance, keeps the selection, and retries the writes before continuing', async () => {
    preferences = buildPreferences({
      interests: ['technology'],
      studyGoal: 'career',
      fields: {
        interests: idleField({ phase: 'error', isConfirmed: false, canRetry: true, error: { code: 'network_error', recoverable: true } }),
        study_goal: idleField()
      },
      // `retryField` re-queues the draft and marks the field pending in the same
      // batch as the click, so the screen's wait sees a write in flight rather
      // than the failure it just retried. Mirrored here, or the mock would
      // describe a hook that does not exist.
      retryUnsaved: jest.fn(() => {
        preferences.fields = { interests: idleField({ phase: 'pending', isSaving: true, isConfirmed: false }), study_goal: idleField() }
        return ['interests']
      })
    })
    const { rerender } = renderScreen()

    fireEvent.click(primaryAction())

    expect(journey.recordPoint).not.toHaveBeenCalled()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(copy.saveError.title)
    expect(topicChip(taxonomy.topics.technology)).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getAllByRole('button', { name: en.onboarding.welcome.save.retry }).pop())
    expect(preferences.retryUnsaved).toHaveBeenCalled()
    expect(journey.recordPoint).not.toHaveBeenCalled()

    // The echo lands: the press the user already made is finished for them.
    preferences = buildPreferences({ interests: ['technology'], studyGoal: 'career' })
    rerender(element())

    await waitFor(() => expect(journey.recordPoint).toHaveBeenCalledWith('first_deck'))
  })
})

describe('order, and the questions this screen must never ask (FR-018, FR-019, FR-023)', () => {
  it('sends interests in selection order', () => {
    preferences = buildPreferences({ interests: ['technology'] })
    renderScreen()

    fireEvent.click(topicChip(taxonomy.topics.science))

    expect(preferences.setPreference).toHaveBeenCalledWith('interests', ['technology', 'science'])
  })

  it('promotes the survivor when the primary is removed, keeping the rest in order', () => {
    preferences = buildPreferences({ interests: ['technology', 'science', 'history'] })
    renderScreen()

    fireEvent.click(topicChip(taxonomy.topics.technology))

    expect(preferences.setPreference).toHaveBeenCalledWith('interests', ['science', 'history'])
  })

  it('appends a re-selected topic rather than restoring its old slot', () => {
    preferences = buildPreferences({ interests: ['science', 'history'] })
    renderScreen()

    fireEvent.click(topicChip(taxonomy.topics.technology))

    expect(preferences.setPreference).toHaveBeenCalledWith('interests', ['science', 'history', 'technology'])
  })

  it('states the primary topic by position and asks for it through no separate control', () => {
    preferences = buildPreferences({ interests: ['technology', 'science'] })
    renderScreen()

    expect(screen.getByText(fill(taxonomy.selector.topics.primaryStatus, { topic: taxonomy.topics.technology }))).toBeInTheDocument()
    // The only control that could set it is the ordered list itself.
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByText(en.onboarding.focus.title)).toBeNull()
  })

  it('asks nothing about learning style', () => {
    renderScreen()

    expect(screen.queryByText(en.onboarding.learning.styleTitle)).toBeNull()
    expect(screen.queryByText(en.onboarding.learning.title)).toBeNull()
    expect(screen.queryByText(/learning style/i)).toBeNull()
  })
})

describe('the four states of the confirmed read (FR-046)', () => {
  it('shows no selection count until the saved values are known', () => {
    preferences = buildPreferences({ phase: 'loading' })
    renderScreen()

    // "0 of 5 selected" for a user with three saved topics is worse than
    // nothing, so the selectors are not rendered until the read answers.
    expect(screen.queryByText(fill(taxonomy.selector.topics.counter, { selected: 0, max: 5 }))).toBeNull()
    expect(screen.queryByRole('button', { name: new RegExp(taxonomy.topics.technology) })).toBeNull()
    expect(screen.getByText(copy.loading)).toBeInTheDocument()
  })

  it('restores confirmed interests in order, and the goal, on return', () => {
    preferences = buildPreferences({ interests: ['history', 'music'], studyGoal: 'hobby' })
    renderScreen()

    expect(topicChip(taxonomy.topics.history)).toHaveAttribute('aria-pressed', 'true')
    expect(topicChip(taxonomy.topics.music)).toHaveAttribute('aria-pressed', 'true')
    expect(topicChip(taxonomy.topics.science)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('radio', { name: taxonomy.goals.hobby })).toBeChecked()
    expect(screen.getByText(fill(taxonomy.selector.topics.primaryStatus, { topic: taxonomy.topics.history }))).toBeInTheDocument()
  })

  it('reports a failed read without blocking the screen', () => {
    preferences = buildPreferences({ phase: 'error' })
    renderScreen()

    expect(screen.getByText(copy.loadError)).toBeInTheDocument()
    expect(topicChip(taxonomy.topics.technology)).toBeEnabled()
    expect(primaryAction()).toBeEnabled()
  })
})
