import { planMetrics } from '../goalDerivation'

const goal = (over) => ({ status: 'on_track', progress: 0, milestones: [], ...over })

describe('planMetrics', () => {
  it('is zero for an empty plan rather than NaN', () => {
    expect(planMetrics([])).toEqual({ total: 0, completed: 0, progress: 0 })
  })

  it('counts a goal finished by status or by reaching 100', () => {
    const goals = [goal({ status: 'completed' }), goal({ milestones: [{ completed: true }, { completed: true }] }), goal({ progress: 40 })]
    expect(planMetrics(goals)).toMatchObject({ total: 3, completed: 2 })
  })

  it('averages the goals it was given, milestones first', () => {
    // 100 and 50 and 0 -> 50
    const goals = [
      goal({ milestones: [{ completed: true }] }),
      goal({ milestones: [{ completed: true }, { completed: false }] }),
      goal({ progress: 0 })
    ]
    expect(planMetrics(goals).progress).toBe(50)
  })

  it('reads the stored progress only when a goal has no milestones', () => {
    // A goal with milestones and a stale `progress` field must not use it.
    expect(planMetrics([goal({ progress: 90, milestones: [{ completed: false }] })]).progress).toBe(0)
  })
})
