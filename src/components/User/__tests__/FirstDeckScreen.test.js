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
 *   5. nothing starts the AI fallback except a press, the cards it produces are
 *      handed to the real save flow rather than counted and dropped, and no
 *      part of that ever implies the journey finished (FR-031, FR-032, FR-033).
 *
 * A sixth claim was added after a signed-in pass found two defects the mocked
 * suite could not see: pressing "Generate with AI" produced a sentence and
 * discarded the cards, and "Finish for Now" navigated without recording a
 * postponement, so Home asked the user to finish setting up immediately. Both
 * are now asserted directly — §6 and §7 below.
 *
 * The card and the empty state are *not* mocked. The official mark and the
 * copy about what did and did not reach the library are the product here.
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

/**
 * The review modal is doubled, not reimplemented. What this screen owes is the
 * *handoff* — that the real cards arrive, that saving and dismissing are told
 * apart, that regenerating goes back through the one fallback entry point — and
 * the double makes each of those a press. `GeneratedCards`' own save behaviour
 * is covered where it lives, in `components/Cards/__tests__/GeneratedCards`.
 */
const mockReviewProps = []
jest.mock('../../Cards/GeneratedCards', () => ({
  __esModule: true,
  default: (props) => {
    const react = require('react')
    mockReviewProps.push(props)
    return react.createElement('div', { 'data-testid': 'review-modal' }, [
      react.createElement('span', { key: 'count', 'data-testid': 'review-card-count' }, props.cards.length),
      react.createElement('button', { key: 'save', onClick: () => props.onSaved?.(props.cards.length) }, 'save-generated'),
      react.createElement('button', { key: 'again', onClick: () => props.onGenerateAgain?.('auto') }, 'regenerate-auto'),
      react.createElement('button', { key: 'close', onClick: props.onCancel }, 'close-review')
    ])
  }
}))

import React from 'react'
import { act, render, screen, fireEvent, within } from '@testing-library/react'

import FirstDeckScreen, { forkFailureKey, generatedCardCount, generatedCardList } from '../FirstDeckScreen'
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

const buildJourney = ({ browse = {}, fork = {}, fallback = {}, postponeState: postponeOverrides = {}, ...overrides } = {}) => ({
  isActivated: false,
  browseState: { phase: 'ready', category: 'science', items: [officialDeck()], total: 1, error: null, ...browse },
  forkState: { phase: 'idle', deckId: null, forkedDeck: null, created: false, error: null, ...fork },
  fallbackState: { phase: 'idle', cards: null, error: null, ...fallback },
  postponeState: { phase: 'idle', error: null, ...postponeOverrides },
  loadOfficialDecks: jest.fn(),
  retryOfficialDecks: jest.fn(),
  forkOfficialDeck: jest.fn(),
  retryFork: jest.fn(),
  requestAiFallback: jest.fn().mockResolvedValue({ ok: true, cards: [] }),
  // The server writes the timestamp; the screen only awaits it (FR-042).
  postpone: jest.fn().mockResolvedValue({ ok: true }),
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

/** Press a control whose handler awaits the network, and settle the state update. */
const press = async (element) => {
  await act(async () => {
    fireEvent.click(element)
  })
}

/** The card whose title contains this text, located through its Joy Card root. */
const cardFor = (name) => screen.getByText(new RegExp(name)).closest('.MuiCard-root')

beforeEach(() => {
  mockNavigate.mockClear()
  mockReviewProps.length = 0
  onBack = jest.fn()
  onExit = jest.fn()
  journey = buildJourney()
  preferences = buildPreferences()
})

/** The props the review modal was last handed. */
const lastReview = () => mockReviewProps[mockReviewProps.length - 1]

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

  it('runs only on an explicit press', async () => {
    journey = emptyJourney()
    renderScreen()

    await press(screen.getByRole('button', { name: copy.empty.fallbackAction }))
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

  it('reports a failed generation with a retry and no state change', async () => {
    journey = emptyJourney({ fallback: { phase: 'error', cards: null, error: { code: 'network_error', recoverable: true } } })
    renderScreen()

    expect(screen.getByRole('alert')).toHaveTextContent(copy.fallback.error.title)
    await press(screen.getByRole('button', { name: en.onboarding.save.retry }))
    expect(journey.requestAiFallback).toHaveBeenCalled()
  })

  it('counts generated cards defensively', () => {
    expect(generatedCardCount([{}, {}])).toBe(2)
    expect(generatedCardCount({ cards: [{}] })).toBe(1)
    // An unrecognised envelope selects the countless copy rather than a guess.
    expect(generatedCardCount({ status: 'ok' })).toBeNull()
    expect(generatedCardCount(null)).toBeNull()

    expect(generatedCardList([{ title: 'a' }])).toEqual([{ title: 'a' }])
    expect(generatedCardList({ cards: [{ title: 'b' }] })).toEqual([{ title: 'b' }])
    expect(generatedCardList({ status: 'ok' })).toBeNull()
  })
})

// ── 6. The generated cards go somewhere ──────────────────────────────────────

/**
 * The defect this section exists for: `requestAiFallback` succeeded, the cards
 * were stored on `fallbackState`, and the only thing that ever read them was
 * `generatedCardCount` — a number for a sentence. FR-031 offers the user an
 * AI-generated deck; they received prose. The architecture's answer is to route
 * the cards into the existing generation flow, and that is what is asserted
 * here: the real card objects reach the real review component, saving them is
 * distinguishable from dismissing them, and none of it activates anything.
 */
describe('the AI fallback hands its cards to the save flow', () => {
  const twoCards = [
    { title: 'Mitosis', content: 'Cell division producing two identical nuclei.' },
    { title: 'Osmosis', content: 'Solvent movement across a semipermeable membrane.' }
  ]

  const generatingJourney = (cards = twoCards) =>
    buildJourney({
      browse: { phase: 'empty', items: [], total: 0 },
      requestAiFallback: jest.fn().mockResolvedValue({ ok: true, cards })
    })

  const generateThen = async (cards = twoCards) => {
    journey = generatingJourney(cards)
    const view = renderScreen()
    await press(screen.getByRole('button', { name: copy.empty.fallbackAction }))
    // The hook's state is what the screen renders from, so mirror the resolved
    // result the way the real hook would before re-rendering.
    journey = { ...journey, fallbackState: { phase: 'succeeded', cards, error: null } }
    view.rerender(<FirstDeckScreen shell={shell} journey={journey} preferences={preferences} onBack={onBack} onExit={onExit} />)
    return view
  }

  it('opens the review flow with the cards that were actually generated', async () => {
    await generateThen()

    expect(screen.getByTestId('review-modal')).toBeInTheDocument()
    // Not a count — the card objects themselves, which is the whole defect.
    expect(lastReview().cards).toEqual(twoCards)
    expect(screen.getByTestId('review-card-count')).toHaveTextContent('2')
  })

  it('does not open the review flow when generation failed', async () => {
    journey = buildJourney({
      browse: { phase: 'empty', items: [], total: 0 },
      requestAiFallback: jest.fn().mockResolvedValue({ ok: false, error: { code: 'network_error', recoverable: true } })
    })
    renderScreen()

    await press(screen.getByRole('button', { name: copy.empty.fallbackAction }))
    expect(screen.queryByTestId('review-modal')).toBeNull()
  })

  it('keeps dismissed cards reachable instead of discarding them', async () => {
    await generateThen()

    await press(screen.getByText('close-review'))
    expect(screen.queryByTestId('review-modal')).toBeNull()

    // The cards still exist, and the screen still offers a way back to them.
    await press(screen.getByRole('button', { name: copy.fallback.success.review }))
    expect(screen.getByTestId('review-modal')).toBeInTheDocument()
    expect(lastReview().cards).toEqual(twoCards)
  })

  it('tells the user the cards reached the library once they are saved', async () => {
    await generateThen()

    await press(screen.getByText('save-generated'))
    await press(screen.getByText('close-review'))

    expect(screen.getByText(copy.fallback.saved.title)).toBeInTheDocument()
    expect(screen.getByText(copy.fallback.saved.body)).toBeInTheDocument()
    // The stale claim this replaces said the opposite of what had happened.
    expect(screen.queryByText(fill(copy.fallback.success.body_other, { count: 2, topic: en.taxonomy.topics.science }))).toBeNull()
  })

  it('never activates onboarding by saving an AI deck (FR-033, A4)', async () => {
    await generateThen()
    await press(screen.getByText('save-generated'))
    await press(screen.getByText('close-review'))

    // An AI deck is not a curated fork. Everything that belongs to activation
    // must still be absent, and nothing may have been forked to get here.
    expect(screen.queryByText(copy.success.title)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.success.open })).toBeNull()
    expect(journey.forkOfficialDeck).not.toHaveBeenCalled()
    expect(journey.retryFork).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: copy.finish })).toBeInTheDocument()
  })

  it('routes regeneration back through the single fallback entry point', async () => {
    await generateThen()

    await press(screen.getByText('regenerate-auto'))
    // `'auto'` is the server-decided count, which the endpoint spells `null`.
    expect(journey.requestAiFallback).toHaveBeenLastCalledWith(en.taxonomy.topics.science, null)
  })

  it('does not surface the fallback error twice while the review is open', async () => {
    const view = await generateThen()
    journey = { ...journey, fallbackState: { phase: 'error', cards: null, error: { code: 'network_error', recoverable: true } } }
    view.rerender(<FirstDeckScreen shell={shell} journey={journey} preferences={preferences} onBack={onBack} onExit={onExit} />)

    // The modal owns the message while it covers the screen; a banner behind an
    // overlay is a message nobody reads.
    expect(screen.queryByText(copy.fallback.error.title)).toBeNull()
    expect(lastReview().streamError).toEqual({ code: 'network_error', recoverable: true })
  })
})

// ── 7. Finishing for now is a postponement ───────────────────────────────────

/**
 * The second defect from the signed-in pass. `show_reentry` is server-derived
 * as `incomplete AND (postponed_at is null OR now - postponed_at >= 24h)`, and
 * "Finish for Now" navigated without writing `postponed_at` — so the grace
 * period never started and Home asked the user to finish setting up the instant
 * they arrived. Welcome's "Not Right Now" always did this correctly; this is the
 * same contract, on the screen that needed it just as much.
 */
describe('finish for now', () => {
  const emptyJourney = (extra = {}) => buildJourney({ browse: { phase: 'empty', items: [], total: 0 }, ...extra })

  it('records the postponement before it navigates', async () => {
    journey = emptyJourney()
    renderScreen()

    expect(screen.getByText(copy.finishHint)).toBeInTheDocument()
    await press(screen.getByRole('button', { name: copy.finish }))

    expect(journey.postpone).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalled()
    // Still not completion: no fork, no generation, no activation claim.
    expect(journey.forkOfficialDeck).not.toHaveBeenCalled()
    expect(journey.requestAiFallback).not.toHaveBeenCalled()
  })

  it('keeps the user here when the postponement was not written', async () => {
    journey = emptyJourney({ postpone: jest.fn().mockResolvedValue({ ok: false, error: { code: 'network_error', recoverable: true } }) })
    renderScreen()

    await press(screen.getByRole('button', { name: copy.finish }))
    // Navigating anyway would promise a 24-hour grace period the server never
    // recorded — the user would land on Home and be asked to finish setup.
    expect(onExit).not.toHaveBeenCalled()
  })

  it('reports a failed postponement with a retry', async () => {
    journey = emptyJourney({
      postponeState: { phase: 'error', error: { code: 'network_error', recoverable: true } }
    })
    renderScreen()

    expect(screen.getByRole('alert')).toHaveTextContent(copy.finishError.title)
    await press(within(screen.getByRole('alert')).getByRole('button', { name: en.onboarding.save.retry }))
    expect(journey.postpone).toHaveBeenCalled()
  })

  it('exits without a postponement once the user is activated', async () => {
    journey = buildJourney({
      fork: { phase: 'succeeded', deckId: 'deck-1', forkedDeck: { _id: 'private-1', name: 'Forked' }, created: true, error: null },
      isActivated: true
    })
    renderScreen()

    await press(screen.getByRole('button', { name: copy.success.later }))
    // An activated user has no re-entry card for a grace period to hold back.
    expect(journey.postpone).not.toHaveBeenCalled()
    expect(onExit).toHaveBeenCalled()
  })
})
