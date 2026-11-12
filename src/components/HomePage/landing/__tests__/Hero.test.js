/**
 * The hero fits the gate (WAIT-003, docs/prd-road-to-market.md FR-014).
 *
 * While the server requires an invite, the one thing a visitor without a code
 * can finish is the waitlist, so that is the solid key; a code holder gets a
 * plain link. With the gate off the hero is what it was.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'es-MX' } }) }))
jest.mock('@nowry/core/api/services/beta.service', () => ({ betaService: { joinWaitlist: jest.fn() } }))

let mockBeta = { active: true, invite_required: true, upgrades_open: false }
let mockAnswer = { loading: false, failed: false }
jest.mock('@nowry/core/context/BetaContext', () => ({ useBeta: () => ({ config: mockBeta, ...mockAnswer }) }))

import Hero from '../Hero'

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero frame={<div />} phoneFrame={<div />} />
    </MemoryRouter>
  )

describe('with invites required', () => {
  beforeEach(() => {
    mockBeta = { active: true, invite_required: true, upgrades_open: false }
  })

  it('makes the waitlist the main action and drops "Create a free account"', () => {
    renderHero()
    const form = screen.getByRole('form', { name: 'beta.waitlist.title' })
    expect(within(form).getByRole('button', { name: 'beta.waitlist.cta' })).toHaveAttribute('type', 'submit')
    expect(screen.queryByRole('link', { name: 'landing.hero.cta' })).not.toBeInTheDocument()
    expect(screen.queryByText('landing.hero.fineprint')).not.toBeInTheDocument()
  })

  it('keeps a plain way in for someone who has a code, and the library link', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'beta.haveCode' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'landing.hero.proof' })).toHaveAttribute('href', '/browse')
  })

  it('says what the email is used for, and states no number', () => {
    const { container } = renderHero()
    expect(screen.getByText('beta.waitlist.purpose')).toBeInTheDocument()
    expect(container.querySelector('section').textContent).not.toMatch(/\d/)
  })

  it('offers exactly one solid key', () => {
    const { container } = renderHero()
    expect(container.querySelectorAll('.MuiButton-variantSolid')).toHaveLength(1)
  })
})

describe('with invites not required', () => {
  beforeEach(() => {
    mockBeta = { active: false, invite_required: false, upgrades_open: true }
  })

  it('is the hero it was: create an account, the library, the fine print, no waitlist', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'landing.hero.cta' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'landing.hero.proof' })).toHaveAttribute('href', '/browse')
    expect(screen.getByText('landing.hero.fineprint')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'beta.haveCode' })).not.toBeInTheDocument()
    expect(screen.queryByText('beta.waitlist.purpose')).not.toBeInTheDocument()
  })

  it('shows the Beta mark only while the beta is active', () => {
    renderHero()
    expect(screen.queryByText('beta.mark')).not.toBeInTheDocument()
  })
})

// WAIT-011, FR-015: the hero offers no account until the server has said one can be made.
describe('before the gate has answered', () => {
  const unanswered = { active: false, invite_required: false, upgrades_open: true }
  afterEach(() => {
    mockAnswer = { loading: false, failed: false }
  })

  it('shows a placeholder while loading: no account key, no waitlist form, no fine print', () => {
    mockBeta = unanswered
    mockAnswer = { loading: true, failed: false }
    renderHero()
    expect(screen.getByTestId('hero-gate-pending')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'landing.hero.cta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByText('landing.hero.fineprint')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'landing.hero.proof' })).toHaveAttribute('href', '/browse')
  })

  it('is the gated hero when the call failed', () => {
    mockBeta = unanswered
    mockAnswer = { loading: false, failed: true }
    renderHero()
    expect(screen.getByRole('form', { name: 'beta.waitlist.title' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'beta.haveCode' })).toHaveAttribute('href', '/register')
    expect(screen.queryByRole('link', { name: 'landing.hero.cta' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('hero-gate-pending')).not.toBeInTheDocument()
  })
})
