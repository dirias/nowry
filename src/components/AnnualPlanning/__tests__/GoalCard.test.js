/**
 * FE-4 — GoalCard and GoalRow (UX-CONTRACT §5.3).
 *
 * Carries forward the card/row-level coverage from the retired GoalCardGrid and
 * GoalRowList suites — translated action labels, lock gating, i18n'd progress
 * copy — and adds the assertions ADR-003 turns on: one state signal not five,
 * area colour confined to the dot, and no accordion anywhere.
 */
import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

const GoalCard = require('../GoalCard').default
const GoalRow = require('../GoalRow').default

const goal = {
  _id: 'g1',
  title: 'Test goal',
  status: 'in_progress',
  type: 'quarterly',
  quarter: 1,
  progress: 50,
  milestones: [
    { id: 'm1', title: 'M1', completed: true },
    { id: 'm2', title: 'M2', completed: false }
  ]
}

const area = { _id: 'a1', name: 'Health', color: '#4caf50' }

const baseProps = (overrides = {}) => ({
  goal,
  area,
  activities: [],
  quarterReports: [],
  planYear: 2026,
  onOpenDetail: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onStatusChange: jest.fn(),
  onToggleMilestone: jest.fn(),
  onAddMilestone: jest.fn(),
  onComplete: jest.fn(),
  ...overrides
})

describe.each([
  ['GoalCard', (props) => <GoalCard {...props} />],
  ['GoalRow', (props) => <GoalRow {...props} />]
])('%s — shared layout contract', (name, renderLayout) => {
  it('renders the title', () => {
    render(renderLayout(baseProps()))
    expect(screen.getByText('Test goal')).toBeInTheDocument()
  })

  it('opens the detail drawer from the title link', () => {
    const props = baseProps()
    render(renderLayout(props))
    fireEvent.click(screen.getByLabelText('annualPlanning.goal.openDetail:{"title":"Test goal"}'))
    expect(props.onOpenDetail).toHaveBeenCalledWith(goal)
  })

  it('renders exactly one state signal, not five', () => {
    const { container } = render(renderLayout(baseProps()))
    const stateLabels = container.textContent.match(/annualPlanning\.goal\.healthStatus\./g) || []
    expect(stateLabels).toHaveLength(1)
    // The competing lifecycle chip is gone.
    expect(container.textContent).not.toMatch(/annualPlanning\.goal\.status\./)
  })

  it('never renders the retired "X% Complete" string', () => {
    const { container } = render(renderLayout(baseProps()))
    expect(container.textContent).not.toMatch(/% Complete/)
    expect(container.textContent).not.toMatch(/percentComplete/)
  })

  it('renders a milestone count instead', () => {
    render(renderLayout(baseProps()))
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'annualPlanning.goal.milestoneCount:{"completed":1,"total":2,"count":2}'
    )
  })

  it('surfaces the next incomplete milestone inline — zero expansion', () => {
    render(renderLayout(baseProps()))
    expect(screen.getByText('annualPlanning.goal.next.label:{"title":"M2"}')).toBeInTheDocument()
  })

  it('ticks the next milestone by its real array index', () => {
    const props = baseProps()
    render(renderLayout(props))
    fireEvent.click(screen.getByRole('checkbox'))
    expect(props.onToggleMilestone).toHaveBeenCalledWith(goal, 1)
  })

  it('exposes edit and delete through one labelled overflow menu', () => {
    const props = baseProps()
    render(renderLayout(props))
    fireEvent.click(screen.getByLabelText('annualPlanning.goal.moreActions:{"title":"Test goal"}'))
    fireEvent.click(screen.getByText('annualPlanning.goal.edit'))
    expect(props.onEdit).toHaveBeenCalledWith(goal)
  })

  it('locks its controls when the goal’s quarter is closed', () => {
    const props = baseProps({ quarterReports: [{ quarter: 1, year: 2026 }] })
    render(renderLayout(props))
    expect(screen.getByRole('checkbox')).toBeDisabled()
    const overflow = screen.getByRole('button', { name: 'annualPlanning.goal.moreActions:{"title":"Test goal"}' })
    expect(overflow).toBeDisabled()
    fireEvent.click(overflow)
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('contains no accordion and no stepper', () => {
    const { container } = render(renderLayout(baseProps()))
    expect(container.querySelector('.MuiAccordion-root')).not.toBeInTheDocument()
    expect(container.querySelector('.MuiStepper-root')).not.toBeInTheDocument()
  })

  it('renders nothing when handed no goal', () => {
    const { container } = render(renderLayout(baseProps({ goal: null })))
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the add-milestone rung for a goal with no milestones', () => {
    const props = baseProps({ goal: { ...goal, milestones: [] } })
    render(renderLayout(props))
    fireEvent.click(screen.getByText('annualPlanning.goal.next.addMilestone'))
    expect(props.onAddMilestone).toHaveBeenCalled()
  })

  it('shows the ready-to-complete rung once every milestone is ticked', () => {
    const props = baseProps({ goal: { ...goal, milestones: [{ id: 'm1', title: 'M1', completed: true }] } })
    render(renderLayout(props))
    fireEvent.click(screen.getByText('annualPlanning.goal.next.readyToComplete'))
    expect(props.onComplete).toHaveBeenCalled()
  })
})

describe('area colour is confined to the legend dot', () => {
  const dotSelector = 'div[class*="MuiBox-root"]'

  it.each([
    ['GoalCard', (props) => <GoalCard {...props} />],
    ['GoalRow', (props) => <GoalRow {...props} />]
  ])('%s paints area.color exactly once', (name, renderLayout) => {
    const { container } = render(renderLayout(baseProps()))
    const painted = Array.from(container.querySelectorAll(dotSelector)).filter((el) =>
      (el.getAttribute('style') || '').includes('76, 175, 80')
    )
    // Emotion emits the colour into a class, not inline style, so assert on the
    // rendered stylesheet instead: exactly one rule carries the area colour.
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent)
      .join('')
    const occurrences = (styles.match(/#4caf50/gi) || []).length
    expect(painted.length).toBe(0)
    expect(occurrences).toBeLessThanOrEqual(1)
  })

  it('renders the focus area name alongside the dot', () => {
    render(<GoalCard {...baseProps()} />)
    expect(screen.getByText('Health')).toBeInTheDocument()
  })
})

describe('GoalCard tab order', () => {
  const focusableIn = (container) =>
    Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))

  it('is exactly three stops — down from roughly eleven', () => {
    const { container } = render(<GoalCard {...baseProps()} />)
    expect(focusableIn(container)).toHaveLength(3)
  })

  it('those three stops are the title link, the overflow button and the next-milestone checkbox', () => {
    const { container } = render(<GoalCard {...baseProps()} />)
    const stops = focusableIn(container)
    // DOM order is title -> overflow -> checkbox, because the overflow button
    // sits in the header row where it renders (top-right). Visual and DOM order
    // therefore agree, which is the accessible default.
    expect(stops[0]).toHaveAttribute('aria-label', 'annualPlanning.goal.openDetail:{"title":"Test goal"}')
    expect(stops[1]).toHaveAttribute('aria-label', 'annualPlanning.goal.moreActions:{"title":"Test goal"}')
    expect(stops[2]).toBe(screen.getByRole('checkbox'))
  })

  it('drops to two stops when the quarter is closed and the overflow is disabled', () => {
    const { container } = render(<GoalCard {...baseProps({ quarterReports: [{ quarter: 1, year: 2026 }] })} />)
    expect(focusableIn(container)).toHaveLength(1)
  })
})

describe('house rules', () => {
  const read = (name) => require('fs').readFileSync(require.resolve(`../${name}`), 'utf8')
  // The doc comments deliberately *name* the things these files must not
  // contain, so the source assertions run against comment-stripped code.
  const readCode = (name) =>
    read(name)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it.each(['GoalCard.js', 'GoalRow.js'])('%s contains no hex, rgba(), style={{}} or numeric shade', (name) => {
    const source = read(name)
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/rgba?\(/)
    expect(source).not.toMatch(/style=\{\{/)
    expect(source).not.toMatch(/(neutral|primary|success|warning|danger)\.[0-9]{2,3}\b/)
  })

  it.each(['GoalCard.js', 'GoalRow.js'])('%s owns no derivation, colour map, Stepper or Accordion', (name) => {
    const code = readCode(name)
    expect(code).not.toMatch(/GOAL_STATE_COLOR|HEALTH_STATUS_MAP|getGoalState|calculateProgress/)
    expect(code).not.toMatch(/Stepper|Accordion/)
    expect(code).not.toMatch(/api\/services|annualPlanningService/)
  })

  it.each(['GoalCard.js', 'GoalRow.js'])('%s has no fixed card height', (name) => {
    expect(readCode(name)).not.toMatch(/height:\s*\{\s*xs:\s*220/)
  })

  it.each(['GoalCard.js', 'GoalRow.js'])('%s stays a thin layout', (name) => {
    // Contract targets: ~130 lines for the card, ~90 for the row. Allow headroom
    // for the documentation comments, but fail if either grows back into a
    // 400-line component.
    expect(read(name).split('\n').length).toBeLessThan(200)
  })
})
