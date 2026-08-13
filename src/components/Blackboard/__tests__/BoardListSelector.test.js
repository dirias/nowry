import React from 'react'
import { render } from '@testing-library/react'

// i18n mock
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))

// Skip: component not yet created
describe.skip('BoardListSelector', () => {
  it('renders board list in loading state with 3 skeleton rows', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })

  it('renders owned and shared boards in success state', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })

  it('shows locked "New board" button with tooltip for Free and Plus tiers', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })

  it('shows enabled "New board" button for Pro tier', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })
})
