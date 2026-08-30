/**
 * Phase 28 Plan 02 — StudyPet.js docking / roam-gate / z-index / drag-stays-enabled
 * behavior tests (PET-01/PET-02).
 *
 * Pre-implementation (Task 1) these behavior tests are expected to FAIL — that is
 * the intended RED state. Task 2 (StudyPet.js edits) turns them GREEN.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Z_PET_RESTING, Z_PET_FULLSCREEN } from '../../../constants/zIndex'

// StudyPet calls useLocation as well as useNavigate — it suppresses the pet on
// the registration/onboarding routes. The mock provided only useNavigate, so
// every render in this file threw and all 8 tests failed; the suite has been
// dead rather than merely incomplete. `mock`-prefixed so individual tests can
// drive the route (Jest's documented exception for jest.mock factories).
let mockPathname = '/'
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: mockPathname, search: '', hash: '', state: null, key: 'test' })
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

jest.mock('../../../api/services/quizService', () => ({
  quizService: {
    getQuizDecks: jest.fn().mockResolvedValue({ data: [] }),
    startQuizSession: jest.fn().mockResolvedValue({ data: {} }),
    submitQuizAnswer: jest.fn().mockResolvedValue({ data: {} })
  }
}))

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true })
}))

jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() })
}))

jest.mock('../../../theme/DynamicThemeProvider', () => ({
  useThemePreferences: () => ({ themeColor: null })
}))

// mockUsePet factory — every test can override individual fields via
// mockUsePet.mockReturnValue({ ...base, isInStudySession: true }).
const mockUsePet = jest.fn()
jest.mock('../../../context/AgentContext', () => ({
  usePet: (...args) => mockUsePet(...args)
}))

// require-after-mock: import the component only after every jest.mock() call
// above has registered, per the StudySession.test.js idiom.
const StudyPet = require('../StudyPet').default

/** Full usePet() mock surface — mirrors the exact destructure at StudyPet.js lines 385-422. */
const basePetState = {
  isOpen: false,
  mood: 'idle',
  level: 1,
  stage: 1,
  justLeveledUp: false,
  levelUpData: null,
  levelUpClear: jest.fn(),
  preferredName: null,
  tier: 'free',
  history: [],
  isTyping: false,
  error: null,
  messagesUsed: 0,
  messagesLimit: 10,
  open: jest.fn(),
  close: jest.fn(),
  sendMessage: jest.fn(),
  clearError: jest.fn(),
  petName: 'Buddy',
  petSpecies: 'cat',
  avatarUrl: null,
  avatarGenerating: false,
  avatarRegenPending: false,
  generateAvatar: jest.fn(),
  clearAvatarUrl: jest.fn(),
  isRoamingEnabled: true,
  companionMessage: null,
  companionIsLoading: false,
  dismissCompanion: jest.fn(),
  openChatFromCompanion: jest.fn(),
  pendingQuizConfig: null,
  showDeckSelector: false,
  clearQuizConfig: jest.fn(),
  showDeckSelectorAction: jest.fn(),
  hideDeckSelectorAction: jest.fn(),
  // Fields consumed by this plan (D-01/D-04/D-07/D-12/D-13)
  isInStudySession: false,
  isStudySessionFullscreen: false,
  // PET-001..008. This surface must mirror StudyPet's destructure exactly: a
  // field missing here reads as undefined, which silently disables the branch
  // it guards rather than failing — which is how the default-companion path
  // went uncovered.
  xp: 0,
  xpForNextLevel: null,
  levelProgress: null,
  isDefaultCompanion: false,
  justRevealed: false,
  revealData: null,
  petRevealClear: jest.fn(),
  animationUrl: null,
  animationGenerating: false,
  animationRegenPending: false,
  generateAnimation: jest.fn(),
  resetCompanionSession: jest.fn(),
  setViewContext: jest.fn(),
  setStudySession: jest.fn(),
  setStudySessionFullscreen: jest.fn(),
  queueIntervention: jest.fn(),
  cheer: jest.fn(),
  applyReviewXp: jest.fn(),
  flushPendingLevelUp: jest.fn(),
  awardSessionXp: jest.fn()
}

/** The orb itself — portal-rendered to document.body. */
const orb = () => document.getElementById('study-pet-orb')
const withPet = (over) => mockUsePet.mockReturnValue({ ...basePetState, ...over })

beforeEach(() => {
  mockPathname = '/'
  mockUsePet.mockReset()
  mockUsePet.mockReturnValue({ ...basePetState })
})

/**
 * Locates the portal-rendered outer container div (createPortal'd to document.body).
 * Distinguished from the click-outside backdrop (also position:'fixed') by its
 * `bottom: 24` inline style, which only the container carries.
 */
function getPetContainer() {
  const candidates = Array.from(document.body.querySelectorAll('div')).filter(
    (el) => el.style.position === 'fixed' && el.style.bottom === '24px'
  )
  return candidates[candidates.length - 1]
}

describe('Phase 28 Wave 2: StudyPet mount smoke test', () => {
  it('renders the orb without throwing', async () => {
    render(<StudyPet />)
    expect(await screen.findByLabelText('agent.aria.openBuddy')).toBeInTheDocument()
  })
})

// D-01/D-02: Pet docks bottom-left during an active study session (bottom-right otherwise).
describe('docking position', () => {
  it('docks bottom-left during an active study session', async () => {
    mockUsePet.mockReturnValue({ ...basePetState, isInStudySession: true })
    render(<StudyPet />)
    await screen.findByLabelText('agent.aria.openBuddy')
    const container = getPetContainer()
    expect(container.style.left).toBe('24px')
    expect(container.style.right).toBe('')
  })

  it('stays bottom-right when no study session is active', async () => {
    render(<StudyPet />)
    await screen.findByLabelText('agent.aria.openBuddy')
    const container = getPetContainer()
    expect(container.style.right).toBe('24px')
    expect(container.style.left).toBe('')
  })
})

// D-07: z-index bumps to Z_PET_FULLSCREEN only when BOTH isInStudySession AND
// isStudySessionFullscreen are true; every other combination rests at Z_PET_RESTING.
describe('centralized z-index (D-07, both-flags gate)', () => {
  it('bumps to Z_PET_FULLSCREEN when both isInStudySession and isStudySessionFullscreen are true', async () => {
    mockUsePet.mockReturnValue({ ...basePetState, isInStudySession: true, isStudySessionFullscreen: true })
    render(<StudyPet />)
    await screen.findByLabelText('agent.aria.openBuddy')
    const container = getPetContainer()
    expect(container.style.zIndex).toBe(String(Z_PET_FULLSCREEN))
  })

  it('rests at Z_PET_RESTING when both flags are false', async () => {
    render(<StudyPet />)
    await screen.findByLabelText('agent.aria.openBuddy')
    const container = getPetContainer()
    expect(container.style.zIndex).toBe(String(Z_PET_RESTING))
  })

  it('rests at Z_PET_RESTING when only isStudySessionFullscreen is true (no active session)', async () => {
    mockUsePet.mockReturnValue({ ...basePetState, isInStudySession: false, isStudySessionFullscreen: true })
    render(<StudyPet />)
    await screen.findByLabelText('agent.aria.openBuddy')
    const container = getPetContainer()
    expect(container.style.zIndex).toBe(String(Z_PET_RESTING))
  })

  it('rests at Z_PET_RESTING when only isInStudySession is true (non-fullscreen study session)', async () => {
    mockUsePet.mockReturnValue({ ...basePetState, isInStudySession: true, isStudySessionFullscreen: false })
    render(<StudyPet />)
    await screen.findByLabelText('agent.aria.openBuddy')
    const container = getPetContainer()
    expect(container.style.zIndex).toBe(String(Z_PET_RESTING))
  })
})

// D-12: manual drag stays enabled/unconditional during an active study session —
// the draggable orb must still mount even while docked/roam-suspended.
describe('drag stays enabled during study session (D-12, locked)', () => {
  it('renders the draggable pet orb while isInStudySession is true', async () => {
    mockUsePet.mockReturnValue({ ...basePetState, isInStudySession: true })
    render(<StudyPet />)
    expect(await screen.findByLabelText('agent.aria.openBuddy')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PET-001..008 — what the orb actually renders
//
// The suite above only ever covered docking and z-index. Everything the
// evolution work added went untested because this file threw on every render
// for a missing useLocation mock, so nothing here could have caught a
// regression in it.
// ---------------------------------------------------------------------------

describe('StudyPet — evolution stage rendering', () => {
  it('grows the orb as the pet evolves', () => {
    withPet({ stage: 1 })
    const { unmount } = render(<StudyPet />)
    const small = orb().style.width
    unmount()

    withPet({ stage: 6 })
    render(<StudyPet />)
    expect(parseInt(orb().style.width, 10)).toBeGreaterThan(parseInt(small, 10))
  })

  it('gives the first stage the egg silhouette and later stages a circle', () => {
    withPet({ stage: 1 })
    const { unmount } = render(<StudyPet />)
    expect(orb().style.borderRadius).not.toBe('50%')
    unmount()

    withPet({ stage: 4 })
    render(<StudyPet />)
    expect(orb().style.borderRadius).toBe('50%')
  })
})

describe('StudyPet — the default companion', () => {
  it('shows Nowry when the user has not personalised a pet', () => {
    withPet({ isDefaultCompanion: true, avatarUrl: null })
    render(<StudyPet />)
    expect(orb().querySelector('img')).toBeTruthy()
  })

  it('prefers the user’s own portrait over Nowry', () => {
    withPet({ isDefaultCompanion: true, avatarUrl: 'https://example.com/mine.png' })
    render(<StudyPet />)
    expect(orb().querySelector('img').getAttribute('src')).toBe('https://example.com/mine.png')
  })

  it('falls back to an emoji only when there is no art at all', () => {
    withPet({ isDefaultCompanion: false, avatarUrl: null })
    render(<StudyPet />)
    expect(orb().querySelector('img')).toBeNull()
    expect(orb().textContent).not.toBe('')
  })
})

describe('StudyPet — progress ring', () => {
  it('renders nothing until progress is actually known', () => {
    // An empty ring on first paint reads as "you have earned nothing", which
    // is usually false.
    withPet({ levelProgress: null })
    render(<StudyPet />)
    expect(orb().parentElement.querySelector('svg circle')).toBeNull()
  })

  it('draws the ring once progress is known', () => {
    withPet({ levelProgress: 0.42 })
    render(<StudyPet />)
    expect(orb().parentElement.querySelectorAll('svg circle').length).toBeGreaterThanOrEqual(2)
  })
})

describe('StudyPet — mood is legible', () => {
  it('renders a tired pet visibly duller than a happy one', () => {
    withPet({ mood: 'happy' })
    const { unmount } = render(<StudyPet />)
    const happy = orb().style.filter
    unmount()

    withPet({ mood: 'tired' })
    render(<StudyPet />)
    const tired = orb().style.filter

    expect(happy).toMatch(/saturate/)
    expect(tired).not.toBe(happy)
    const sat = (f) => parseFloat(f.match(/saturate\(([\d.]+)\)/)[1])
    expect(sat(tired)).toBeLessThan(sat(happy))
  })
})

describe('StudyPet — onboarding routes', () => {
  // The route check gates ROAMING, not rendering: the pet is parked at rest
  // rather than removed. Worth pinning, because "suppressed on onboarding" is
  // easy to read as "hidden" — I assumed exactly that and was wrong.
  //
  // The gate itself acts through framer-motion's animation controls, which
  // cannot be observed without mocking the whole module; that mock broke every
  // other test in this file, so it is deliberately not attempted here.
  it.each(['/register', '/onboarding', '/onboarding/topics', '/study'])('keeps the pet mounted on %s', (path) => {
    mockPathname = path
    render(<StudyPet />)
    expect(orb()).toBeTruthy()
  })
})
