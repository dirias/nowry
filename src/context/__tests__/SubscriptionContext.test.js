/**
 * Phase 4 — SubscriptionContext Tests (GATE-03, GATE-05)
 *
 * Tests verify:
 * - SubscriptionProvider renders children without crashing
 * - useSubscriptionContext returns correct initial state
 * - dismissUpgrade() sets upgradeDismissed = true
 * - upgradeDismissed is false by default (session-reset behavior)
 * - openUpgradeModal() and closeUpgradeModal() toggle isUpgradeModalOpen
 * - useSubscriptionContext throws outside SubscriptionProvider
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// These imports will fail until SubscriptionContext.js is created (Wave 0 expected)
import { SubscriptionProvider, useSubscriptionContext } from '../SubscriptionContext'

// Helper: test component that reads context
const TestConsumer = ({ onRender }) => {
  const ctx = useSubscriptionContext()
  onRender(ctx)
  return <div data-testid='consumer'>ok</div>
}

describe('SubscriptionContext — GATE-03, GATE-05', () => {
  test('SubscriptionProvider renders children', () => {
    render(
      <SubscriptionProvider>
        <div data-testid='child'>hello</div>
      </SubscriptionProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  test('initial state: upgradeDismissed is false', () => {
    let capturedCtx
    render(
      <SubscriptionProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </SubscriptionProvider>
    )
    expect(capturedCtx.upgradeDismissed).toBe(false)
  })

  test('dismissUpgrade sets upgradeDismissed to true', () => {
    let capturedCtx
    render(
      <SubscriptionProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </SubscriptionProvider>
    )
    act(() => {
      capturedCtx.dismissUpgrade()
    })
    expect(capturedCtx.upgradeDismissed).toBe(true)
  })

  test('isUpgradeModalOpen is false initially', () => {
    let capturedCtx
    render(
      <SubscriptionProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </SubscriptionProvider>
    )
    expect(capturedCtx.isUpgradeModalOpen).toBe(false)
  })

  test('openUpgradeModal sets isUpgradeModalOpen to true', () => {
    let capturedCtx
    render(
      <SubscriptionProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </SubscriptionProvider>
    )
    act(() => {
      capturedCtx.openUpgradeModal()
    })
    expect(capturedCtx.isUpgradeModalOpen).toBe(true)
  })

  test('closeUpgradeModal sets isUpgradeModalOpen to false', () => {
    let capturedCtx
    render(
      <SubscriptionProvider>
        <TestConsumer
          onRender={(ctx) => {
            capturedCtx = ctx
          }}
        />
      </SubscriptionProvider>
    )
    act(() => {
      capturedCtx.openUpgradeModal()
      capturedCtx.closeUpgradeModal()
    })
    expect(capturedCtx.isUpgradeModalOpen).toBe(false)
  })

  test('useSubscriptionContext throws outside SubscriptionProvider', () => {
    // Suppress React error boundary noise in test output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(<TestConsumer onRender={() => {}} />)
    }).toThrow('useSubscriptionContext must be used within a SubscriptionProvider')
    spy.mockRestore()
  })
})
