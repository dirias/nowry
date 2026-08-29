/**
 * PET-005 — StageJourney.
 *
 * The two things this surface exists to do, asserted directly:
 *  - names are permanent (they previously lived only in a 3.6s toast)
 *  - the next form is shown, named, with its distance — the anticipation hook
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

jest.mock('../../../api/services/agent.service', () => ({
  agentService: { getJourney: jest.fn() }
}))

// Both real modules pull in src/i18n.js, which errors outside the app entry.
jest.mock('../../../theme/DynamicThemeProvider', () => ({
  useThemePreferences: () => ({ themeColor: '#2a6971' })
}))

let mockAvatarUrl = null
jest.mock('../../../context/AgentContext', () => ({
  usePet: () => ({ avatarUrl: mockAvatarUrl })
}))

// PetOrb drags in framer-motion, the pet context and the whole StudyPet tree.
// This suite is about the ladder's logic, not the orb's rendering — which has
// its own coverage in stageSilhouette.test.js.
jest.mock('../StudyPet', () => ({
  PetOrb: ({ stage, avatarUrl, blankFace }) => (
    <div data-testid={`orb-stage-${stage}`}>
      <span data-testid={`orb-avatar-${stage}`}>{avatarUrl || 'none'}</span>
      <span data-testid={`orb-blank-${stage}`}>{String(Boolean(blankFace))}</span>
    </div>
  )
}))

const { agentService } = require('../../../api/services/agent.service')
const StageJourney = require('../StageJourney').default

const stage = (n, over = {}) => ({
  stage: n,
  level_required: n === 1 ? 1 : [3, 6, 10, 14, 18][n - 2],
  xp_required: n === 1 ? 0 : [100, 625, 2025, 4225, 7225][n - 2],
  reached: false,
  reached_at: null,
  xp_remaining: 100,
  ...over
})

const journey = (reachedThrough, over = {}, isDefault = false) => ({
  current_stage: reachedThrough,
  current_level: 4,
  current_xp: 258,
  is_default_companion: isDefault,
  stages: [1, 2, 3, 4, 5, 6].map((n) =>
    stage(n, n <= reachedThrough ? { reached: true, xp_remaining: null } : { xp_remaining: n * 100, ...(over[n] || {}) })
  )
})

beforeEach(() => {
  jest.clearAllMocks()
  mockAvatarUrl = null
})

describe('StageJourney', () => {
  it('names every stage permanently, reached or not', async () => {
    agentService.getJourney.mockResolvedValue(journey(2))
    render(<StageJourney />)

    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(await screen.findByText(`pet.stage.${n}.name`)).toBeInTheDocument()
    }
  })

  it('renders every locked form rather than hiding it', async () => {
    agentService.getJourney.mockResolvedValue(journey(2))
    render(<StageJourney />)

    // Showing the shape you have not earned yet is the whole mechanic.
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(await screen.findByTestId(`orb-stage-${n}`)).toBeInTheDocument()
    }
  })

  // PET-008: which art a rung shows depends on whether the user has
  // personalised. Free users, and anyone who has not generated a portrait, are
  // still with Nowry — the shipped default companion.
  it('shows all six of Nowry’s illustrations for a default companion', async () => {
    agentService.getJourney.mockResolvedValue(journey(2, {}, true))
    const { container } = render(<StageJourney />)

    await screen.findByText('pet.stage.1.name')
    expect(container.querySelectorAll('img')).toHaveLength(6)
    // The procedural orb is for personalised pets only.
    expect(screen.queryByTestId('orb-stage-1')).not.toBeInTheDocument()
  })

  it('falls back to the procedural orb once the user has a pet of their own', async () => {
    agentService.getJourney.mockResolvedValue(journey(2, {}, false))
    const { container } = render(<StageJourney />)

    expect(await screen.findByTestId('orb-stage-1')).toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  // A paying user's own portrait was never passed into the ladder, so their
  // journey showed a placeholder emoji at every rung — the personalised
  // experience looked poorer than the free one.
  it('shows the user’s own portrait on the rungs they have reached', async () => {
    mockAvatarUrl = 'https://example.com/my-pet.png'
    agentService.getJourney.mockResolvedValue(journey(2, {}, false))
    render(<StageJourney />)

    await screen.findByTestId('orb-stage-1')
    expect(screen.getByTestId('orb-avatar-1')).toHaveTextContent('https://example.com/my-pet.png')
    expect(screen.getByTestId('orb-avatar-2')).toHaveTextContent('https://example.com/my-pet.png')
  })

  it('does not put the portrait on a form the user has not reached', async () => {
    mockAvatarUrl = 'https://example.com/my-pet.png'
    agentService.getJourney.mockResolvedValue(journey(2, {}, false))
    render(<StageJourney />)

    await screen.findByTestId('orb-stage-3')
    expect(screen.getByTestId('orb-avatar-3')).toHaveTextContent('none')
    expect(screen.getByTestId('orb-blank-3')).toHaveTextContent('true')
  })

  it('marks exactly one stage as next — the first unreached one', async () => {
    agentService.getJourney.mockResolvedValue(journey(2))
    render(<StageJourney />)

    const next = await screen.findAllByText('agent.companion.journeyNext')
    expect(next).toHaveLength(1)
  })

  it('shows the distance to each unreached stage', async () => {
    agentService.getJourney.mockResolvedValue(journey(2))
    render(<StageJourney />)

    expect(await screen.findByText('agent.companion.journeyLocked:{"count":300}')).toBeInTheDocument()
    expect(screen.getByText('agent.companion.journeyLocked:{"count":600}')).toBeInTheDocument()
  })

  it('shows a date for a reached stage that has one', async () => {
    const j = journey(2)
    j.stages[1].reached_at = '2026-08-01T10:00:00Z'
    agentService.getJourney.mockResolvedValue(j)
    render(<StageJourney />)

    expect(await screen.findByText(/journeyReachedOn/)).toBeInTheDocument()
  })

  it('renders a stage reached before history existed as undated, not as an invented date', async () => {
    agentService.getJourney.mockResolvedValue(journey(2))
    render(<StageJourney />)

    const undated = await screen.findAllByText('agent.companion.journeyReached')
    expect(undated).toHaveLength(2)
    expect(screen.queryByText(/journeyReachedOn/)).not.toBeInTheDocument()
  })

  it('marks no stage as next when the arc is complete', async () => {
    agentService.getJourney.mockResolvedValue(journey(6))
    render(<StageJourney />)

    await screen.findByText('pet.stage.6.name')
    expect(screen.queryByText('agent.companion.journeyNext')).not.toBeInTheDocument()
  })

  it('surfaces an error instead of an empty ladder when the fetch fails', async () => {
    agentService.getJourney.mockRejectedValue(new Error('nope'))
    render(<StageJourney />)

    expect(await screen.findByText('agent.companion.journeyError')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('orb-stage-1')).not.toBeInTheDocument())
  })
})
