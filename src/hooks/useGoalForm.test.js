/**
 * FE-A3 — useGoalForm (goal-form-redesign UX-CONTRACT §11.4).
 *
 * The hook owns the rule that makes progressive disclosure safe to ship:
 *
 *   revealed at open  =  hasContent(group)  ||  initialSection === group
 *
 * Add mode collapses because the predicates are false, not because it is
 * special-cased — and Edit mode therefore never hides something the user
 * already wrote. These tests pin that rule in both directions, plus the
 * empty-title Save that used to be a silent `return`.
 */
jest.mock('../api/services', () => ({
  annualPlanningService: { createGoal: jest.fn(), updateGoal: jest.fn() }
}))

import { renderHook, act } from '@testing-library/react'
import useGoalForm, { describeApiError, emptyToNull } from './useGoalForm'
import { annualPlanningService } from '../api/services'

const mount = (props) => renderHook((p) => useGoalForm(p), { initialProps: { open: true, focusAreaId: 'area-1', ...props } })

const chips = (r) => r.result.current.availableChips
const revealedList = (r) => [...r.result.current.revealed].sort()

beforeEach(() => {
  annualPlanningService.createGoal.mockResolvedValue({ _id: 'new-goal' })
  annualPlanningService.updateGoal.mockResolvedValue({ _id: 'g1' })
})

describe('reveal state at open (§4.3)', () => {
  it('opens an Add form fully collapsed with four chips plus the timeframe override', () => {
    const r = mount({ goal: { type: 'quarterly', quarter: 3 } })
    expect(revealedList(r)).toEqual([])
    expect(chips(r)).toEqual(['milestones', 'description', 'targetDate', 'image', 'timeframe'])
  })

  it('omits the timeframe chip on the context-free Add path, where the Select renders at rest', () => {
    const r = mount({ goal: null })
    expect(chips(r)).toEqual(['milestones', 'description', 'targetDate', 'image'])
    expect(r.result.current.showTimeframeSelect).toBe(true)
  })

  it('reveals both groups when editing a goal that has milestones and a description', () => {
    const r = mount({
      goal: { _id: 'g1', title: 'T', description: 'why', milestones: [{ title: 'm', completed: false }] }
    })
    expect(revealedList(r)).toEqual(['description', 'milestones'])
    expect(chips(r)).toEqual(['targetDate', 'image'])
  })

  it('opens fully collapsed when editing a goal with none of the four', () => {
    const r = mount({ goal: { _id: 'g1', title: 'T', description: '  ', image_url: '', milestones: [] } })
    expect(revealedList(r)).toEqual([])
    expect(chips(r)).toEqual(['milestones', 'description', 'targetDate', 'image'])
  })

  it('never offers a timeframe change in Edit mode — a quarter cannot be edited today', () => {
    const r = mount({ goal: { _id: 'g1', title: 'T', type: 'quarterly', quarter: 2 } })
    expect(chips(r)).not.toContain('timeframe')
    expect(r.result.current.showTimeframeSelect).toBe(false)
  })

  it('reveals target date and image from their own content predicates', () => {
    const r = mount({ goal: { _id: 'g1', title: 'T', target_date: '2026-09-01T00:00:00', image_url: 'http://x/y.png' } })
    expect(revealedList(r)).toEqual(['image', 'targetDate'])
  })
})

describe('reveal is one-way while the modal is open (§4.4)', () => {
  it('keeps a group revealed after its field is cleared', () => {
    const r = mount({ goal: { _id: 'g1', title: 'T', description: 'why' } })
    expect(revealedList(r)).toContain('description')

    act(() => r.result.current.setField('description', ''))
    expect(revealedList(r)).toContain('description')
    expect(chips(r)).not.toContain('description')
  })

  it('removes a chip from the rail when it is activated', () => {
    const r = mount({ goal: null })
    act(() => r.result.current.reveal('image'))
    expect(chips(r)).not.toContain('image')
    expect(revealedList(r)).toContain('image')
    expect(r.result.current.lastRevealed).toBe('image')
  })

  it('seeds a blank row so revealing "Add milestones" actually adds one', () => {
    const r = mount({ goal: null })
    expect(r.result.current.milestones).toEqual([])

    act(() => r.result.current.reveal('milestones'))
    expect(r.result.current.milestones).toEqual([{ title: '', completed: false, due_date: '' }])
  })

  it('does not seed over milestones that already exist', () => {
    const r = mount({ goal: { _id: 'g1', title: 'T', milestones: [{ title: 'm', completed: false }] } })
    act(() => r.result.current.reveal('milestones'))
    expect(r.result.current.milestones).toHaveLength(1)
    expect(r.result.current.milestones[0].title).toBe('m')
  })
})

describe('initialSection = milestones (§5.1)', () => {
  it('reveals the group and seeds one blank row on a goal that has none', () => {
    const r = mount({ goal: { _id: 'g1', title: 'T', milestones: [] }, initialSection: 'milestones' })
    expect(revealedList(r)).toEqual(['milestones'])
    expect(r.result.current.milestones).toEqual([{ title: '', completed: false, due_date: '' }])
  })

  it('seeds nothing when the card data was stale and the goal does have milestones', () => {
    const r = mount({
      goal: { _id: 'g1', title: 'T', milestones: [{ title: 'existing', completed: false }] },
      initialSection: 'milestones'
    })
    expect(r.result.current.milestones).toHaveLength(1)
    expect(r.result.current.milestones[0].title).toBe('existing')
  })

  it('routes autofocus to the milestone row instead of the title, never both', () => {
    const withSection = mount({ goal: { _id: 'g1', title: 'T' }, initialSection: 'milestones' })
    expect(withSection.result.current.autoFocusTarget).toBe('firstMilestone')

    const without = mount({ goal: { _id: 'g1', title: 'T' } })
    expect(without.result.current.autoFocusTarget).toBe('title')
  })
})

describe('validation (§7.2)', () => {
  it('rejects an empty title with an error and fires no request', async () => {
    const r = mount({ goal: null })
    const onSuccess = jest.fn()

    await act(async () => r.result.current.submit(onSuccess, jest.fn()))

    expect(r.result.current.titleError).toBe(true)
    expect(annualPlanningService.createGoal).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only title', async () => {
    const r = mount({ goal: null })
    act(() => r.result.current.setField('title', '   '))
    await act(async () => r.result.current.submit(jest.fn(), jest.fn()))

    expect(r.result.current.titleError).toBe(true)
    expect(annualPlanningService.createGoal).not.toHaveBeenCalled()
  })

  it('re-signals on a second rejected Save so the title can be re-focused', async () => {
    const r = mount({ goal: null })
    await act(async () => r.result.current.submit(jest.fn(), jest.fn()))
    const first = r.result.current.titleErrorAt

    await act(async () => r.result.current.submit(jest.fn(), jest.fn()))
    expect(r.result.current.titleErrorAt).toBeGreaterThan(first)
  })

  it('clears the error as soon as the user types in the title', async () => {
    const r = mount({ goal: null })
    await act(async () => r.result.current.submit(jest.fn(), jest.fn()))
    expect(r.result.current.titleError).toBe(true)

    act(() => r.result.current.setField('title', 'M'))
    expect(r.result.current.titleError).toBe(false)
  })
})

describe('submit payload and failure handling', () => {
  it('creates a goal from a title alone', async () => {
    const r = mount({ goal: null })
    const onSuccess = jest.fn()
    const onClose = jest.fn()

    act(() => r.result.current.setField('title', '  Increase muscle mass  '))
    await act(async () => r.result.current.submit(onSuccess, onClose))

    expect(annualPlanningService.createGoal).toHaveBeenCalledTimes(1)
    const payload = annualPlanningService.createGoal.mock.calls[0][0]
    expect(payload.title).toBe('Increase muscle mass')
    // Pydantic v2 rejects '' for Optional[datetime]/Optional[int].
    expect(payload.target_date).toBeNull()
    expect(payload.quarter).toBeNull()
    expect(payload.parent_id).toBeNull()
    expect(payload.milestones).toEqual([])
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('drops blank milestone rows and trims the rest', async () => {
    const r = mount({ goal: null })
    act(() => r.result.current.setField('title', 'T'))
    act(() =>
      r.result.current.setMilestones([
        { title: '  Row one  ', completed: true, due_date: '2026-09-01' },
        { title: '   ', completed: false, due_date: '' }
      ])
    )
    await act(async () => r.result.current.submit(jest.fn(), jest.fn()))

    expect(annualPlanningService.createGoal.mock.calls[0][0].milestones).toEqual([
      { title: 'Row one', completed: true, due_date: '2026-09-01' }
    ])
  })

  it('updates rather than creates when the goal has an id', async () => {
    const r = mount({ goal: { _id: 'g1', title: 'T' } })
    await act(async () => r.result.current.submit(jest.fn(), jest.fn()))

    expect(annualPlanningService.updateGoal).toHaveBeenCalledWith('g1', expect.objectContaining({ title: 'T' }))
    expect(annualPlanningService.createGoal).not.toHaveBeenCalled()
  })

  it('keeps the form intact and surfaces the API detail when the save fails', async () => {
    annualPlanningService.createGoal.mockRejectedValue({
      response: { data: { detail: [{ loc: ['body', 'title'], msg: 'too short' }] } }
    })
    const r = mount({ goal: null })
    const onClose = jest.fn()

    act(() => r.result.current.setField('title', 'T'))
    await act(async () => r.result.current.submit(jest.fn(), onClose))

    expect(r.result.current.saveError).toBe('title: too short')
    expect(r.result.current.saving).toBe(false)
    expect(r.result.current.formData.title).toBe('T')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('relocated helpers', () => {
  it('emptyToNull converts only the blank cases', () => {
    expect(emptyToNull('')).toBeNull()
    expect(emptyToNull(undefined)).toBeNull()
    expect(emptyToNull(0)).toBe(0)
    expect(emptyToNull('2026-01-01')).toBe('2026-01-01')
  })

  it('describeApiError flattens both FastAPI detail shapes', () => {
    expect(describeApiError({ response: { data: { detail: 'plain' } } })).toBe('plain')
    expect(
      describeApiError({
        response: {
          data: {
            detail: [
              { loc: ['body', 'a'], msg: 'x' },
              { loc: ['body', 'b'], msg: 'y' }
            ]
          }
        }
      })
    ).toBe('a: x · b: y')
    expect(describeApiError({ message: 'Network Error' })).toBe('Network Error')
  })
})
