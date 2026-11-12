/**
 * `/plans` while prices are hidden (ADR-073, GTM-013, GTM-015): the tiers and
 * what they hold, the beta sentence where the amounts and the billing toggle
 * were, and no key that starts a checkout.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, options) => (options?.price ? `${key}:${options.price}` : key) })
}))

let mockShowPricing = false
jest.mock('@nowry/core/domain/plans', () => {
  const actual = jest.requireActual('@nowry/core/domain/plans')
  return {
    ...actual,
    get SHOW_PRICING() {
      return mockShowPricing
    }
  }
})

let mockBeta = { active: true, invite_required: true, upgrades_open: false }
jest.mock('@nowry/core/context/BetaContext', () => ({ useBeta: () => ({ config: mockBeta, loading: false }) }))

jest.mock('@nowry/core/hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'free', paidTier: 'free', isBeta: false }) }))

const mockCheckout = jest.fn()
jest.mock('@nowry/core/api/services', () => ({
  subscriptionService: { createCheckoutSession: (...args) => mockCheckout(...args) }
}))

import PlansPage from '../PlansPage'

afterEach(() => {
  mockShowPricing = false
  mockBeta = { active: true, invite_required: true, upgrades_open: false }
})

it('prints no amount, no billing toggle and no checkout key, even with upgrades open on the server', () => {
  mockBeta = { active: true, invite_required: true, upgrades_open: true }
  const { container } = render(<PlansPage />)
  expect(screen.getByText('beta.pricing.message')).toBeInTheDocument()
  expect(screen.getByText('subscription.tier.plus')).toBeInTheDocument()
  expect(container.textContent).not.toMatch(/\$\d/)
  expect(screen.queryByText('plans.billingToggle.monthly')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'plans.cta.upgradeToPlus' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'plans.cta.upgradeToPro' })).not.toBeInTheDocument()
})

it('prints the amounts and the checkout keys once prices are shown and upgrades are open', () => {
  mockShowPricing = true
  mockBeta = { active: false, invite_required: false, upgrades_open: true }
  render(<PlansPage />)
  expect(screen.getByText('$8.99')).toBeInTheDocument()
  expect(screen.getByText('plans.billingToggle.monthly')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'plans.cta.upgradeToPlus' })).toBeInTheDocument()
  expect(screen.queryByText('beta.pricing.message')).not.toBeInTheDocument()
})
