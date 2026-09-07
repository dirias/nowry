/**
 * Phase 28 Plan 01 — AgentContext.js isStudySessionFullscreen triad test
 * (PET-01/PET-02). Mirrors SubscriptionContext.test.js's Provider +
 * TestConsumer-via-callback + act()-wrapped-setter idiom for a
 * reducer-backed context.
 *
 * Phase 28 Plan 05 (gap closure, WR-01) — the useAuth mock is now driven by
 * a `mock`-prefixed mutable closure variable (jest.mock factories may only
 * reference out-of-scope vars whose names start with `mock`) so individual
 * tests can enable the INIT-fetch effect to exercise the async
 * INIT-vs-mount-effect race.
 */
import React from 'react'
import { render, act } from '@testing-library/react'

// AgentProvider calls useAuth() and useTranslation() unconditionally at the
// top, and agentService is called from mount-time effects — all three need
// mocking, per the PATTERNS test skeleton.
let mockAuthValue = { user: null, isAuthenticated: false }
jest.mock('../AuthContext', () => ({
  useAuth: () => mockAuthValue
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))
jest.mock('../../api/services/agent.service', () => ({
  agentService: {
    getState: jest.fn(),
    getNudge: jest.fn(),
    chat: jest.fn(),
    awardSessionXp: jest.fn(),
    awardStreakXp: jest.fn()
  }
}))

import { AgentProvider, usePet } from '../AgentContext'
import { agentService } from '../../api/services/agent.service'

beforeEach(() => {
  mockAuthValue = { user: null, isAuthenticated: false }
  jest.clearAllMocks()
})

const TestConsumer = ({ onRender }) => {
  const ctx = usePet()
  onRender(ctx)
  return <div data-testid='consumer'>ok</div>
}

describe('AgentContext — isInStudySession / isStudySessionFullscreen (Phase 28, PET-01/PET-02)', () => {
  test('initial state: isStudySessionFullscreen is false', () => {
    let capturedCtx
    render(
      <AgentProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </AgentProvider>
    )
    expect(capturedCtx.isStudySessionFullscreen).toBe(false)
  })

  test('setStudySessionFullscreen(true) flips isStudySessionFullscreen to true', () => {
    let capturedCtx
    render(
      <AgentProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </AgentProvider>
    )
    act(() => {
      capturedCtx.setStudySessionFullscreen(true)
    })
    expect(capturedCtx.isStudySessionFullscreen).toBe(true)
  })

  test('usePet throws outside AgentProvider (regression guard)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(<TestConsumer onRender={() => {}} />)
    }).toThrow('usePet must be used within an AgentProvider')
    spy.mockRestore()
  })
})

describe('INIT does not clobber study-session flags (WR-01 regression)', () => {
  test('isInStudySession survives a later-resolving INIT', async () => {
    mockAuthValue = { user: { full_name: 'Test User' }, isAuthenticated: true }

    let resolveGetState
    agentService.getState.mockReturnValue(
      new Promise((res) => {
        resolveGetState = res
      })
    )

    let capturedCtx
    render(
      <AgentProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </AgentProvider>
    )

    // Simulate StudySession.js's synchronous mount effect — fires BEFORE
    // the deferred getState() promise (i.e. INIT) resolves.
    act(() => {
      capturedCtx.setStudySession(true)
    })
    expect(capturedCtx.isInStudySession).toBe(true)

    // Now resolve INIT — this must NOT clobber the flag back to false.
    await act(async () => {
      resolveGetState({
        mood: 'idle',
        level: 1,
        current_xp: 0,
        current_stage: 1,
        preferred_name: 'Test User',
        tier: 'free',
        messages_used: 0,
        messages_limit: 50
      })
    })

    expect(capturedCtx.isInStudySession).toBe(true)
  })

  test('isStudySessionFullscreen survives a later-resolving INIT', async () => {
    mockAuthValue = { user: { full_name: 'Test User' }, isAuthenticated: true }

    let resolveGetState
    agentService.getState.mockReturnValue(
      new Promise((res) => {
        resolveGetState = res
      })
    )

    let capturedCtx
    render(
      <AgentProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </AgentProvider>
    )

    act(() => {
      capturedCtx.setStudySessionFullscreen(true)
    })
    expect(capturedCtx.isStudySessionFullscreen).toBe(true)

    await act(async () => {
      resolveGetState({
        mood: 'idle',
        level: 1,
        current_xp: 0,
        current_stage: 1,
        preferred_name: 'Test User',
        tier: 'free',
        messages_used: 0,
        messages_limit: 50
      })
    })

    expect(capturedCtx.isStudySessionFullscreen).toBe(true)
  })
})

describe('level-up deferral (PET-004)', () => {
  const renderCtx = () => {
    let ctx
    render(
      <AgentProvider>
        <TestConsumer
          onRender={(c) => {
            ctx = c
          }}
        />
      </AgentProvider>
    )
    return () => ctx
  }

  const grant = (over = {}) => ({
    xp_awarded: 2,
    level_up: true,
    new_level: 4,
    new_stage: 2,
    current_xp: 225,
    xp_for_next_level: 175,
    level_progress: 0,
    ...over
  })

  test('a mid-session level-up is banked, not shown', async () => {
    const get = renderCtx()
    await act(async () => get().setStudySession(true))
    await act(async () => get().applyReviewXp(grant()))

    expect(get().justLeveledUp).toBe(false)
    // The pet still advances immediately, so it looks evolved when the
    // celebration finally plays.
    expect(get().level).toBe(4)
    expect(get().stage).toBe(2)
  })

  test('flushing releases the banked level-up', async () => {
    const get = renderCtx()
    await act(async () => get().setStudySession(true))
    await act(async () => get().applyReviewXp(grant()))
    await act(async () => get().flushPendingLevelUp())

    expect(get().justLeveledUp).toBe(true)
    expect(get().levelUpData).toEqual({ newLevel: 4, newStage: 2 })
  })

  test('outside a session a level-up shows immediately', async () => {
    const get = renderCtx()
    await act(async () => get().applyReviewXp(grant()))
    expect(get().justLeveledUp).toBe(true)
  })

  // Regression guard. isInStudySession only clears on StudySession's UNMOUNT,
  // so the summary screen is still "in session". awardSessionXp resolves after
  // StudySession has already called flushPendingLevelUp() — deferring there
  // would bank the level-up behind a flush that already ran, and the
  // celebration would never appear at all.
  test('an end-of-session level-up shows even though the session is still mounted', async () => {
    agentService.awardSessionXp.mockResolvedValue(grant({ xp_awarded: 15 }))
    agentService.awardStreakXp.mockResolvedValue(grant({ xp_awarded: 15 }))

    const get = renderCtx()
    await act(async () => get().setStudySession(true))
    // Mirrors StudySession's real ordering: flush first, grants resolve after.
    await act(async () => get().flushPendingLevelUp())
    await act(async () => {
      await get().awardSessionXp(10, 'deck-1')
    })

    expect(get().justLeveledUp).toBe(true)
    expect(get().levelUpData).toEqual({ newLevel: 4, newStage: 2 })
  })

  test('progress advances on a grant that crosses no level', async () => {
    const get = renderCtx()
    await act(async () => get().applyReviewXp(grant({ level_up: false, current_xp: 155, level_progress: 0.44 })))

    expect(get().justLeveledUp).toBe(false)
    expect(get().xp).toBe(155)
    expect(get().levelProgress).toBe(0.44)
  })
})
