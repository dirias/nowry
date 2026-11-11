/**
 * Prices are hidden for the beta behind one flag (ADR-073, GTM-013, GTM-014).
 *
 * With `SHOW_PRICING` off, the landing's `#pricing` section and `/pricing` say
 * one sentence and offer one key to the sign-up; with it on, the tier cards and
 * their amounts are back, untouched.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

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

import Pricing from '../landing/Pricing'
import PricingPage from '../PricingPage'

const AMOUNT = /\$\d/

const Where = () => {
  const { pathname, hash } = useLocation()
  return <div data-testid='where'>{pathname + hash}</div>
}

afterEach(() => {
  mockShowPricing = false
})

describe('the landing pricing section', () => {
  const renderSection = () =>
    render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>
    )

  it('says the beta sentence under the same anchor, with no amount, heading or tier', () => {
    const { container } = renderSection()
    expect(container.querySelector('section#pricing')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'beta.earlyAccess' })).toBeInTheDocument()
    expect(screen.getByText('beta.pricing.message')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'beta.pricing.cta' })).toHaveAttribute('href', '/register')
    expect(container.textContent).not.toMatch(AMOUNT)
    expect(screen.queryByText('landing.pricing.title')).not.toBeInTheDocument()
    expect(screen.queryByText('landing.pricing.lead')).not.toBeInTheDocument()
    expect(screen.queryByText('subscription.tier.plus')).not.toBeInTheDocument()
  })

  it('shows the three tiers and their amounts once the flag is on', () => {
    mockShowPricing = true
    const { container } = renderSection()
    expect(container.querySelector('section#pricing')).toBeInTheDocument()
    expect(screen.getByText('landing.pricing.title')).toBeInTheDocument()
    expect(screen.getByText('$8.99')).toBeInTheDocument()
    expect(screen.getByText('$19.99')).toBeInTheDocument()
    expect(screen.queryByText('beta.pricing.message')).not.toBeInTheDocument()
  })
})

describe('/pricing', () => {
  const renderRoute = () =>
    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <Routes>
          <Route path='/pricing' element={<PricingPage />} />
          <Route path='/' element={<Where />} />
        </Routes>
      </MemoryRouter>
    )

  it('is a page with one h1, the sentence and the key to the sign-up', () => {
    const { container } = renderRoute()
    expect(screen.getByRole('heading', { level: 1, name: 'beta.earlyAccess' })).toBeInTheDocument()
    expect(screen.getByText('beta.pricing.message')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'beta.pricing.cta' })).toHaveAttribute('href', '/register')
    expect(container.textContent).not.toMatch(AMOUNT)
  })

  it('sends a visitor to the landing section once prices are shown', () => {
    mockShowPricing = true
    renderRoute()
    expect(screen.getByTestId('where')).toHaveTextContent('/#pricing')
  })
})
