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

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
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
  petColor: 'blue',
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
  isStudySessionFullscreen: false
}

beforeEach(() => {
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
