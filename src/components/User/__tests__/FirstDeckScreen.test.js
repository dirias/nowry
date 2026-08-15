/**
 * ONB-011 — FirstDeckScreen.
 *
 * Five claims carry this screen, and four of them are about refusing to lie:
 *
 *   1. it browses the **server's** primary topic, page of three, and marks a
 *      deck official only where the server said `is_official: true` (FR-024,
 *      FR-025, FR-056);
 *   2. empty, error, pending and success are distinct *semantically*, not only
 *      visually — the empty state is the expected launch outcome and must never
 *      carry an alert (FR-046, FR-049, FR-050, NFR-018);
 *   3. one fork at a time, and a failure keeps the chosen deck selected so the
 *      retry is a replay rather than a fresh choice (FR-027, FR-029, NFR-017);
 *   4. success requires the server's activation — and the two outcomes that
 *      merely *look* like failures, `created: false` and `activation_failed`,
 *      are not shown as one (FR-006, FR-028, ADR-005, ADR-006);
 *   5. nothing starts the AI fallback except a press, and its confirmation
 *      never implies the journey finished (FR-032, FR-033, FR-035).
 *
 * The card and the empty state are *not* mocked. The official mark and the
 * "nothing was added to your library" sentence are the product here.
 */
jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        // English plural selection, which is all the bundle under test needs.
        const plural = typeof options?.count === 'number' ? `${key}${options.count === 1 ? '_one' : '_other'}` : null
        const raw = (plural && resolve(plural)) ?? resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en', changeLanguage: jest.fn() }
    })
  }
})

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

// Mocked for their constants only: importing either module for real drags in
// the API client and every service behind it.
jest.mock('../../../hooks/useOnboardingJourney', () => ({
  __esModule: true,
  ACTION_PHASE: { IDLE: 'idle', PENDING: 'pending', SUCCEEDED: 'succeeded', ERROR: 'error' },
  BROWSE_PHASE: { IDLE: 'idle', LOADING: 'loading', READY: 'ready', EMPTY: 'empty', ERROR: 'error' },
  default: jest.fn()
}))
jest.mock('../../../hooks/useProgressivePreferences', () => ({
  __esModule: true,
  ACTION_PHASE: { IDLE: 'idle', PENDING: 'pending', SUCCEEDED: 'succeeded', ERROR: 'error' },
  PREFERENCES_PHASE: { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' },
  PREFERENCE_FIELD: { LANGUAGE: 'language', ACCENT_COLOR: 'theme_color', INTERESTS: 'interests', STUDY_GOAL: 'study_goal' },
  default: jest.fn()
}))

import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

import FirstDeckScreen, { forkFailureKey, generatedCardCount } from '../FirstDeckScreen'
import en from '../../../locales/en/translation.json'

const copy = en.onboarding.firstDeck
const fill = (template, values) => template.replace(/{{(\w+)}}/g, (_, name) => String(values[name]))

const officialDeck = (overrides = {}) => ({
  _id: 'deck-1',
  name: 'Foundations of Biology',
  description: 'Core concepts for a first biology review.',
  total_cards: 24,
  public_metadata: { category: 'science', language: 'en' },
  curation: { topic: 'science', learning_outcome: 'Explain the core structures and processes of a cell.', rank: 1 },
  publisher: { name: 'Nowry' },
  is_official: true,
  ...overrides
})

const buildJourney = ({ browse = {}, fork = {}, fallback = {}, ...overrides } = {}) => ({
  isActivated: false,
  browseState: { phase: 'ready', category: 'science', items: [officialDeck()], total: 1, error: null, ...browse },
  forkState: { phase: 'idle', deckId: null, forkedDeck: null, created: false, error: null, ...fork },
  fallbackState: { phase: 'idle', cards: null, error: null, ...fallback },
  loadOfficialDecks: jest.fn(),
  retryOfficialDecks: jest.fn(),
  forkOfficialDeck: jest.fn(),
  retryFork: jest.fn(),
  requestAiFallback: jest.fn(),
  ...overrides
})

const buildPreferences = ({ confirmedPrimaryTopic = 'science', phase = 'ready', ...overrides } = {}) => ({
  phase,
  // Deliberately different from the confirmed topic: the screen must browse the
  // one the *server* derived, never the visible draft (FR-024).
  values: { interests: ['history'], study_goal: 'academic' },
  confirmed: { interests: ['science'], study_goal: 'academic', primary_topic: confirmedPrimaryTopic },
  confirmedPrimaryTopic,
  reload: jest.fn(),
  ...overrides
})

// `onBack: null` keeps the shell's header control out of the button order, so
// the fork actions are simply the first buttons in the document.
const shell = { screenKey: 'first_deck', stepNumber: 3, totalSteps: 3, onBack: null }

let journey
let preferences
let onBack
let onExit

const renderScreen = () =>
  render(<FirstDeckScreen shell={shell} journey={journey} preferences={preferences} onBack={onBack} onExit={onExit} />)

/** The card whose title contains this text, located through its Joy Card root. */
const cardFor = (name) => screen.getByText(new RegExp(name)).closest('.MuiCard-root')

beforeEach(() => {
  mockNavigate.mockClear()
  onBack = jest.fn()
  onExit = jest.fn()
  journey = buildJourney()
  preferences = buildPreferences()
})

// ── 1. The request, and what a card shows ────────────────────────────────────

describe('curated request and card content', () => {
  it('browses the confirmed primary topic, not the visible draft', () => {
    renderScreen()

    // `science` is confirmed; `history` is the draft in `values`. Page and page
    // size are fixed by the ONB-005 adapter, which is where they are tested.
    expect(journey.loadOfficialDecks).toHaveBeenCalledTimes(1)
    expect(journey.loadOfficialDecks).toHaveBeenCalledWith('science')
  })

  it('does not re-request when the journey object churns', () => {
    const { rerender } = renderScreen()
    rerender(<FirstDeckScreen shell={shell} journey={{ ...journey }} preferences={preferences} onBack={onBack} onExit={onExit} />)

    expect(journey.loadOfficialDecks).toHaveBeenCalledTimes(1)
  })

  it('renders title, description, publisher, learning outcome, card count and topic', () => {
    renderScreen()
    const card = within(cardFor('Foundations of Biology'))

    expect(card.getByText('Core concepts for a first biology review.')).toBeInTheDocument()
    expect(card.getByText(fill(copy.card.publisher, { publisher: 'Nowry' }))).toBeInTheDocument()
    expect(card.getByText('Explain the core structures and processes of a cell.')).toBeInTheDocument()
    expect(card.getByText(copy.card.outcomeLabel)).toBeInTheDocument()
    expect(card.getByText(fill(copy.card.count_other, { count: 24 }))).toBeInTheDocument()
    expect(card.getByText(en.taxonomy.topics.science)).toBeInTheDocument()
  })

  it('renders at most three cards', () => {
    journey = buildJourney({
      browse: {
        items: [1, 2, 3].map((n) => officialDeck({ _id: `deck-${n}`, name: `Deck ${n}` })),
        total: 3
      }
    })
    renderScreen()

    expect(screen.getAllByRole('button', { name: copy.card.add })).toHaveLength(3)
  })

  it('marks a deck official only where the server said so, and never by colour alone', () => {
    journey = buildJourney({
      browse: {
        items: [
          officialDeck({ _id: 'deck-1', name: 'Official One' }),
          officialDeck({ _id: 'deck-2', name: 'Unmarked Two', is_official: false }),
          officialDeck({ _id: 'deck-3', name: 'Unmarked Three', is_official: undefined })
        ],
        total: 3
      }
    })
    renderScreen()

    const marks = screen.getAllByRole('img', { name: fill(copy.official.accessible, { publisher: 'Nowry' }) })
    expect(marks).toHaveLength(1)
    // Words, not a tint: the label survives with no colour perception at all.
    expect(within(marks[0]).getByText(copy.official.label)).toBeInTheDocument()
    expect(within(cardFor('Unmarked Two')).queryByRole('img')).toBeNull()
  })
})

// ── 2. States that are distinct semantically, not only visually ──────────────

describe('network states', () => {
  it('shows layout-preserving skeletons while loading, and no options', () => {
    journey = buildJourney({ browse: { phase: 'loading', items: [] } })
    const { container } = renderScreen()

    // Three placeholders, because three is the page size — the column keeps its
    // height when the real options arrive.
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: copy.card.add })).toBeNull()
    // Never a full-page gate: the shell's heading and footer are already there.
    expect(screen.getByRole('heading', { name: copy.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.finish })).toBeInTheDocument()
  })

  it('renders the empty result as an expected outcome, with no alert anywhere', () => {
    journey = buildJourney({ browse: { phase: 'empty', items: [], total: 0 } })
    renderScreen()

    expect(screen.getByText(fill(copy.empty.title, { topic: en.taxonomy.topics.science }))).toBeInTheDocument()
    expect(screen.getByText(fill(copy.empty.body, { topic: en.taxonomy.topics.science }))).toBeInTheDocument()
    // The load succeeded. An alert, a retry or error copy would all say
    // otherwise — this is the state every user reaches at launch.
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(copy.browseError.title)).toBeNull()
  })

  it('renders a browse failure as an error, with a retry', () => {
    journey = buildJourney({
      browse: { phase: 'error', items: [], error: { code: 'network_error', recoverable: true } }
    })
    renderScreen()

    expect(screen.getByRole('alert')).toHaveTextContent(copy.browseError.title)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.shell.retry }))
    expect(journey.retryOfficialDecks).toHaveBeenCalled()
  })

  it('never claims an empty catalog when no topic was ever confirmed', () => {
    preferences = buildPreferences({ confirmedPrimaryTopic: null })
    renderScreen()

    expect(journey.loadOfficialDecks).not.toHaveBeenCalled()
    expect(screen.getByText(copy.missingTopic.title)).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(copy.empty.title.split('{{')[0]))).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.missingTopic.action }))
    expect(onBack).toHaveBeenCalled()
  })
})

// ── 3. One fork at a time; a failure keeps the choice ────────────────────────

describe('forking', () => {
  const threeDecks = () =>
    buildJourney({
      browse: { items: [1, 2, 3].map((n) => officialDeck({ _id: `deck-${n}`, name: `Deck ${n}` })), total: 3 }
    })

  it('forks the pressed deck', () => {
    journey = threeDecks()
    renderScreen()

    fireEvent.click(within(cardFor('Deck 2')).getByRole('button'))
    expect(journey.forkOfficialDeck).toHaveBeenCalledWith('deck-2')
  })

  it('disables every fork action while one is pending', () => {
    journey = threeDecks()
    journey.forkState = { ...journey.forkState, phase: 'pending', deckId: 'deck-2' }
    renderScreen()

    // The selected action cannot be pressed twice, and starting a second fork
    // while the first is unresolved is the incompatible action (FR-027/FR-047).
    ;['Deck 1', 'Deck 2', 'Deck 3'].forEach((name) => {
      expect(within(cardFor(name)).getByRole('button')).toBeDisabled()
    })
  })

  it('keeps the deck selected after a failure and retries it under the same choice', () => {
    journey = threeDecks()
    journey.forkState = {
      ...journey.forkState,
      phase: 'error',
      deckId: 'deck-2',
      error: { code: 'fork_failed', recoverable: true }
    }
    renderScreen()

    const card = within(cardFor('Deck 2'))
    expect(card.getByText(copy.card.selected)).toBeInTheDocument()
    expect(card.getByRole('button', { name: copy.card.retry })).toBeInTheDocument()

    expect(screen.getByRole('alert')).toHaveTextContent(copy.forkError.title)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.save.retry }))
    // `retryFork` reuses the deck and its stable idempotency key, so the replay
    // cannot produce a second visible deck (ADR-005, NFR-017).
    expect(journey.retryFork).toHaveBeenCalled()

    // Pressing the card again is the same action, hence the same deck id.
    fireEvent.click(card.getByRole('button', { name: copy.card.retry }))
    expect(journey.forkOfficialDeck).toHaveBeenCalledWith('deck-2')
  })

  it('offers no retry for a terminal source_not_official', () => {
    journey = threeDecks()
    journey.forkState = {
      ...journey.forkState,
      phase: 'error',
      deckId: 'deck-1',
      error: { code: 'source_not_official', recoverable: false }
    }
    renderScreen()

    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent(copy.forkError.notOfficial)
    expect(within(banner).queryByRole('button')).toBeNull()
  })

  it('maps fork codes to copy and falls back to the shared vocabulary', () => {
    expect(forkFailureKey({ code: 'source_not_official' })).toBe('onboarding.firstDeck.forkError.notOfficial')
    expect(forkFailureKey({ code: 'network_error' })).toBe('onboarding.failure.network')
    expect(forkFailureKey({ code: 'something_new' })).toBe('onboarding.failure.unknown')
  })
})

// ── 4. Success needs the server's activation ─────────────────────────────────

describe('activation', () => {
  const succeeded = (extra = {}) => ({
    phase: 'succeeded',
    deckId: 'deck-1',
    forkedDeck: { _id: 'private-1', name: 'Foundations of Biology (Forked)' },
    created: true,
    error: null,
    ...extra
  })

  it('confirms the material result and opens the added deck', () => {
    journey = buildJourney({ fork: succeeded(), isActivated: true })
    renderScreen()

    expect(screen.getByText(copy.success.title)).toBeInTheDocument()
    expect(screen.getByText(fill(copy.success.body, { name: 'Foundations of Biology (Forked)' }))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: copy.success.open }))
    expect(mockNavigate).toHaveBeenCalledWith('/study/private-1')
  })

  it('shows a created:false replay exactly like a first fork', () => {
    journey = buildJourney({ fork: succeeded({ created: false }), isActivated: true })
    renderScreen()

    // The user asked for a deck in their library and it is in their library.
    // The old `409 already_forked` framing is gone and nothing replaces it.
    expect(screen.getByText(copy.success.title)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('refuses to show success without the server saying activated', () => {
    journey = buildJourney({ fork: succeeded(), isActivated: false })
    renderScreen()

    expect(screen.queryByText(copy.success.title)).toBeNull()
    // Deck exists, activation does not — repeating the request repairs it.
    expect(screen.getByRole('alert')).toHaveTextContent(copy.activationError.title)
  })

  it('never surfaces activation_failed as a fork failure', () => {
    journey = buildJourney({
      fork: { phase: 'error', deckId: 'deck-1', forkedDeck: null, created: false, error: { code: 'activation_failed', recoverable: true } }
    })
    renderScreen()

    const banner = screen.getByRole('alert')
    // The deck and its cards already exist; saying they were not added is false.
    expect(banner).toHaveTextContent(copy.activationError.title)
    expect(banner).not.toHaveTextContent(copy.forkError.title)
    expect(banner).not.toHaveTextContent(copy.forkError.body)

    fireEvent.click(within(banner).getByRole('button', { name: en.onboarding.save.retry }))
    expect(journey.retryFork).toHaveBeenCalled()
  })
})

// ── 5. The fallback is explicit, and never claims completion ─────────────────

describe('AI fallback and finish for now', () => {
  const emptyJourney = (extra = {}) => buildJourney({ browse: { phase: 'empty', items: [], total: 0 }, ...extra })

  it('starts no AI work when the empty state opens', () => {
    journey = emptyJourney()
    renderScreen()

    expect(journey.requestAiFallback).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: copy.empty.fallbackAction })).toBeInTheDocument()
  })

  it('runs only on an explicit press', () => {
    journey = emptyJourney()
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: copy.empty.fallbackAction }))
    expect(journey.requestAiFallback).toHaveBeenCalledTimes(1)
    expect(journey.requestAiFallback).toHaveBeenCalledWith(en.taxonomy.topics.science)
  })

  it('confirms the generation outcome without implying the journey finished', () => {
    journey = emptyJourney({ fallback: { phase: 'succeeded', cards: [{}, {}, {}] } })
    renderScreen()

    expect(screen.getByText(copy.fallback.success.title)).toBeInTheDocument()
    expect(screen.getByText(fill(copy.fallback.success.body_other, { count: 3, topic: en.taxonomy.topics.science }))).toBeInTheDocument()
    // Nothing that belongs to activation: no success panel, no open-deck action.
    expect(screen.queryByText(copy.success.title)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.success.open })).toBeNull()
    expect(screen.getByRole('button', { name: copy.finish })).toBeInTheDocument()
  })

  it('reports a failed generation with a retry and no state change', () => {
    journey = emptyJourney({ fallback: { phase: 'error', cards: null, error: { code: 'network_error', recoverable: true } } })
    renderScreen()

    expect(screen.getByRole('alert')).toHaveTextContent(copy.fallback.error.title)
    fireEvent.click(screen.getByRole('button', { name: en.onboarding.save.retry }))
    expect(journey.requestAiFallback).toHaveBeenCalled()
  })

  it('counts generated cards defensively', () => {
    expect(generatedCardCount([{}, {}])).toBe(2)
    expect(generatedCardCount({ cards: [{}] })).toBe(1)
    // An unrecognised envelope selects the countless copy rather than a guess.
    expect(generatedCardCount({ status: 'ok' })).toBeNull()
    expect(generatedCardCount(null)).toBeNull()
  })

  it('finishes for now without claiming completion', () => {
    journey = emptyJourney()
    renderScreen()

    expect(screen.getByText(copy.finishHint)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.finish }))
    expect(onExit).toHaveBeenCalled()
    // Exiting writes nothing: preferences are already saved and re-entry
    // eligibility is the server's to decide (FR-035).
    expect(journey.forkOfficialDeck).not.toHaveBeenCalled()
    expect(journey.requestAiFallback).not.toHaveBeenCalled()
  })
})
