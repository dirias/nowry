/**
 * Phase 17 — EventFormModal tests (MOB-03).
 * Wave 0 stubs — smoke tests confirming modal renders without crashing
 * at open=true and open=false. Full MOB-03 sx verification done via grep
 * in the implementation plan (17-03-PLAN) acceptance criteria.
 */
import React from 'react'
import { render } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k })
}))
jest.mock('../../../api/services/tasks.service', () => ({
  tasksService: { create: jest.fn(), update: jest.fn() }
}))
jest.mock('../../../api/services/annualPlanning.service', () => ({
  annualPlanningService: {
    createPriority: jest.fn(),
    updatePriority: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    createActivity: jest.fn(),
    updateActivity: jest.fn()
  }
}))
jest.mock('../../../hooks/useAnnualPlan', () => ({
  useAnnualPlan: () => ({ plan: null, areas: [], goals: [], loading: false })
}))

describe('Phase 17 MOB-03: EventFormModal smoke tests', () => {
  it('renders without crashing when open=true', () => {
    const EventFormModal = require('../EventFormModal').default
    expect(() => render(
      <EventFormModal open={true} onClose={jest.fn()} onSuccess={jest.fn()} mode='create' />
    )).not.toThrow()
  })

  it('renders without crashing when open=false', () => {
    const EventFormModal = require('../EventFormModal').default
    expect(() => render(
      <EventFormModal open={false} onClose={jest.fn()} onSuccess={jest.fn()} mode='create' />
    )).not.toThrow()
  })
})
