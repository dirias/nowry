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
    expect(get().levelUpData).toEqual({ newLevel: 4, newStage: 2, fromStage: 1, evolved: true })
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
    expect(get().levelUpData).toEqual({ newLevel: 4, newStage: 2, fromStage: 1, evolved: true })
  })

  test('a grant carries how close the next form is, and the last form has none (EVO-004)', async () => {
    const get = renderCtx()
    await act(async () => get().applyReviewXp(grant({ level_up: false, stage_progress: 0.82 })))
    expect(get().stageProgress).toBe(0.82)
    await act(async () => get().applyReviewXp(grant({ level_up: false })))
    expect(get().stageProgress).toBe(0.82)
    await act(async () => get().applyReviewXp(grant({ level_up: false, stage_progress: null })))
    expect(get().stageProgress).toBeNull()
  })

  // EVO-003: an evolution gets the reveal, a level-up the toast.
  test('a level-up that keeps the stage is not an evolution', async () => {
    const get = renderCtx()
    await act(async () => get().applyReviewXp(grant({ new_level: 2, new_stage: 1 })))
    expect(get().levelUpData).toEqual({ newLevel: 2, newStage: 1, fromStage: 1, evolved: false })
  })

  test('two evolutions banked in one session reveal from the form last seen', async () => {
    const get = renderCtx()
    await act(async () => get().setStudySession(true))
    await act(async () => get().applyReviewXp(grant({ new_level: 3, new_stage: 2 })))
    await act(async () => get().applyReviewXp(grant({ new_level: 6, new_stage: 3 })))
    await act(async () => get().flushPendingLevelUp())
    expect(get().levelUpData).toEqual({ newLevel: 6, newStage: 3, fromStage: 1, evolved: true })
  })

  test('progress advances on a grant that crosses no level', async () => {
    const get = renderCtx()
    await act(async () => get().applyReviewXp(grant({ level_up: false, current_xp: 155, level_progress: 0.44 })))

    expect(get().justLeveledUp).toBe(false)
    expect(get().xp).toBe(155)
    expect(get().levelProgress).toBe(0.44)
  })
})

describe('a failed send (AI-005)', () => {
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

  test('holds a key the panel can translate, never the server detail', async () => {
    agentService.chat.mockRejectedValue({ response: { status: 503, data: { detail: 'ai_unavailable' } } })
    const get = renderCtx()
    await act(async () => get().sendMessage('Give me examples'))
    expect(get().error).toBe('agent.chat.unavailable')
  })

  test('a 502 is the generic sentence, not "AI service error"', async () => {
    agentService.chat.mockRejectedValue({ response: { status: 502, data: { detail: 'AI service error. Please try again.' } } })
    const get = renderCtx()
    await act(async () => get().sendMessage('Give me examples'))
    expect(get().error).toBe('agent.chat.failed')
  })
})

describe('history follows the subject (CHAT-008)', () => {
  test("another card's turns are not sent as history", async () => {
    agentService.chat.mockResolvedValue({ reply: 'ok', messages_used: 1, messages_limit: -1 })
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
    const cardA = { page: 'study_session', cardId: 'a', front: '効果' }
    const cardB = { page: 'study_session', cardId: 'b', front: '結果' }
    await act(async () => ctx.sendMessage('about A', cardA))
    await act(async () => ctx.sendMessage('about B', cardB))

    const [, historySent] = agentService.chat.mock.calls[1]
    expect(historySent).toEqual([])
    await act(async () => ctx.sendMessage('A again', cardA))
    expect(agentService.chat.mock.calls[2][1]).toEqual([
      { role: 'user', content: 'about A' },
      { role: 'model', content: 'ok' }
    ])
  })
})
