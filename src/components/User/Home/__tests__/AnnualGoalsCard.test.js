/**
 * FE-7 — AnnualGoalsCard (UX-CONTRACT §10 FE-7).
 *
 * The bug this closes: progress was computed from goal.activities[].completed,
 * a field on neither the Goal nor the Activity model, so every goal reported 0%
 * and was painted danger. The decisive assertion is the last suite — the Home
 * card and the Goals tab must agree, because they now call the same functions.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

const mockGetGoals = jest.fn()
jest.mock('../../../../api/services', () => ({
  annualPlanningService: { getGoals: (...args) => mockGetGoals(...args) }
}))

jest.mock('lucide-react', () => ({ Target: () => null, TrendingUp: () => null }))

const AnnualGoalsCard = require('../AnnualGoalsCard').default
const { GOAL_STATE_COLOR, getGoalProgress, getGoalState } = require('../../../AnnualPlanning/goalDerivation')

const milestoneGoal = {
  _id: 'g1',
  title: 'Run a half marathon',
  status: 'in_progress',
  type: 'quarterly',
  quarter: 1,
  milestones: [{ completed: true }, { completed: true }, { completed: true }, { completed: false }]
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetGoals.mockResolvedValue([milestoneGoal])
})

describe('the fixed derivation', () => {
  it('reports milestone-based progress, not a hardcoded 0', async () => {
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText('annualPlanning.goal.percentComplete:{"percent":75}')).toBeInTheDocument())
  })

  it('renders goal.title — goal.category does not exist on the model', async () => {
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText('Run a half marathon')).toBeInTheDocument())
  })

  it('announces the milestone count on the bar', async () => {
    render(<AnnualGoalsCard />)
    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuetext',
        'annualPlanning.goal.milestoneCount:{"completed":3,"total":4,"count":4}'
      )
    )
  })

  it('falls back to the stored progress field for a goal with no milestones', async () => {
    mockGetGoals.mockResolvedValue([{ _id: 'g2', title: 'No milestones', progress: 40, type: 'quarterly', quarter: 1 }])
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText('annualPlanning.goal.percentComplete:{"percent":40}')).toBeInTheDocument())
  })
})

describe('agreement with the Goals tab', () => {
  it('shows the identical percentage the shared derivation produces', async () => {
    const expected = getGoalProgress(milestoneGoal).percent
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText(`annualPlanning.goal.percentComplete:{"percent":${expected}}`)).toBeInTheDocument())
  })

  it('paints the identical state colour the shared derivation produces', async () => {
    const expectedColor = GOAL_STATE_COLOR[getGoalState(milestoneGoal)]
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument())
    expect(screen.getByRole('progressbar').className).toContain(
      `colorbar${expectedColor.charAt(0).toUpperCase()}${expectedColor.slice(1)}`.replace('colorbar', 'color')
    )
  })

  it('never paints a healthy goal danger, which the old 70/40 thresholds did', async () => {
    // 75% complete early in its quarter is on_track, i.e. success.
    expect(GOAL_STATE_COLOR[getGoalState(milestoneGoal)]).not.toBe('danger')
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument())
    expect(screen.getByRole('progressbar').className).not.toMatch(/colorDanger/)
  })
})

describe('the four states', () => {
  it('Loading renders per-row Skeletons, not a full-card spinner', async () => {
    let resolve
    mockGetGoals.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    const { container } = render(<AnnualGoalsCard />)

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(1)
    expect(container.querySelector('.MuiCircularProgress-root')).not.toBeInTheDocument()
    // The card's own chrome stays visible while loading.
    expect(screen.getByText('dashboard.annualGoals.title')).toBeInTheDocument()

    resolve([])
    await waitFor(() => expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(0))
  })

  it('Success renders one row per goal, capped at four', async () => {
    mockGetGoals.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({ _id: `g${i}`, title: `Goal ${i}`, progress: i * 10, type: 'quarterly', quarter: 1 }))
    )
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getAllByRole('progressbar')).toHaveLength(4))
  })

  it('Error falls back to the empty state with its CTA, not a console-only dead end', async () => {
    mockGetGoals.mockRejectedValue(new Error('network'))
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText('dashboard.annualGoals.noGoals')).toBeInTheDocument())
    expect(screen.getByText('dashboard.annualGoals.createGoal')).toBeInTheDocument()
  })

  it('Empty renders the unchanged copy and CTA', async () => {
    mockGetGoals.mockResolvedValue([])
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText('dashboard.annualGoals.noGoals')).toBeInTheDocument())
  })

  it('sorts the goals needing attention first', async () => {
    mockGetGoals.mockResolvedValue([
      { _id: 'high', title: 'High', progress: 90, type: 'quarterly', quarter: 1 },
      { _id: 'low', title: 'Low', progress: 10, type: 'quarterly', quarter: 1 }
    ])
    render(<AnnualGoalsCard />)
    await waitFor(() => expect(screen.getByText('Low')).toBeInTheDocument())
    const titles = screen.getAllByText(/^(High|Low)$/).map((n) => n.textContent)
    expect(titles).toEqual(['Low', 'High'])
  })
})

describe('house rules', () => {
  const source = () => require('fs').readFileSync(require.resolve('../AnnualGoalsCard.js'), 'utf8')

  it('has no numeric palette shade token', () => {
    expect(source()).not.toMatch(/(neutral|primary|success|warning|danger)\.[0-9]{2,3}\b/)
    expect(source()).not.toMatch(/\$\{[^}]*\}\.[0-9]{2,3}/)
  })

  it('has no hex colour, rgba() or style={{}}', () => {
    expect(source()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source()).not.toMatch(/rgba?\(/)
    expect(source()).not.toMatch(/style=\{\{/)
  })

  it('has no inline English t() fallback', () => {
    expect(source()).not.toMatch(/t\([^)]*,\s*['"][A-Z]/)
    expect(source()).not.toMatch(/defaultValue:/)
  })

  it('owns no local progress or colour derivation', () => {
    const code = source()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/const calculateProgress|const getProgressColor/)
    expect(code).not.toMatch(/>=\s*70|>=\s*40/)
  })

  it('no longer reads the non-existent goal.activities / goal.category fields', () => {
    const code = source()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/goal\.activities/)
    expect(code).not.toMatch(/goal\.category/)
  })
})
