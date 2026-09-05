/**
 * Phase 27 Plan 01 — Wave 0 test scaffold for StudySession.js (MOB-01/MOB-02/MOB-03).
 * Task 1: full mock harness + a passing smoke-render test.
 * Task 2 (below, added in this same plan): three skipped behavior-contract
 * groups un-skipped by their owning implementation plans — touch target -> 27-02,
 * session footer -> 27-03, swipe hint -> 27-04.
 *
 * Phase 30 Plan 02 — Wave 0 additions for MODE-02/03/04 (mode-aware fetch
 * dispatch, grading suppression, mode chip). These new describe
 * blocks are intentionally RED until 30-04 makes StudySession mode-aware.
 */
import React from 'react'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

// Phase 30: module-level mutable var so individual tests can control the
// `?mode=` query param via useSearchParams(); reset in beforeEach below to
// avoid cross-test leakage (mirrors the existing per-test mockResolvedValue
// reset idiom already used for the cardsService mocks in this file).
let mockSearchParams = new URLSearchParams()

// Phase 34: useSearchParams is now called TWICE per render — once by
// StudySession (for `mode`) and once by useSessionFilters (for `tags`) — and
// the second caller WRITES. The previous read-only `[mockSearchParams]` shape
// returned an undefined setter, so this mock now backs each call site with real
// React state and mirrors every write back into the module-level
// `mockSearchParams` so assertions can inspect the resulting URL.
//
// Each call site gets its own useState (both live in StudySession's hook list),
// which is fine: only the tag filter ever writes, and only it needs to observe
// its own writes. `mode` is immutable for a session's lifetime.
jest.mock('react-router-dom', () => {
  const ReactModule = require('react')
  return {
    useParams: () => ({ deckId: 'deck-1' }),
    useNavigate: () => jest.fn(),
    useSearchParams: () => {
      const [params, setParams] = ReactModule.useState(() => mockSearchParams)
      const setter = ReactModule.useCallback((updater) => {
        setParams((prev) => {
          const next = typeof updater === 'function' ? updater(new URLSearchParams(prev)) : new URLSearchParams(updater)
          mockSearchParams = next
          return next
        })
      }, [])
      return [params, setter]
    }
  }
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

// Phase 31: stable, hoisting-safe mock refs (name prefix 'mock' is Jest's
// documented exception to the out-of-scope-variable rule for jest.mock()
// factories — mirrors the existing mockSearchParams idiom above). A fresh
// jest.fn() literal per usePet() call (the previous inline shape) would be a
// different reference on every render than what the component closed over,
// making `.mock.calls` assertions from the test body impossible. This also
// matters beyond assertions: StudySession.js closes over resetCompanionSession
// in a useEffect's dependency array (the cleanup clears the pending
// wrong_answer nudge setTimeout) — an unstable reference there would re-run
// that cleanup on every render and clear the nudge before it ever fires.
const mockQueueIntervention = jest.fn()
const mockSetViewContext = jest.fn()
const mockResetCompanionSession = jest.fn()
const mockSetStudySession = jest.fn()
const mockSetStudySessionFullscreen = jest.fn()
const mockRevealPet = jest.fn()
const mockAwardSessionXp = jest.fn()
const mockApplyReviewXp = jest.fn()
const mockFlushPendingLevelUp = jest.fn()
const mockCheer = jest.fn()

jest.mock('../../../context/AgentContext', () => ({
  usePet: () => ({
    setViewContext: mockSetViewContext,
    queueIntervention: mockQueueIntervention,
    resetCompanionSession: mockResetCompanionSession,
    setStudySession: mockSetStudySession,
    setStudySessionFullscreen: mockSetStudySessionFullscreen,
    // These are read by StudySession's session-complete effect and its grade
    // handler; omitting any of them makes every test that finishes a session
    // die on `<name> is not a function` before it can assert anything.
    revealPet: mockRevealPet,
    hasBeenRevealed: false,
    awardSessionXp: mockAwardSessionXp,
    applyReviewXp: mockApplyReviewXp,
    flushPendingLevelUp: mockFlushPendingLevelUp,
    cheer: mockCheer
  })
}))

jest.mock('../../../api/services', () => ({
  cardsService: {
    getDailyReviewCards: jest.fn(),
    getDueCards: jest.fn(),
    getAllCards: jest.fn(), // Phase 30 — Browse fetch
    review: jest.fn().mockResolvedValue({}),
    // MARK-002 — the header's MarkToggle reaches for these on click.
    mark: jest.fn().mockResolvedValue({}),
    unmark: jest.fn().mockResolvedValue({})
  },
  decksService: {}
}))

jest.mock('../../../api/services/studySessions.service', () => ({
  studySessionsService: {
    log: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({ sessions: [], total: 0 })
  }
}))

jest.mock('../../../hooks/useCardData', () => ({
  useCardData: () => ({ cards: [], loading: false, reload: jest.fn() })
}))

// CACHE-004: StudySession now invalidates the React Query 'cards' cache
// directly (via useAuth()'s userId) on unmount, replacing the old
// apiCache.invalidate('cards:all') call — mirrors the established
// AuthContext-mocking idiom used by every other test whose component
// imports useAuth (e.g. FocusAreaViewDialogSection.test.js,
// AnnualPlanningLayout.test.js), needed because the real AuthContext module
// pulls in src/i18n.js, which errors outside the app's real entry point.
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }))

jest.mock('../../../api/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() }
}))

jest.mock('../../../hooks/useVoiceSettings', () => {
  const benignSide = { voiceName: null, voiceLang: null, rate: 1.0, pitch: 1.0, autoPlay: false }
  return {
    useVoiceSettings: () => ({
      voiceSettings: { front: benignSide, back: benignSide },
      getSettingsForDeck: jest.fn(() => ({ front: benignSide, back: benignSide })),
      handleVoiceSettingsChange: jest.fn()
    })
  }
})

jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg/>' })
  }
}))

jest.mock('../../TTS/TTSControls', () => ({
  __esModule: true,
  default: () => null
}))

jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html) => html }
}))

const { cardsService } = require('../../../api/services')
const { studySessionsService } = require('../../../api/services/studySessions.service')

// require-after-mock: the component under test is imported only after every
// jest.mock() call above has registered, per the GoalCardGrid.test.js idiom.
const StudySession = require('../StudySession').default

/** Two flashcards (no card_type -> flashcard branch); card 0 is the render target. */
const makeCards = () => [
  { _id: 'c1', id: 'c1', title: 'What is 2+2?', content: 'Four' },
  { _id: 'c2', id: 'c2', title: 'Capital of France?', content: 'Paris' }
]

function renderSession(overrides = {}) {
  const cards = overrides.cards || makeCards()
  cardsService.getDueCards.mockResolvedValue(cards)
  cardsService.getDailyReviewCards.mockResolvedValue(cards)
  cardsService.getAllCards.mockResolvedValue(cards)
  // react-scripts' jest config sets `resetMocks: true` (CRA default) — every
  // jest.fn() (including these mocked-module fns) has its implementation
  // wiped before each test, so the one-time `.mockResolvedValue(...)` set at
  // jest.mock() factory-definition time only survives the FIRST test. Phase 31
  // tests are the first in this file to drive a session through to
  // `sessionComplete` (which awaits cardsService.review and chains
  // studySessionsService.log(...).catch(...)), so both must be re-armed here
  // on every render, matching the cardsService re-arm pattern above.
  // Default: a review that grants XP without crossing a level. Tests that care
  // about the XP block override this with their own mockResolvedValue.
  cardsService.review.mockResolvedValue(
    overrides.reviewResponse ?? {
      xp: { xp_awarded: 2, level_up: false, new_level: 3, new_stage: 2, current_xp: 120, xp_for_next_level: 30, level_progress: 0.4 }
    }
  )
  studySessionsService.log.mockResolvedValue({})
  studySessionsService.list.mockResolvedValue({ sessions: [], total: 0 })
  return render(<StudySession />)
}

// Phase 30 — reset the mode query-param mock between tests so a `mode=browse`
// set in one test never leaks into the next (default `mode=study` behavior).
// Phase 31 — also clear the stable AgentContext mock refs' call history.
beforeEach(() => {
  mockSearchParams = new URLSearchParams()
  mockQueueIntervention.mockClear()
  mockSetViewContext.mockClear()
  mockResetCompanionSession.mockClear()
  mockSetStudySession.mockClear()
  mockSetStudySessionFullscreen.mockClear()
  mockRevealPet.mockClear()
  mockAwardSessionXp.mockClear()
  mockApplyReviewXp.mockClear()
  mockFlushPendingLevelUp.mockClear()
  mockCheer.mockClear()
})

afterEach(() => {
  // Guard against a Phase 31 nudge-timing test leaving fake timers active
  // (per 26-03 precedent: fake timers left on hang subsequent findBy/waitFor polling).
  jest.useRealTimers()
})

describe('Phase 27 Wave 0: StudySession mount smoke test', () => {
  it('renders the active study session without throwing', async () => {
    renderSession()
    expect(await screen.findByText('cards.session.grading.again')).toBeInTheDocument()
  })
})

// MOB-01 (D-01/D-02). Un-skipped by 27-02.
// jsdom performs no real layout — getBoundingClientRect() always returns 0 for every
// dimension, so a literal "height >= 44px" assertion is not reliably automatable here.
// The pixel-height check is the manual-verification step per 27-VALIDATION.md
// Manual-Only Verifications; this suite instead asserts structure/presence/reachability
// of every touch-target control the fix must cover.
describe('touch target', () => {
  it('fullscreen-toggle IconButton is reachable via its translated aria-label', async () => {
    renderSession()
    expect(await screen.findByLabelText('cards.session.enterFullscreen')).toBeInTheDocument()
  })

  it('header back button is reachable via its translated aria-label', async () => {
    renderSession()
    expect(await screen.findByLabelText('cards.session.goBack')).toBeInTheDocument()
  })

  it('all four grading buttons (again/hard/good/easy) are present', async () => {
    renderSession()
    expect(await screen.findByText('cards.session.grading.again')).toBeInTheDocument()
    expect(screen.getByText('cards.session.grading.hard')).toBeInTheDocument()
    expect(screen.getByText('cards.session.grading.good')).toBeInTheDocument()
    expect(screen.getByText('cards.session.grading.easy')).toBeInTheDocument()
  })
})

// MOB-02 (D-06/D-07). Un-skipped by 27-03.
// The sticky footer (counter + grading buttons) must render as a distinct
// data-testid='session-footer' region, outside/after the independently
// scrollable card-content region (data-testid='session-scroll'), and must stay
// present in the document regardless of how long the card content is.
describe('session footer', () => {
  /** Quiz-type-card fixture, shaped exactly like the quiz branch expects. */
  const quizCard = {
    _id: 'q1',
    id: 'q1',
    card_type: 'quiz',
    title: 'Capital of France?',
    options: ['Paris', 'Lyon', 'Nice'],
    correct_answer: 'Paris',
    explanation: 'Paris is the capital.'
  }

  it('renders a session-footer element containing the grading buttons, separate from the scrollable content region', async () => {
    const longCard = { _id: 'c1', id: 'c1', title: 'Q', content: 'A'.repeat(220) }
    renderSession({ cards: [longCard, ...makeCards()] })
    const footer = await screen.findByTestId('session-footer')
    expect(within(footer).getByText('cards.session.grading.easy')).toBeInTheDocument()

    const scrollRegion = screen.queryByTestId('session-scroll')
    if (scrollRegion) {
      expect(within(scrollRegion).queryByText('cards.session.grading.easy')).not.toBeInTheDocument()
    }
  })

  it('keeps the footer present regardless of card content length', async () => {
    const shortCard = { _id: 'c1', id: 'c1', title: 'Q', content: 'A' }
    renderSession({ cards: [shortCard, ...makeCards()] })
    expect(await screen.findByTestId('session-footer')).toBeInTheDocument()
  })

  it('renders the progress counter in the session footer for a quiz card before the user answers, with grading buttons still hidden', async () => {
    renderSession({ cards: [quizCard, ...makeCards()] })
    const footer = await screen.findByTestId('session-footer')
    expect(within(footer).getByText(/cards\.session\.card/)).toBeInTheDocument()
    expect(within(footer).queryByText('cards.session.grading.easy')).not.toBeInTheDocument()
  })

  it('keeps the progress counter visible in the session footer for a quiz card in fullscreen mode before answering', async () => {
    renderSession({ cards: [quizCard, ...makeCards()] })
    fireEvent.click(await screen.findByLabelText('cards.session.enterFullscreen'))
    const footer = await screen.findByTestId('session-footer')
    expect(within(footer).getByText(/cards\.session\.card/)).toBeInTheDocument()
  })
})

// MOB-03 (D-08/D-09). Un-skipped by 27-04.
// The icon-only swipe hint appears only on the first card of a session and is
// dismissed once the user swipes past it or advances via grading. It keys off the
// existing touchStart/touchMove/touchEnd refs and currentIndex, not a new gesture path.
describe('swipe hint', () => {
  it('is present on the first card of a session', async () => {
    renderSession()
    expect(await screen.findByTestId('swipe-hint')).toBeInTheDocument()
  })

  it('is dismissed after a swipe gesture exceeding the threshold', async () => {
    renderSession()
    const hint = await screen.findByTestId('swipe-hint')
    const cardContainer = hint.closest('[data-testid="session-card"]') || document.body

    fireEvent.touchStart(cardContainer, { targetTouches: [{ clientX: 200, clientY: 200 }] })
    fireEvent.touchMove(cardContainer, { targetTouches: [{ clientX: 60, clientY: 200 }] })
    fireEvent.touchEnd(cardContainer, {})

    expect(screen.queryByTestId('swipe-hint')).not.toBeInTheDocument()
  })

  it('is absent after advancing to card index 1', async () => {
    renderSession()
    await screen.findByTestId('swipe-hint')
    fireEvent.click(screen.getByText('cards.session.grading.easy'))
    expect(screen.queryByTestId('swipe-hint')).not.toBeInTheDocument()
  })
})

// MODE-02 (D-05). Un-skipped by 30-04.
// In Browse mode, StudySession must dispatch to cardsService.getAllCards (not
// getDueCards) and must never mount GradingButtons — cards flip/navigate freely
// with no side effects.
describe('browse mode', () => {
  it('fetches all cards via getAllCards and never calls getDueCards', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession()
    await screen.findByTestId('session-footer')
    expect(cardsService.getAllCards).toHaveBeenCalledWith('deck-1')
    expect(cardsService.getDueCards).not.toHaveBeenCalled()
  })

  it('renders no grading buttons', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession()
    await screen.findByTestId('session-footer')
    expect(screen.queryByText('cards.session.grading.again')).not.toBeInTheDocument()
  })
})

// MODE-03 (D-06). Un-skipped by 30-04.
// Browse must structurally never invoke cardsService.review — no
// GradingButtons are mounted, so the grading path is unreachable. This test
// documents/locks that invariant rather than exercising a client-side guard.
describe('review call guarantee', () => {
  it('never calls review in browse mode', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession()
    await screen.findByTestId('session-footer')
    expect(cardsService.review).not.toHaveBeenCalled()
  })
})

// MODE-04 (D-11). Un-skipped by 30-04.
// The active mode must be visibly labeled via a Chip inside the session footer,
// regardless of which mode is active.
describe('mode chip', () => {
  it('renders the browse mode chip label in the session footer', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession()
    const footer = await screen.findByTestId('session-footer')
    expect(within(footer).getByText('cards.session.mode.browse')).toBeInTheDocument()
  })

  it('renders the study mode chip label in the session footer by default', async () => {
    renderSession()
    const footer = await screen.findByTestId('session-footer')
    expect(within(footer).getByText('cards.session.mode.study')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Phase 31 Plan 01 — Wave 0 (RED) scaffold for MODE-06/MODE-07. These five
// describe blocks assert behavior the implementation does not yet have; they
// are turned GREEN by 31-03 (StudySession.js) — see 31-01-PLAN.md for the
// full spec this scaffold is authored against.
// ---------------------------------------------------------------------------

// PET-003. Session-completion XP and the once-per-day streak bonus were
// implemented on the backend but had no caller at all, so neither was ever
// awarded. These lock the wiring in place.
describe('session completion XP', () => {
  it('awards session XP with the graded card count and the deck studied', async () => {
    const cards = [
      { _id: 'x1', id: 'x1', title: 'XP 1', content: 'A' },
      { _id: 'x2', id: 'x2', title: 'XP 2', content: 'B' }
    ]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    fireEvent.click(await screen.findByText('cards.session.grading.good'))

    await screen.findByText('cards.session.complete.cardsReviewed')
    expect(mockAwardSessionXp).toHaveBeenCalledWith(2, 'deck-1')
  })

  it('awards once per completed session, not once per graded card', async () => {
    const cards = [
      { _id: 'y1', id: 'y1', title: 'XP 1', content: 'A' },
      { _id: 'y2', id: 'y2', title: 'XP 2', content: 'B' },
      { _id: 'y3', id: 'y3', title: 'XP 3', content: 'C' }
    ]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.again'))
    fireEvent.click(await screen.findByText('cards.session.grading.hard'))
    fireEvent.click(await screen.findByText('cards.session.grading.good'))

    await screen.findByText('cards.session.complete.cardsReviewed')
    expect(mockAwardSessionXp).toHaveBeenCalledTimes(1)
  })

  it('feeds each graded card’s XP block to the pet, so the ring advances mid-session', async () => {
    const cards = [
      { _id: 'p1', id: 'p1', title: 'XP 1', content: 'A' },
      { _id: 'p2', id: 'p2', title: 'XP 2', content: 'B' }
    ]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    await screen.findByText('cards.session.grading.good')

    await waitFor(() => expect(mockApplyReviewXp).toHaveBeenCalled())
    expect(mockApplyReviewXp).toHaveBeenCalledWith(expect.objectContaining({ xp_awarded: 2, level_progress: 0.4 }))
  })

  it('releases a banked level-up once the summary is on screen', async () => {
    const cards = [{ _id: 'q1', id: 'q1', title: 'Only', content: 'A' }]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.good'))

    await screen.findByText('cards.session.complete.cardsReviewed')
    expect(mockFlushPendingLevelUp).toHaveBeenCalled()
  })

  it('survives a review response that carries no XP block', async () => {
    // grant_xp is fire-and-forget server-side: a failure there returns the
    // review without an xp block rather than failing the whole request.
    const cards = [{ _id: 'r1', id: 'r1', title: 'Only', content: 'A' }]
    renderSession({ cards, reviewResponse: { message: 'Card reviewed successfully' } })

    fireEvent.click(await screen.findByText('cards.session.grading.good'))

    await screen.findByText('cards.session.complete.cardsReviewed')
    expect(mockApplyReviewXp).not.toHaveBeenCalled()
  })

  // Regression guard, found by driving a real session in the browser: one
  // 29-card session credited the +15 session bonus twice. The effect's
  // `!sessionComplete` guard does not make its side effects one-shot, because
  // `visibleCards` is in the dependency list — any change to that array's
  // identity after completion re-runs the whole block.
  it('awards the session bonus once even if the effect re-runs after completion', async () => {
    const cards = [
      { _id: 'z1', id: 'z1', title: 'Once 1', content: 'A' },
      { _id: 'z2', id: 'z2', title: 'Once 2', content: 'B' }
    ]
    // The real trigger is the background review sync: handleGrade awaits
    // cardsService.review and then calls setCards(syncedCards). On the LAST
    // card that resolves after sessionComplete flips, giving `cards` — and so
    // `visibleCards` — a new identity, which re-runs the effect.
    let releaseLastReview
    const lastReview = new Promise((resolve) => {
      releaseLastReview = () =>
        resolve({
          sm2_data: { last_reviewed: 'x', next_review: 'y', ease_factor: 2.5, interval: 1, repetitions: 1 },
          xp: { xp_awarded: 2, level_up: false, new_level: 3, new_stage: 2, current_xp: 120, xp_for_next_level: 30, level_progress: 0.4 }
        })
    })
    renderSession({ cards })
    cardsService.review.mockReturnValueOnce(Promise.resolve({})).mockReturnValueOnce(lastReview)

    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    await screen.findByText('cards.session.complete.cardsReviewed')

    expect(mockAwardSessionXp).toHaveBeenCalledTimes(1)

    // Now let the last review land, mutating cards after completion.
    await act(async () => {
      releaseLastReview()
      await lastReview
    })

    expect(mockAwardSessionXp).toHaveBeenCalledTimes(1)
    expect(mockRevealPet).toHaveBeenCalledTimes(1)
  })

  it('cheers the pet on a recalled card, and stays quiet on a missed one', async () => {
    // The pet previously spoke ONLY on wrong answers, which made it a critic
    // rather than a companion. Good/easy should perk it up; again should not.
    const cards = [
      { _id: 'c1', id: 'c1', title: 'Cheer 1', content: 'A' },
      { _id: 'c2', id: 'c2', title: 'Cheer 2', content: 'B' }
    ]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.again'))
    expect(mockCheer).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    expect(mockCheer).toHaveBeenCalledTimes(1)
  })

  it('awards nothing for a deck with no cards to study', async () => {
    // An all-caught-up deck still reaches sessionComplete, so without the
    // graded-cards guard a user could farm the daily bonus by repeatedly
    // opening and closing an empty deck.
    renderSession({ cards: [] })

    await screen.findByText('cards.session.allCaughtUp')
    expect(mockAwardSessionXp).not.toHaveBeenCalled()
  })
})

// MODE-06 (D-05). Un-skipped by 31-03.
// Today only 'again' grades increment wrongCountPerCardId; this proves 'hard'
// must count too, and that the broadened total renders on the summary.
describe('needs attention tracking', () => {
  it('counts Again and Hard grades together into the on-screen needs-attention total', async () => {
    const cards = [
      { _id: 'n1', id: 'n1', title: 'Needs 1', content: 'A' },
      { _id: 'n2', id: 'n2', title: 'Needs 2', content: 'B' },
      { _id: 'n3', id: 'n3', title: 'Needs 3', content: 'C' }
    ]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.again')) // Needs 1 -> again
    fireEvent.click(await screen.findByText('cards.session.grading.hard')) // Needs 2 -> hard
    fireEvent.click(await screen.findByText('cards.session.grading.good')) // Needs 3 -> good, session complete

    await screen.findByText('cards.session.complete.cardsReviewed')
    expect(screen.getByText('cards.session.complete.needsAttentionLabel')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

// Tie-break regression guard, added after human verification flagged that
// "first missed wins" (the original RESEARCH.md-documented simplification)
// is silent/arbitrary from a student's perspective. When two cards end a
// session tied on needs-attention count, the card with an Again grade must
// win the callout over a card only ever graded Hard — even if the Hard card
// was missed earlier in the session (insertion order alone must NOT decide).
describe('needs attention tie-break', () => {
  it('prefers the tied card with an Again grade over one only graded Hard, even though it was missed second', async () => {
    const cards = [
      { _id: 't1', id: 't1', title: 'Tie 1', content: 'A' },
      { _id: 't2', id: 't2', title: 'Tie 2', content: 'B' }
    ]
    renderSession({ cards })

    fireEvent.click(await screen.findByText('cards.session.grading.hard')) // Tie 1 -> hard, missed first
    fireEvent.click(await screen.findByText('cards.session.grading.again')) // Tie 2 -> again, missed second, session complete

    await screen.findByText('cards.session.complete.cardsReviewed')

    const summaryCall = mockQueueIntervention.mock.calls.find(([payload]) => payload?.type === 'session_summary')
    expect(summaryCall).toBeTruthy()
    expect(summaryCall[0].session_wrong_count).toBe(2)
    expect(summaryCall[0].most_missed_card_id).toBe('t2')
  })
})

// MODE-06 (Pitfall 1 regression guard). Kept green by 31-03.
// The real-time wrong_answer nudge must stay Again-only even after 31-03
// broadens needs-attention counting to include Hard — this locks in the
// SPLIT (two independent conditionals), not a widened single conditional.
describe('wrong_answer nudge stays again-only', () => {
  it('never fires a wrong_answer nudge for a Hard grade, but still fires one for an Again grade', async () => {
    const cards = [
      { _id: 'w1', id: 'w1', title: 'Wrong 1', content: 'A' },
      { _id: 'w2', id: 'w2', title: 'Wrong 2', content: 'B' }
    ]
    renderSession({ cards })
    await screen.findByText('cards.session.grading.hard')

    fireEvent.click(screen.getByText('cards.session.grading.hard')) // Wrong 1 -> hard

    // Clear the max 3000-8000ms nudge jitter window under a controlled clock
    // (fake timers enabled only around the advance — never during findBy/waitFor,
    // per the 26-03 hang precedent noted in STATE.md).
    jest.useFakeTimers()
    jest.advanceTimersByTime(8100)
    jest.useRealTimers()

    expect(mockQueueIntervention.mock.calls.some(([payload]) => payload?.type === 'wrong_answer')).toBe(false)

    jest.useFakeTimers()
    fireEvent.click(screen.getByText('cards.session.grading.again')) // Wrong 2 -> again
    jest.advanceTimersByTime(8100)
    jest.useRealTimers()

    expect(mockQueueIntervention.mock.calls.some(([payload]) => payload?.type === 'wrong_answer')).toBe(true)
  })
})

// D-02. Un-skipped by 31-03.
// buildStudyContext() must include a literal `mode` field the Smart Pet's
// ambient context can read — not a camelCase alias like isReadOnlyMode.
describe('mode-aware context', () => {
  it.each(['study', 'browse'])('includes mode=%s in the object passed to setViewContext', async (mode) => {
    mockSearchParams = mode === 'study' ? new URLSearchParams() : new URLSearchParams(`mode=${mode}`)
    renderSession()
    await screen.findByTestId('session-footer')

    const lastCall = mockSetViewContext.mock.calls[mockSetViewContext.mock.calls.length - 1]
    expect(lastCall[0]).toMatchObject({ mode })
  })
})

/**
 * Three-card fixture where "Alpha" is graded Again twice (via the desktop
 * Previous nav) and "Beta" is graded Hard once — Alpha must resolve as the
 * unambiguous most-attention card, and the broadened total must be 3
 * (D-06: the same computed value backs both the on-screen stat and the
 * session_summary payload).
 */
const buildMixedResultCards = () => [
  { _id: 'alpha', id: 'alpha', title: 'Alpha Card', content: 'A' },
  { _id: 'beta', id: 'beta', title: 'Beta Card', content: 'B' },
  { _id: 'gamma', id: 'gamma', title: 'Gamma Card', content: 'C' }
]

/**
 * The desktop Previous-card IconButton has no aria-label (only an icon) — it
 * is selected via the icon's MUI-generated test id, excluding the header back
 * button (which DOES carry an aria-label and renders the same ArrowBack icon).
 */
function clickPreviousCard() {
  const button = screen
    .getAllByTestId('ArrowBackIcon')
    .map((icon) => icon.closest('button'))
    .find((btn) => btn && !btn.hasAttribute('aria-label'))
  fireEvent.click(button)
}

/**
 * Grades Alpha 'again', navigates back via the Previous nav, grades Alpha
 * 'again' a second time, then grades Beta 'hard' and Gamma 'good' to reach
 * sessionComplete. Leaves wrongCountPerCardId at { alpha: 2, beta: 1 } once
 * 31-03 broadens counting to Again+Hard (total 3, alpha unambiguous).
 */
async function completeSessionWithMixedResults() {
  renderSession({ cards: buildMixedResultCards() })
  fireEvent.click(await screen.findByText('cards.session.grading.again')) // Alpha -> again (1)
  await screen.findByText('cards.session.grading.hard') // now on Beta
  clickPreviousCard() // back to Alpha
  fireEvent.click(await screen.findByText('cards.session.grading.again')) // Alpha -> again (2)
  await screen.findByText('cards.session.grading.hard') // now on Beta again
  fireEvent.click(screen.getByText('cards.session.grading.hard')) // Beta -> hard
  fireEvent.click(await screen.findByText('cards.session.grading.good')) // Gamma -> good, session complete
  await screen.findByText('cards.session.complete.cardsReviewed')
}

// Answer-spoiler regression. The flashcard is one 3D-rotated container holding a
// static front face and a static back face; grading batches setCurrentIndex +
// setIsFlipped(false) into a single commit. The back face therefore re-renders
// with the NEXT card's answer instantly, while `transform` takes 0.55s to rotate
// away from it — so for ~250ms the incoming card's answer is fully legible before
// its question appears, destroying the recall test. The fix keys the container by
// card id so a card change REMOUNTS it (a fresh node starts at rotateY(0) and CSS
// transitions never fire on first paint) instead of animating it.
describe('answer spoiler on card advance', () => {
  it('remounts the flip container on grade, so no rotate-back can reveal the next answer', async () => {
    renderSession({ cards: makeCards() })

    // Flip card 1 face-up, the state the bug requires.
    fireEvent.click(await screen.findByText('What is 2+2?'))
    // `sx` compiles to an emotion class, so the transform lives in the cascade,
    // not in element.style — read it through getComputedStyle.
    const beforeNode = screen.getByTestId('flip-container')
    expect(getComputedStyle(beforeNode).transform).toContain('rotateY(180deg)')

    fireEvent.click(screen.getByText('cards.session.grading.good'))

    // Card 2 is now showing...
    expect(await screen.findByText('Capital of France?')).toBeInTheDocument()
    const afterNode = screen.getByTestId('flip-container')
    // ...on a DIFFERENT DOM node. Node identity IS the assertion: a reused node
    // would carry the 180deg->0deg transition, and card 2's answer ('Paris') is
    // already painted on the back face that transition rotates through.
    expect(afterNode).not.toBe(beforeNode)
    expect(getComputedStyle(afterNode).transform).toContain('rotateY(0deg)')
  })

  it('keeps the same node for a manual flip, so click-to-flip still animates', async () => {
    renderSession({ cards: makeCards() })

    const node = await screen.findByTestId('flip-container')
    expect(getComputedStyle(node).transform).toContain('rotateY(0deg)')

    fireEvent.click(screen.getByText('What is 2+2?'))

    // Same card => same key => same node => the transform transition runs.
    expect(screen.getByTestId('flip-container')).toBe(node)
    expect(getComputedStyle(node).transform).toContain('rotateY(180deg)')
  })
})

// MODE-06/D-07. Un-skipped by 31-03.
describe('session summary — needs attention', () => {
  it('shows the needs-attention label + top-card callout, and hides the celebratory line, when count > 0', async () => {
    await completeSessionWithMixedResults()

    expect(screen.getByText('cards.session.complete.needsAttentionLabel')).toBeInTheDocument()
    // topCardCallout is ALWAYS called with { card: mostAttentionCardFront } — the mock
    // serializes options into the string, so only a substring/regex match is valid here.
    expect(screen.getByText(/cards\.session\.complete\.topCardCallout/)).toBeInTheDocument()
    expect(screen.queryByText('cards.session.complete.perfectSession')).not.toBeInTheDocument()
  })

  it('shows the celebratory line and hides needs-attention UI when count === 0 (D-07)', async () => {
    renderSession({ cards: buildMixedResultCards() })
    fireEvent.click(await screen.findByText('cards.session.grading.good')) // Alpha -> good
    fireEvent.click(await screen.findByText('cards.session.grading.easy')) // Beta -> easy
    fireEvent.click(await screen.findByText('cards.session.grading.good')) // Gamma -> good, session complete
    await screen.findByText('cards.session.complete.cardsReviewed')

    expect(screen.getByText('cards.session.complete.perfectSession')).toBeInTheDocument()
    expect(screen.queryByText('cards.session.complete.needsAttentionLabel')).not.toBeInTheDocument()
    expect(screen.queryByText(/cards\.session\.complete\.topCardCallout/)).not.toBeInTheDocument()
  })
})

// D-06. Un-skipped by 31-03.
// Proves the UI stat and the Pet payload read the SAME broadened count — no
// divergent second sort living in the render.
describe('session_summary intervention payload', () => {
  it('matches the on-screen broadened count and identifies the twice-graded card as most-missed', async () => {
    await completeSessionWithMixedResults()

    const summaryCall = mockQueueIntervention.mock.calls.find(([payload]) => payload?.type === 'session_summary')
    expect(summaryCall).toBeTruthy()
    expect(summaryCall[0].session_wrong_count).toBe(3)
    expect(summaryCall[0].most_missed_card_id).toBe('alpha')
  })
})

// ---------------------------------------------------------------------------
// Phase 33 Plan 03 (PERF-02, D-06/D-07/D-08/D-09) — rapid-grading race guard.
// Locks the correct-card-graded invariant BEFORE any StudySession.js
// memoization work lands: two clicks dispatched inside a SINGLE act() block
// (not two sequential fireEvent.click() calls, which each auto-flush via
// React 18 batching and cannot reproduce the pre-commit race — see
// 33-RESEARCH.md Pitfall 3) must grade card 0 then card 1, never card 0
// twice. No separate needs-attention count-integrity assertion is required
// (D-08) — this test's sole locked scope is the wrong-card-graded invariant.
// ---------------------------------------------------------------------------
describe('rapid grading race guard', () => {
  it('grades the correct sequential cards under a rapid double-click, never the same card twice', async () => {
    renderSession({ cards: makeCards() })

    const gradeBtn = await screen.findByText('cards.session.grading.easy')
    act(() => {
      gradeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      gradeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    // Wait for settle after the batched double-dispatch (session completes
    // after both cards are graded in this two-card fixture).
    await screen.findByText('cards.session.complete.cardsReviewed')

    expect(cardsService.review.mock.calls[0][0]).toBe('c1')
    expect(cardsService.review.mock.calls[1]?.[0]).toBe('c2')
  })
})

// ---------------------------------------------------------------------------
// Phase 33 Plan 03 follow-up (code review CR-02) — the same rapid-click race
// handled above for handleNext/handleGrade also applied to handlePrev: its
// `if (currentIndex > 0)` guard read the closure value directly, so two
// clicks dispatched in the same synchronous batch could both pass the guard
// against the same stale index and both apply a functional setCurrentIndex
// decrement, driving currentIndex to -1 and crashing on the next
// cards[currentIndex] read. Fixed by routing handlePrev through the same
// latestStateRef guard/advance pattern as handleNext.
// ---------------------------------------------------------------------------
describe('rapid prev-nav race guard', () => {
  it('does not drive currentIndex below 0 under a rapid double-click on Previous', async () => {
    renderSession({ cards: makeCards() })

    // Advance to card index 1 first so there is a "previous" card to return to.
    fireEvent.click(await screen.findByText('cards.session.grading.easy'))
    await screen.findByText('Capital of France?')

    const prevButton = screen
      .getAllByTestId('ArrowBackIcon')
      .map((icon) => icon.closest('button'))
      .find((btn) => btn && !btn.hasAttribute('aria-label'))

    act(() => {
      prevButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      prevButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    // A pre-fix double-click here would drive currentIndex to -1 and crash on
    // the next cards[currentIndex] read. Post-fix, it clamps at index 0 and
    // the first card's content renders without throwing.
    expect(await screen.findByText('What is 2+2?')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Browse-mode inline tag filter.
//
// The invariant under test throughout: the filter is a VIEW over the loaded
// deck and exists only in Browse. Study mode must be untouched — no control,
// no selection, and `visibleCards === cards` by reference so the SM-2 queue
// cannot be reordered or shrunk, not even via a hand-crafted URL.
// ---------------------------------------------------------------------------

/**
 * HDR-002 — the two filters are one segmented bar now, so the selectors change
 * shape: the tag dimension is a menu-opening segment rather than a combobox,
 * and the mark dimension is a pressed-state segment rather than a chip named
 * after its action. The invariants under test are unchanged.
 */
const TAGS_SEGMENT = /^cards\.session\.filters\.tags/
const tagsSegment = () => screen.queryByRole('button', { name: TAGS_SEGMENT })
const findTagsSegment = () => screen.findByRole('button', { name: TAGS_SEGMENT })

/** Three flashcards: tc1 = verbs, tc2 = nouns, tc3 = both. */
const makeTaggedCards = () => [
  { _id: 'tc1', id: 'tc1', title: 'Alpha Q', content: 'Alpha A', tags: ['verbs'] },
  { _id: 'tc2', id: 'tc2', title: 'Beta Q', content: 'Beta A', tags: ['nouns'] },
  { _id: 'tc3', id: 'tc3', title: 'Gamma Q', content: 'Gamma A', tags: ['verbs', 'nouns'] }
]

/**
 * The desktop Next-card IconButton carries no aria-label (icon only), and the
 * same ArrowForward icon appears nowhere else — but the aria-label exclusion is
 * kept to mirror clickPreviousCard() above and stay robust if one is added.
 */
function clickNextCard() {
  const button = screen
    .getAllByTestId('ArrowForwardIcon')
    .map((icon) => icon.closest('button'))
    .find((btn) => btn && !btn.hasAttribute('aria-label'))
  fireEvent.click(button)
}

/**
 * Opens the Tags segment's menu and picks `tag`. `menuitemcheckbox` is the
 * correct role for a multi-select filter menu — each row carries its own
 * checked state rather than dismissing the menu on choice.
 */
async function selectTag(tag) {
  fireEvent.click(await findTagsSegment())
  const option = await screen.findByRole('menuitemcheckbox', { name: new RegExp(`^${tag}`) })
  fireEvent.click(option)
}

/**
 * The most recent non-null payload handed to the Pet. buildStudyContext is the
 * only observable signal for `isFlipped` in jsdom — both flashcard faces are
 * always mounted (the flip is a CSS transform), so DOM presence proves nothing.
 */
const lastViewContext = () =>
  mockSetViewContext.mock.calls
    .map(([payload]) => payload)
    .filter(Boolean)
    .pop()

describe('browse tag filter — visibility', () => {
  it('renders in browse mode on a deck that has tags', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeTaggedCards() })

    expect(await findTagsSegment()).toBeInTheDocument()
  })

  it('does not render on a browse deck with no tags at all', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeCards() })
    await screen.findByTestId('session-footer')

    expect(tagsSegment()).not.toBeInTheDocument()
  })

  it('does not render in fullscreen', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeTaggedCards() })
    await findTagsSegment()

    fireEvent.click(screen.getByLabelText('cards.session.enterFullscreen'))

    expect(tagsSegment()).not.toBeInTheDocument()
  })
})

describe('browse tag filter — progress totals', () => {
  it('counts against the FILTERED total in both the header and the session footer', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&tags=verbs')
    renderSession({ cards: makeTaggedCards() })

    const footer = await screen.findByTestId('session-footer')
    // tc1 + tc3 match 'verbs' — 2, not the deck's 3.
    expect(within(footer).getByText(/cards\.session\.card.*"total":2/)).toBeInTheDocument()
    expect(screen.getAllByText(/cards\.session\.card.*"total":2/).length).toBeGreaterThan(1)
  })

  it('reports the filtered total to the AI companion, not the deck total', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&tags=verbs')
    renderSession({ cards: makeTaggedCards() })
    await screen.findByTestId('session-footer')

    expect(lastViewContext()).toMatchObject({ totalCards: 2, cardIndex: 1 })
  })
})

describe('browse tag filter — position handling', () => {
  it('keeps the user on the same card, with flip state untouched, when the card survives the filter', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeTaggedCards() })
    await findTagsSegment()

    clickNextCard() // -> tc2
    clickNextCard() // -> tc3 (tagged verbs + nouns, so it survives 'nouns')
    fireEvent.click(await screen.findByText('Gamma Q')) // flip it
    expect(lastViewContext()).toMatchObject({ isFlipped: true, cardIndex: 3 })

    await selectTag('nouns') // visible becomes [tc2, tc3]

    // Re-anchored onto tc3 at its NEW index (2 of 2) — and still flipped: the
    // card on screen never changed, so re-hiding the answer would be a
    // regression, not a reset.
    expect(lastViewContext()).toMatchObject({ isFlipped: true, cardIndex: 2, totalCards: 2 })
    expect(screen.getAllByText(/cards\.session\.card.*"current":2.*"total":2/).length).toBeGreaterThan(0)
  })

  it('falls back to the first card with flip state cleared when the anchored card is filtered out', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeTaggedCards() })
    await findTagsSegment()

    fireEvent.click(await screen.findByText('Alpha Q')) // flip tc1 (verbs only)
    expect(lastViewContext()).toMatchObject({ isFlipped: true, cardIndex: 1 })

    await selectTag('nouns') // tc1 drops out; visible becomes [tc2, tc3]

    expect(lastViewContext()).toMatchObject({ isFlipped: false, cardIndex: 1, totalCards: 2 })
    expect(screen.getByText('Beta Q')).toBeInTheDocument()
  })

  it('never completes the session as a side effect of filtering', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeTaggedCards() })
    await findTagsSegment()

    await selectTag('nouns')

    expect(screen.queryByText('cards.session.complete.cardsReviewed')).not.toBeInTheDocument()
    expect(await screen.findByTestId('session-footer')).toBeInTheDocument()
  })
})

describe('browse tag filter — filtered-empty state', () => {
  /**
   * The only fixture that reaches this branch. countTags() normalises tag
   * whitespace so `' verbs '` and `'verbs'` tally as one filter entry, while
   * filterCardsByTags() compares raw values — so a deck whose ONLY spelling is
   * the padded one advertises a `verbs` filter that matches nothing.
   *
   * That asymmetry is exactly what this state is for: an active filter with an
   * empty result, which must never look like an empty deck and must never be a
   * dead end. (Normalising tags at write time would close the gap upstream —
   * out of scope here, and the empty state would still be the correct catch.)
   */
  const paddedTagCards = () => [
    { _id: 'pt1', id: 'pt1', title: 'Padded Q', content: 'Padded A', tags: [' verbs '] },
    { _id: 'pt2', id: 'pt2', title: 'Other Q', content: 'Other A', tags: ['nouns'] }
  ]

  it('renders inside the session layout, keeping the filter bar mounted so the filter is undoable', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&tags=verbs')
    renderSession({ cards: paddedTagCards() })

    expect(await screen.findByTestId('tag-filter-empty')).toBeInTheDocument()
    expect(screen.getByText('cards.session.tagFilter.empty.title')).toBeInTheDocument()
    expect(screen.getByText('cards.session.tagFilter.empty.body')).toBeInTheDocument()
    // The escape hatch: the control that caused this is still on screen.
    expect(tagsSegment()).toBeInTheDocument()
  })

  it('is distinct from the empty-deck state and hides the card chrome', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&tags=verbs')
    renderSession({ cards: paddedTagCards() })
    await screen.findByTestId('tag-filter-empty')

    expect(screen.queryByText('cards.session.emptyDeck.title')).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-footer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-card')).not.toBeInTheDocument()
    expect(screen.queryByText(/cards\.session\.card/)).not.toBeInTheDocument()
  })

  it('restores the deck through its clear affordance', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&tags=verbs')
    renderSession({ cards: paddedTagCards() })

    const emptyState = await screen.findByTestId('tag-filter-empty')
    fireEvent.click(within(emptyState).getByLabelText('cards.session.tagFilter.clear'))

    expect(screen.queryByTestId('tag-filter-empty')).not.toBeInTheDocument()
    expect(await screen.findByText('Padded Q')).toBeInTheDocument()
    expect(mockSearchParams.has('tags')).toBe(false)
    expect(mockSearchParams.get('mode')).toBe('browse')
  })
})

/*
 * MARK-004 — the mark filter in a Browse session.
 *
 * The first block is the ADR-010 one: the mark must be as unable to reach the
 * SM-2 queue from the UI as it already is inside the hook. The rest pin the
 * behaviours that make a marked drill survivable — that unmarking the card you
 * are looking at does not throw you somewhere unrelated, and that an empty
 * result explains itself instead of showing a blank session.
 */
const MARKED_AT = '2026-08-30T10:00:00'

/** Three flashcards, two of them marked (mc1, mc3). */
const makeMarkedCards = () => [
  { _id: 'mc1', id: 'mc1', title: 'Alpha Q', content: 'Alpha A', marked_at: MARKED_AT },
  { _id: 'mc2', id: 'mc2', title: 'Beta Q', content: 'Beta A', marked_at: null },
  { _id: 'mc3', id: 'mc3', title: 'Gamma Q', content: 'Gamma A', marked_at: MARKED_AT }
]

/**
 * The marked segment names itself after what it IS, not what clicking it does —
 * `aria-pressed` carries the direction. An accessible name that does not
 * contain its own visible label would fail WCAG 2.5.3 (ADR-011).
 */
const markChip = () => screen.queryByTestId('marked-filter-segment')
const findMarkChip = () => screen.findByTestId('marked-filter-segment')

describe('browse mark filter — visibility', () => {
  it('never renders in study mode, even with a hand-crafted ?marked=1 on the URL', async () => {
    mockSearchParams = new URLSearchParams('mode=study&marked=1')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-footer')

    expect(markChip()).not.toBeInTheDocument()
    // And the queue is intact — all three cards, not the two marked ones.
    expect(screen.getAllByText(/cards\.session\.card.*"total":3/).length).toBeGreaterThan(0)
  })

  it('renders in browse mode on a deck that has marks', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })

    expect(await findMarkChip()).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not render on a browse deck with nothing marked', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeCards() })
    await screen.findByTestId('session-footer')

    expect(markChip()).not.toBeInTheDocument()
  })

  it('renders while the filter is on even if nothing is marked, so it can be switched off', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({ cards: makeCards() })

    expect(await findMarkChip()).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not render in fullscreen', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })
    await findMarkChip()

    fireEvent.click(screen.getByLabelText('cards.session.enterFullscreen'))

    expect(markChip()).not.toBeInTheDocument()
  })
})

describe('browse mark filter — scope', () => {
  it('narrows the session to marked cards and counts against that total', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({ cards: makeMarkedCards() })

    const footer = await screen.findByTestId('session-footer')
    // mc1 + mc3 are marked — 2, not the deck's 3.
    expect(within(footer).getByText(/cards\.session\.card.*"total":2/)).toBeInTheDocument()
  })

  it('composes with the tag filter rather than replacing it', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1&tags=verbs')
    renderSession({
      cards: [
        { _id: 'x1', id: 'x1', title: 'Both', content: 'A', tags: ['verbs'], marked_at: MARKED_AT },
        { _id: 'x2', id: 'x2', title: 'Tag only', content: 'B', tags: ['verbs'], marked_at: null },
        { _id: 'x3', id: 'x3', title: 'Mark only', content: 'C', tags: ['nouns'], marked_at: MARKED_AT }
      ]
    })

    const footer = await screen.findByTestId('session-footer')
    expect(within(footer).getByText(/cards\.session\.card.*"total":1/)).toBeInTheDocument()
  })

  it('offers no grading controls, consistent with browse mode', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-footer')

    expect(screen.queryByText('cards.session.grading.again')).not.toBeInTheDocument()
    expect(screen.queryByText('cards.session.grading.hard')).not.toBeInTheDocument()
  })

  it('toggling the segment switches the filter on and off', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })

    fireEvent.click(await findMarkChip())
    expect(mockSearchParams.get('marked')).toBe('1')

    fireEvent.click(await findMarkChip())
    expect(mockSearchParams.has('marked')).toBe(false)
  })
})

describe('browse mark filter — the list shrinking underneath the user', () => {
  it('holds the user at the last card when the one they were on is unmarked away', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-footer')

    clickNextCard() // -> mc3, the last of the two marked cards
    expect(lastViewContext()).toMatchObject({ cardIndex: 2, totalCards: 2 })

    // Unmark it from the header. The list shrinks to one WITHOUT the filter
    // signature changing, which used to clamp the index to 0 and dump the user
    // back at the top of the deck.
    cardsService.unmark.mockResolvedValue({ _id: 'mc3', marked_at: null })
    await act(async () => {
      fireEvent.click(screen.getByTestId('mark-toggle'))
    })

    await waitFor(() => expect(lastViewContext()).toMatchObject({ totalCards: 1 }))
    expect(lastViewContext()).toMatchObject({ cardIndex: 1 })
    expect(screen.queryByTestId('tag-filter-empty')).not.toBeInTheDocument()
  })

  it('shows an empty RESULT, not a finished session, when the last marked card is cleared', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({
      cards: [{ _id: 'only', id: 'only', title: 'Solo Q', content: 'Solo A', marked_at: MARKED_AT }]
    })
    await screen.findByTestId('session-footer')

    cardsService.unmark.mockResolvedValue({ _id: 'only', marked_at: null })
    await act(async () => {
      fireEvent.click(screen.getByTestId('mark-toggle'))
    })

    // A filter narrowing to zero is an empty result, never a completed session —
    // the invariant the re-anchor effect's own comment states.
    expect(await screen.findByTestId('tag-filter-empty')).toBeInTheDocument()
    expect(screen.queryByText('cards.session.complete.title')).not.toBeInTheDocument()
  })
})

describe('browse mark filter — the empty state', () => {
  it('teaches the gesture rather than suggesting a retry', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({ cards: makeCards() })

    const empty = await screen.findByTestId('tag-filter-empty')
    expect(within(empty).getByText('cards.session.markFilter.empty.title')).toBeInTheDocument()
    expect(within(empty).getByText('cards.session.markFilter.empty.body')).toBeInTheDocument()
    // Not the tag copy, which would tell the user to remove a tag they never set.
    expect(screen.queryByText('cards.session.tagFilter.empty.title')).not.toBeInTheDocument()
  })

  it('clears both dimensions from the empty state, not just the one that emptied it', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1&tags=verbs')
    renderSession({ cards: makeTaggedCards() })

    const empty = await screen.findByTestId('tag-filter-empty')
    fireEvent.click(within(empty).getByLabelText('cards.session.markFilter.clear'))

    expect(mockSearchParams.has('marked')).toBe(false)
    expect(mockSearchParams.has('tags')).toBe(false)
    expect(screen.queryByTestId('tag-filter-empty')).not.toBeInTheDocument()
  })
})

/*
 * HDR-003 — the header as one row closed by a progress seam.
 *
 * Structure, not pixels. What is pinned is that the four things that used to be
 * spread over three rows now share one container, that progress is an edge
 * beneath it rather than an object inside it, and that the whole assembly still
 * disappears in fullscreen. ADR-011.
 */
describe('session header — one row', () => {
  const headerRow = () => screen.queryByTestId('session-header-row')

  it('puts the count, the filters and the mark in one container', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-footer')

    const row = headerRow()
    expect(within(row).getByText(/cards\.session\.card/)).toBeInTheDocument()
    expect(within(row).getByTestId('session-filter-bar')).toBeInTheDocument()
    expect(within(row).getByTestId('mark-toggle')).toBeInTheDocument()
    expect(within(row).getByLabelText('cards.session.goBack')).toBeInTheDocument()
  })

  it('names the mark instead of leaving it an unlabelled glyph', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-footer')

    // The whole point of HDR-001 reaching this surface: visible text, and no
    // aria-label to contradict it (WCAG 2.5.3).
    expect(screen.getByTestId('mark-toggle')).toHaveTextContent('cards.mark.action')
    expect(screen.getByTestId('mark-toggle')).not.toHaveAttribute('aria-label')
  })

  it('renders progress as a seam under the row, not inside it', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })

    const seam = await screen.findByTestId('session-progress')
    expect(seam).toBeInTheDocument()
    expect(within(headerRow()).queryByTestId('session-progress')).not.toBeInTheDocument()
  })

  it('drops the seam in the filtered-empty state, where there is no position to report', async () => {
    mockSearchParams = new URLSearchParams('mode=browse&marked=1')
    renderSession({ cards: makeCards() })
    await screen.findByTestId('tag-filter-empty')

    expect(screen.queryByTestId('session-progress')).not.toBeInTheDocument()
    // The row itself stays: it carries the filter bar, which is the way out.
    expect(within(headerRow()).getByTestId('session-filter-bar')).toBeInTheDocument()
  })

  it('takes the whole row away in fullscreen, mark and filters included', async () => {
    mockSearchParams = new URLSearchParams('mode=browse')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-header-row')

    fireEvent.click(screen.getByLabelText('cards.session.enterFullscreen'))

    expect(headerRow()).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-progress')).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-filter-bar')).not.toBeInTheDocument()
  })

  it('renders the row without a filter bar in study mode when the deck has marks but no tags', async () => {
    mockSearchParams = new URLSearchParams('mode=study')
    renderSession({ cards: makeMarkedCards() })
    await screen.findByTestId('session-footer')

    expect(within(headerRow()).getByText(/cards\.session\.card/)).toBeInTheDocument()
    // Marks alone give study mode nothing to filter by (ADR-010), and with no
    // tags either there is no bar at all.
    expect(screen.queryByTestId('session-filter-bar')).not.toBeInTheDocument()
    // The mark is not a filter — it acts on the card, so it survives study mode.
    expect(within(headerRow()).getByTestId('mark-toggle')).toBeInTheDocument()
  })
})

/*
 * ADR-014 — tags may narrow the SM-2 queue; the mark may not; and a filtered
 * view can never be written back over the deck. Each guard here was checked to
 * bite: revert the tag gate and the first two fail, revert the by-id write in
 * handleGrade and the grading test fails, revert the completion count and the
 * last two fail.
 */
const makeTaggedMarkedCards = () => makeTaggedCards().map((card, i) => ({ ...card, marked_at: i === 0 ? MARKED_AT : null }))

describe('study mode tag filter (ADR-014)', () => {
  it('renders the tag segment in study mode and honours ?tags= on the URL, in the server order', async () => {
    mockSearchParams = new URLSearchParams('mode=study&tags=verbs')
    renderSession({ cards: makeTaggedCards() })

    expect(await findTagsSegment()).toBeInTheDocument()
    // tc1 + tc3 carry 'verbs' — 2 of the 3 due cards, and tc1 first.
    expect(screen.getAllByText(/cards\.session\.card.*"current":1,"total":2/).length).toBeGreaterThan(0)
    expect(screen.getByText('Alpha Q')).toBeInTheDocument()
  })

  it('narrows the queue when a tag is picked from the segment', async () => {
    mockSearchParams = new URLSearchParams('mode=study')
    renderSession({ cards: makeTaggedCards() })
    await screen.findByTestId('session-footer')

    await selectTag('nouns')

    // tc2 + tc3 carry 'nouns'.
    await waitFor(() => expect(screen.getAllByText(/cards\.session\.card.*"total":2/).length).toBeGreaterThan(0))
    expect(mockSearchParams.get('tags')).toBe('nouns')
    expect(mockSearchParams.get('mode')).toBe('study')
  })

  it('never renders the marked segment in study mode, even on a deck with marks and tags', async () => {
    mockSearchParams = new URLSearchParams('mode=study&marked=1')
    renderSession({ cards: makeTaggedMarkedCards() })

    expect(await findTagsSegment()).toBeInTheDocument()
    expect(markChip()).not.toBeInTheDocument()
    // ?marked=1 changed nothing: all three due cards.
    expect(screen.getAllByText(/cards\.session\.card.*"total":3/).length).toBeGreaterThan(0)
  })

  it('still grades, and keeps the hidden cards in the deck', async () => {
    mockSearchParams = new URLSearchParams('mode=study&tags=verbs')
    renderSession({
      cards: makeTaggedCards(),
      // sm2_data exercises the backend-sync write as well as the optimistic one.
      reviewResponse: {
        sm2_data: {
          last_reviewed: '2026-09-05T10:00:00',
          next_review: '2026-09-11T10:00:00',
          ease_factor: 2.6,
          interval: 6,
          repetitions: 2
        },
        xp: { xp_awarded: 2, level_up: false, new_level: 3, new_stage: 2, current_xp: 120, xp_for_next_level: 30, level_progress: 0.4 }
      }
    })
    await screen.findByTestId('session-footer')

    fireEvent.click(await screen.findByText('cards.session.grading.good')) // tc1 -> good, advance to tc3
    await waitFor(() => expect(cardsService.review).toHaveBeenCalledWith('tc1', 'good', 'study'))
    expect(screen.getByText('Gamma Q')).toBeInTheDocument()

    // Drop the filter: tc2, hidden while tc1 was graded, must still be there.
    await selectTag('verbs')
    await waitFor(() => expect(screen.getAllByText(/cards\.session\.card.*"total":3/).length).toBeGreaterThan(0))
    // And the user is still on tc3, now at position 3 of 3.
    expect(screen.getAllByText(/cards\.session\.card.*"current":3,"total":3/).length).toBeGreaterThan(0)
  })

  it('counts the filtered session on completion and says how many due cards were outside it', async () => {
    mockSearchParams = new URLSearchParams('mode=study&tags=verbs')
    renderSession({ cards: makeTaggedCards() })
    await screen.findByTestId('session-footer')

    fireEvent.click(await screen.findByText('cards.session.grading.good')) // tc1
    fireEvent.click(await screen.findByText('cards.session.grading.good')) // tc3 -> complete
    await screen.findByText('cards.session.complete.cardsReviewed')

    expect(screen.getByText('cards.session.complete.body:{"count":2}')).toBeInTheDocument()
    expect(screen.getByTestId('complete-outside-filter')).toHaveTextContent('cards.session.complete.outsideFilter:{"count":1}')
    // The session bonus and the summary fired once, for the two cards seen.
    expect(mockAwardSessionXp).toHaveBeenCalledTimes(1)
    expect(mockQueueIntervention).toHaveBeenCalledWith(expect.objectContaining({ type: 'session_summary', session_total_cards: 2 }))
  })

  it('says nothing about cards outside the filter when there is no filter', async () => {
    mockSearchParams = new URLSearchParams('mode=study')
    renderSession({ cards: makeTaggedCards() })
    await screen.findByTestId('session-footer')

    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    fireEvent.click(await screen.findByText('cards.session.grading.good'))
    await screen.findByText('cards.session.complete.cardsReviewed')

    expect(screen.getByText('cards.session.complete.body:{"count":3}')).toBeInTheDocument()
    expect(screen.queryByTestId('complete-outside-filter')).not.toBeInTheDocument()
  })
})
