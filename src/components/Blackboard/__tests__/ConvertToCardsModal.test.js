import React from 'react'
import { render } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))

describe.skip('ConvertToCardsModal', () => {
  it('shows CircularProgress + caption in loading state', () => {
    // Wave 0 stub — implement in 07-05-PLAN.md
  })

  it('renders card preview list with front/back in success state', () => {
    // Wave 0 stub — implement in 07-05-PLAN.md
  })

  it('shows danger Alert with retry button on card generation error', () => {
    // Wave 0 stub — implement in 07-05-PLAN.md
  })

  it('shows warning Alert in empty state (no extractable text)', () => {
    // Wave 0 stub — implement in 07-05-PLAN.md
  })
})
