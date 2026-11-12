/**
 * The plan badge (ADR-079, FR-025, BETA-003): "Beta" in the brand's teal for a
 * tester, the paid plan's name for an account that pays, nothing for free.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { CssVarsProvider } from '@mui/joy/styles'
import { betaBadgeTone } from '@nowry/core/domain/access'
import PlanBadge from '../PlanBadge'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

const show = (subscription, props = {}) =>
  render(
    <CssVarsProvider>
      <PlanBadge subscription={subscription} {...props} />
    </CssVarsProvider>
  )

it('shows Beta for a tester, on Ink Teal', () => {
  show({ tier: 'pro', access: 'beta', paid_tier: 'free' })
  const chip = screen.getByText('beta.mark').closest('.MuiChip-root')
  expect(chip).toHaveStyle({ backgroundColor: betaBadgeTone('light').bg })
})

it('shows the paid plan for an account that pays, a tester included', () => {
  show({ tier: 'pro', access: 'beta', paid_tier: 'plus' })
  expect(screen.getByText('subscription.tier.plus')).toBeInTheDocument()
  expect(screen.queryByText('beta.mark')).not.toBeInTheDocument()
})

it('shows Pro for a paying Pro account', () => {
  show({ tier: 'pro', access: 'paid', paid_tier: 'pro' })
  expect(screen.getByText('subscription.tier.pro')).toBeInTheDocument()
})

it('shows nothing for a free account unless asked to name the plan', () => {
  const { container } = show({ tier: 'free' })
  expect(container.querySelector('.MuiChip-root')).toBeNull()
  show({ tier: 'free' }, { showFree: true })
  expect(screen.getByText('subscription.tier.free')).toBeInTheDocument()
})
