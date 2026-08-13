import React from 'react'
import { render } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))

describe.skip('ShareBoardModal', () => {
  it('renders invite input form when open', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })

  it('shows inline danger Alert on user-not-found error', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })

  it('adds collaborator chip to list on success', () => {
    // Wave 0 stub — implement in 07-04-PLAN.md
  })
})
