/**
 * ONB-013 — Settings topic ordering, 1–5 validation, and study goal.
 *
 * Five claims carry this section, and each maps to a defect it exists to
 * prevent:
 *
 *   1. it renders the *shared* taxonomy and goal lists — the Phase 1 bug was a
 *      second, Title-Case, eight-item copy of them living in Settings;
 *   2. a save outside 1–`MAX_TOPICS` never leaves the client, and the refusal is
 *      announced rather than swallowed (FR-052, A3) — note that onboarding
 *      legitimately permits zero, so this is the one place the two surfaces are
 *      allowed to differ;
 *   3. order is changed by real buttons, not by a pointer gesture, and every
 *      position change is announced (FR-018, NFR-001, NFR-005);
 *   4. a failed write is never presented as saved, and offers both retry and a
 *      way back to the confirmed value (FR-039, FR-040);
 *   5. the goal round-trips through the same preference endpoint (FR-053).
 *
 * The selectors are not mocked: order semantics are the product feature here,
 * and mocking the control that owns them would test nothing. The i18n mock
 * resolves against the real `en` bundle, so a key missing from the locale files
 * fails here instead of shipping as a raw key on screen.
 */
jest.mock('react-i18next', () => {
  const bundle = require('../../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        // Enough of i18next's plural resolution to prove the `_one`/`_other`
        // keys exist and are reachable; `_plural` is dead under v23.
        const raw =
          options && typeof options.count === 'number'
            ? (resolve(`${key}_${options.count === 1 ? 'one' : 'other'}`) ?? resolve(key))
            : resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en', changeLanguage: jest.fn() }
    })
  }
})

// Mocked so the section can be driven through every save state without an API
// client behind it. The constants mirror the real module exactly.
jest.mock('../../../../hooks/useProgressivePreferences', () => ({
  __esModule: true,
  ACTION_PHASE: { IDLE: 'idle', PENDING: 'pending', SUCCEEDED: 'succeeded', ERROR: 'error' },
  PREFERENCES_PHASE: { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' },
  PREFERENCE_FIELD: { LANGUAGE: 'language', ACCENT_COLOR: 'theme_color', INTERESTS: 'interests', STUDY_GOAL: 'study_goal' },
  default: jest.fn()
}))

import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

import LearningPreferencesSection, {
  INTEREST_RANGE_ISSUE,
  MIN_INTERESTS,
  evaluateInterestsRange,
  reorder
} from '../LearningPreferencesSection'
import useProgressivePreferences from '../../../../hooks/useProgressivePreferences'
import { MAX_TOPICS, STUDY_GOALS, TOPICS } from '../../../../constants/learningTaxonomy'
import en from '../../../../locales/en/translation.json'

const copy = en.settings.learning
const topicLabel = (value) => en.taxonomy.topics[value]
const goalLabel = (value) => en.taxonomy.goals[value]
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

let setPreference
let retryField
let reload

const buildPreferences = ({ interests = [], goal = null, phase = 'ready', fields = {}, confirmed } = {}) => ({
  phase,
  isLoading: phase === 'loading',
  loadError: null,
  reload,
  values: { interests, study_goal: goal, language: 'en', theme_color: '#000000' },
  confirmed: confirmed ?? { interests, study_goal: goal, primary_topic: interests[0] ?? null },
  fields: { interests: idleField(), study_goal: idleField(), ...fields },
  unsavedFields: [],
  failedFields: [],
  hasUnsavedChanges: false,
  isSaving: false,
  setPreference,
  retryField
})

const setup = (options) => {
  useProgressivePreferences.mockReturnValue(buildPreferences(options))
  return render(<LearningPreferencesSection />)
}

const topicGroup = () => screen.getByRole('group', { name: en.taxonomy.selector.topics.label })
const topicOption = (value) =>
  within(topicGroup()).getByRole('button', { name: new RegExp(`^${topicLabel(value).replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}`) })
const orderList = () => screen.getByRole('list')
const announcement = () => screen.getByRole('status', { name: copy.order.label })

beforeEach(() => {
  setPreference = jest.fn()
  retryField = jest.fn()
  reload = jest.fn()
  useProgressivePreferences.mockReset()
})

describe('the taxonomy is shared, not restated', () => {
  it('offers exactly the 14 canonical topics and the 5 canonical goals', () => {
    setup()

    expect(within(topicGroup()).getAllByRole('button')).toHaveLength(TOPICS.length)
    TOPICS.forEach((topic) => expect(topicOption(topic.value)).toBeInTheDocument())

    const goals = screen.getAllByRole('radio')
    expect(goals).toHaveLength(STUDY_GOALS.length)
    STUDY_GOALS.forEach((goal) => expect(screen.getByRole('radio', { name: goalLabel(goal.value) })).toBeInTheDocument())
  })

  it('restores the confirmed order and goal on reopen', () => {
    setup({ interests: ['science', 'art', 'music'], goal: 'career' })

    expect(topicOption('science')).toHaveAttribute('aria-pressed', 'true')
    expect(topicOption('history')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('radio', { name: goalLabel('career') })).toBeChecked()

    // Position, not merely membership: `interests[0]` is the primary topic.
    const rows = within(orderList()).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining(topicLabel('science')),
      expect.stringContaining(topicLabel('art')),
      expect.stringContaining(topicLabel('music'))
    ])
    expect(rows[0]).toHaveTextContent(copy.order.primary)
  })
})

describe('the 1–5 range', () => {
  it('sends the complete ordered array when the selection stays in range', () => {
    setup({ interests: ['science'] })

    fireEvent.click(topicOption('music'))

    expect(setPreference).toHaveBeenCalledWith('interests', ['science', 'music'])
  })

  it('refuses to save an empty selection and says so in an alert', () => {
    setup({ interests: ['science'] })

    fireEvent.click(topicOption('science'))

    expect(setPreference).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(fill(copy.range.tooFew_one, { count: MIN_INTERESTS }))
    // The refused change never reaches the screen either.
    expect(topicOption('science')).toHaveAttribute('aria-pressed', 'true')
  })

  it('explains a refused sixth topic through the same alert', () => {
    setup({ interests: TOPICS.slice(0, MAX_TOPICS).map((topic) => topic.value) })

    fireEvent.click(topicOption(TOPICS[MAX_TOPICS].value))

    expect(setPreference).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(fill(copy.range.tooMany_other, { count: MAX_TOPICS }))
  })

  it('clears the range alert once a saveable change is made', () => {
    setup({ interests: ['science'] })

    fireEvent.click(topicOption('science'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(topicOption('music'))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('evaluates the range without opinions about which values are legal', () => {
    expect(evaluateInterestsRange([])).toBe(INTEREST_RANGE_ISSUE.TOO_FEW)
    expect(evaluateInterestsRange(null)).toBe(INTEREST_RANGE_ISSUE.TOO_FEW)
    expect(evaluateInterestsRange(['a'])).toBeNull()
    expect(evaluateInterestsRange(['a', 'b', 'c', 'd', 'e'])).toBeNull()
    expect(evaluateInterestsRange(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(INTEREST_RANGE_ISSUE.TOO_MANY)
    // A value outside the taxonomy is the backend's call, not this module's.
    expect(evaluateInterestsRange(['not_a_topic'])).toBeNull()
  })
})

describe('reordering', () => {
  it('exposes move-earlier and move-later as keyboard-operable buttons, never as drag alone', () => {
    setup({ interests: ['science', 'art'] })

    const rows = within(orderList()).getAllByRole('listitem')
    rows.forEach((row) => expect(within(row).getAllByRole('button')).toHaveLength(2))

    expect(
      screen.getByRole('button', {
        name: fill(copy.order.moveLaterFor, { topic: topicLabel('science'), position: 1, total: 2 })
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /drag/i })).toBeNull()
    expect(document.querySelector('[draggable="true"]')).toBeNull()
  })

  it('moves a topic later and announces its new position', () => {
    setup({ interests: ['science', 'art', 'music'] })

    fireEvent.click(
      screen.getByRole('button', { name: fill(copy.order.moveLaterFor, { topic: topicLabel('science'), position: 1, total: 3 }) })
    )

    expect(setPreference).toHaveBeenCalledWith('interests', ['art', 'science', 'music'])
    expect(announcement()).toHaveTextContent(fill(copy.order.moved, { topic: topicLabel('science'), position: 2, total: 3 }))
  })

  it('moves a topic earlier, which is how a later topic becomes primary', () => {
    setup({ interests: ['science', 'art', 'music'] })

    fireEvent.click(
      screen.getByRole('button', { name: fill(copy.order.moveEarlierFor, { topic: topicLabel('music'), position: 3, total: 3 }) })
    )

    expect(setPreference).toHaveBeenCalledWith('interests', ['science', 'music', 'art'])
  })

  it('refuses a move past either end without losing the focus that asked for it', () => {
    setup({ interests: ['science', 'art'] })

    const first = screen.getByRole('button', {
      name: fill(copy.order.moveEarlierFor, { topic: topicLabel('science'), position: 1, total: 2 })
    })
    expect(first).toHaveAttribute('aria-disabled', 'true')
    expect(first).not.toBeDisabled()

    fireEvent.click(first)

    expect(setPreference).not.toHaveBeenCalled()
    expect(announcement()).toHaveTextContent(fill(copy.order.alreadyFirst, { topic: topicLabel('science') }))
  })

  it('hides the order controls when there is nothing to order', () => {
    setup({ interests: ['science'] })
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('reorders without mutating the array it was given', () => {
    const original = ['a', 'b', 'c']
    expect(reorder(original, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(reorder(original, 2, 0)).toEqual(['c', 'a', 'b'])
    expect(original).toEqual(['a', 'b', 'c'])
  })
})

describe('a failed save is never presented as saved', () => {
  const failed = {
    interests: idleField({
      phase: 'error',
      error: { code: 'network_error', recoverable: true },
      isConfirmed: false,
      canRetry: true
    })
  }

  it('labels the field unsaved, names the reason, and keeps the selection visible', () => {
    setup({ interests: ['science', 'art'], fields: failed })

    expect(screen.getByText(en.onboarding.save.unsaved)).toBeInTheDocument()
    expect(screen.getByText(en.onboarding.failure.network)).toBeInTheDocument()
    expect(screen.queryByText(en.onboarding.save.saved)).toBeNull()
    expect(topicOption('science')).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers retry and a way back to the last confirmed value', () => {
    setup({
      interests: ['science', 'art'],
      fields: failed,
      confirmed: { interests: ['music'], study_goal: null, primary_topic: 'music' }
    })

    fireEvent.click(screen.getByRole('button', { name: en.onboarding.save.retry }))
    expect(retryField).toHaveBeenCalledWith('interests')

    fireEvent.click(screen.getByRole('button', { name: copy.discardTopics }))
    expect(setPreference).toHaveBeenCalledWith('interests', ['music'])
  })

  it('offers no discard while the write is still in flight', () => {
    setup({ interests: ['science'], fields: { interests: idleField({ phase: 'pending', isSaving: true, isConfirmed: false }) } })

    expect(screen.queryByRole('button', { name: copy.discardTopics })).toBeNull()
    expect(screen.getByText(en.onboarding.save.saving)).toBeInTheDocument()
  })
})

describe('the study goal', () => {
  it('persists through the same preference endpoint', () => {
    setup({ interests: ['science'], goal: 'general' })

    fireEvent.click(screen.getByRole('radio', { name: goalLabel('academic') }))

    expect(setPreference).toHaveBeenCalledWith('study_goal', 'academic')
  })

  it('can be discarded back to the confirmed value after a failure', () => {
    setup({
      interests: ['science'],
      goal: 'academic',
      fields: { study_goal: idleField({ phase: 'error', error: { code: 'validation_error' }, isConfirmed: false, canRetry: true }) },
      confirmed: { interests: ['science'], study_goal: 'general', primary_topic: 'science' }
    })

    fireEvent.click(screen.getByRole('button', { name: copy.discardGoal }))
    expect(setPreference).toHaveBeenCalledWith('study_goal', 'general')
  })
})

describe('reading the confirmed values', () => {
  it('shows a skeleton rather than an empty selection while the read is in flight', () => {
    setup({ phase: 'loading' })

    expect(screen.queryByRole('group', { name: en.taxonomy.selector.topics.label })).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(copy.loading)
    // "0 of 5 selected" for a user who has five saved is worse than nothing.
    expect(screen.queryByText(/of 5 selected/)).toBeNull()
  })

  it('reports a failed read without blocking the controls that still work', () => {
    setup({ interests: ['science'], phase: 'error' })

    expect(screen.getByText(copy.loadError)).toBeInTheDocument()
    expect(topicGroup()).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: en.common.retry }))
    expect(reload).toHaveBeenCalled()
  })
})
