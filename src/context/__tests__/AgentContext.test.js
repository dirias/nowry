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
    chat: jest.fn()
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
