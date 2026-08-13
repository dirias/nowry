/**
 * FE-A2 — the goal form's milestone editor (goal-form-redesign UX-CONTRACT §11.2).
 *
 * The controls this replaces were a 20x20 <Box onClick> with an inline
 * <svg><polyline> checkmark and a <Box onClick> date chip: no role, no
 * tabIndex, no keydown handler, no accessible name. A keyboard user could
 * reach the title field and nothing else on the row. These tests assert the
 * replacements are real controls with translated names, and pin the focus
 * moves that keep the keyboard path unbroken.
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' }
  })
}))

const GoalMilestoneEditor = require('../goal/GoalMilestoneEditor').default

const ms = (over = {}) => ({ title: '', completed: false, due_date: '', ...over })

/** Renders the editor as a controlled component the way GoalDialog does. */
const Harness = ({ initial = [], autoFocusFirstRow = false }) => {
  const [milestones, setMilestones] = React.useState(initial)
  return <GoalMilestoneEditor milestones={milestones} onChange={setMilestones} autoFocusFirstRow={autoFocusFirstRow} />
}

const renderEditor = (initial) => render(<Harness initial={initial} />)

const titleInputs = () => screen.queryAllByRole('textbox')
const addButton = () => screen.getByText('annualPlanning.goal.addMilestoneButton').closest('button')

beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(() => {
  jest.useRealTimers()
})

// Focus moves are deferred a tick so the DOM has settled.
const runTimers = () => act(() => void jest.runAllTimers())

describe('GoalMilestoneEditorRow — real controls, translated names', () => {
  it('renders a real checkbox whose accessible name is on the input, not the root span', () => {
    renderEditor([ms({ title: 'Bench 100kg' })])
    const box = screen.getByRole('checkbox')
    expect(box.tagName).toBe('INPUT')
    expect(box).toHaveAttribute('aria-label', 'annualPlanning.goal.milestoneToggleAria:{"title":"Bench 100kg"}')
  })

  it('names every row control through t(), interpolating the milestone title', () => {
    renderEditor([ms({ title: 'Bench 100kg' })])
    expect(screen.getByLabelText('annualPlanning.goal.milestoneTitleAria:{"index":1}')).toBeInTheDocument()
    expect(screen.getByLabelText('annualPlanning.goal.milestoneDueDateAria:{"title":"Bench 100kg"}')).toBeInTheDocument()
    expect(screen.getByLabelText('annualPlanning.goal.milestoneDeleteAria:{"title":"Bench 100kg"}')).toBeInTheDocument()
  })

  it('falls back to the row number when the milestone has no title yet', () => {
    renderEditor([ms()])
    const fallback = 'annualPlanning.goal.milestoneNumber:{"index":1}'
    const expected = `annualPlanning.goal.milestoneDeleteAria:${JSON.stringify({ title: fallback })}`
    expect(screen.getByLabelText(expected)).toBeInTheDocument()
  })

  it('contains no inline SVG checkmark — the hand-rolled checkbox is gone', () => {
    const { container } = renderEditor([ms({ title: 'Done', completed: true })])
    expect(container.querySelector('polyline')).toBeNull()
  })

  it('shows the clear-date control only once a date is set', () => {
    const { unmount } = renderEditor([ms({ title: 'A' })])
    expect(screen.queryByLabelText('annualPlanning.goal.milestoneClearDateAria:{"title":"A"}')).toBeNull()
    unmount()

    renderEditor([ms({ title: 'A', due_date: '2026-09-01' })])
    expect(screen.getByLabelText('annualPlanning.goal.milestoneClearDateAria:{"title":"A"}')).toBeInTheDocument()
  })

  it('has no right-click-to-clear handler anywhere', () => {
    const { container } = renderEditor([ms({ title: 'A', due_date: '2026-09-01' })])
    // onContextMenu was the only way to clear a date and was mouse-only.
    fireEvent.contextMenu(screen.getByLabelText('annualPlanning.goal.milestoneDueDateAria:{"title":"A"}'))
    expect(container.textContent).toContain('Sep')
  })
})

describe('GoalMilestoneEditor — array behaviour', () => {
  it('appends a row on Add and focuses it', () => {
    renderEditor([])
    fireEvent.click(addButton())
    runTimers()
    expect(titleInputs()).toHaveLength(1)
    expect(document.activeElement).toBe(titleInputs()[0])
  })

  it('appends a row on Enter in a milestone title and focuses the new one', () => {
    renderEditor([ms({ title: 'First' })])
    fireEvent.keyDown(titleInputs()[0], { key: 'Enter' })
    runTimers()
    expect(titleInputs()).toHaveLength(2)
    expect(document.activeElement).toBe(titleInputs()[1])
  })

  it('moves focus to the Add button when the last row is deleted', () => {
    renderEditor([ms({ title: 'Only' })])
    fireEvent.click(screen.getByLabelText('annualPlanning.goal.milestoneDeleteAria:{"title":"Only"}'))
    runTimers()
    expect(titleInputs()).toHaveLength(0)
    expect(document.activeElement).toBe(addButton())
  })

  it('keeps focus on a surviving row when a middle row is deleted', () => {
    renderEditor([ms({ title: 'A' }), ms({ title: 'B' }), ms({ title: 'C' })])
    fireEvent.click(screen.getByLabelText('annualPlanning.goal.milestoneDeleteAria:{"title":"B"}'))
    runTimers()
    expect(titleInputs()).toHaveLength(2)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('does not steal focus to a trailing blank row while an earlier row is typed in', () => {
    renderEditor([ms({ title: 'A' }), ms()])
    runTimers()
    const first = titleInputs()[0]
    first.focus()
    fireEvent.change(first, { target: { value: 'Ab' } })
    runTimers()
    expect(document.activeElement).toBe(titleInputs()[0])
  })

  it('renders the empty state only when every row is gone', () => {
    renderEditor([ms({ title: 'A' })])
    expect(screen.queryByText('annualPlanning.goal.noMilestones')).toBeNull()

    fireEvent.click(screen.getByLabelText('annualPlanning.goal.milestoneDeleteAria:{"title":"A"}'))
    runTimers()
    expect(screen.getByText('annualPlanning.goal.noMilestones')).toBeInTheDocument()
  })

  it('toggles completion through the checkbox', () => {
    renderEditor([ms({ title: 'A' })])
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  /**
   * Browser-only regression. The seeded row used to be focused by a 50ms
   * timeout, which jsdom honoured but a real browser did not: Joy's Modal runs
   * a focus trap on open that re-claimed focus afterwards, landing the cursor
   * on the dialog container instead of the row. autoFocus is declarative and
   * the trap respects it. Asserting focus *without advancing timers* is what
   * distinguishes the two mechanisms — the timeout path cannot pass this.
   */
  it('focuses the first row via autoFocus, not a deferred focus() call', () => {
    render(<Harness initial={[ms()]} autoFocusFirstRow />)
    expect(document.activeElement).toBe(titleInputs()[0])
  })

  it('leaves focus alone when autoFocusFirstRow is not set', () => {
    render(<Harness initial={[ms({ title: 'A' })]} />)
    expect(document.activeElement).not.toBe(titleInputs()[0])
  })

  it('renders the section heading and helper from t()', () => {
    renderEditor([])
    expect(screen.getByText('annualPlanning.goal.keyResultsTitle')).toBeInTheDocument()
    expect(screen.getByText('annualPlanning.goal.keyResultsHelper')).toBeInTheDocument()
  })
})
