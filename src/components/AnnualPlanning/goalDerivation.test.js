/**
 * FE-1 — goalDerivation logic core (UX-CONTRACT §5.1).
 *
 * Includes the regression suite required by the contract: getGoalState must
 * agree with the legacy getHealthStatus for every input that is not the new
 * `not_started` case. The legacy implementation is reproduced verbatim here as
 * the oracle so the assertion survives the deletion of its original call sites.
 */
import {
  GOAL_STATES,
  GOAL_STATE_COLOR,
  GOAL_STATE_I18N,
  calculateProgress,
  calculateTimeElapsedPercentage,
  filterGoalActivities,
  getCurrentQuarter,
  getGoalDeadline,
  getGoalProgress,
  getGoalState,
  getNextMilestone,
  isMilestoneOverdue
} from './goalDerivation'
import { getDaysUntilQuarterEnd } from './quarterUtils'

/** The pre-FE-1 implementation, copied verbatim from FocusAreaView.js:95-104. */
const legacyGetHealthStatus = (goal, now) => {
  if (goal.status === 'completed') return 'completed'
  const quarter = getCurrentQuarter(now)
  const timeElapsed = calculateTimeElapsedPercentage(goal, quarter, now)
  const progress = calculateProgress(goal)
  const gap = timeElapsed - progress
  if (gap <= 0) return 'on_track'
  if (gap <= 25) return 'at_risk'
  return 'behind'
}

const quarterOf = (date) => Math.floor(date.getMonth() / 3) + 1

describe('getGoalProgress', () => {
  it('derives percent/completed/total from milestones', () => {
    const goal = { milestones: [{ completed: true }, { completed: true }, { completed: false }, { completed: false }] }
    expect(getGoalProgress(goal)).toEqual({ percent: 50, completed: 2, total: 4, isMilestoneBased: true })
  })

  it('falls back to the stored progress field when there are no milestones', () => {
    expect(getGoalProgress({ progress: 37, milestones: [] })).toEqual({
      percent: 37,
      completed: 0,
      total: 0,
      isMilestoneBased: false
    })
  })

  it('reports 0 for a goal with neither milestones nor progress', () => {
    expect(getGoalProgress({}).percent).toBe(0)
  })

  it('agrees with calculateProgress, the site it replaces', () => {
    const goals = [{ milestones: [{ completed: true }, { completed: false }] }, { milestones: [{ completed: true }] }, { progress: 80 }, {}]
    goals.forEach((goal) => expect(getGoalProgress(goal).percent).toBe(calculateProgress(goal)))
  })
})

describe('getGoalState', () => {
  // A fixed instant so time-elapsed is deterministic: 44.5 of Q1's 90 days have
  // run, i.e. exactly 49% elapsed.
  const midQ1 = new Date(2026, 1, 14, 12, 0, 0) // 14 Feb 2026

  it('returns completed for a completed goal regardless of progress', () => {
    expect(getGoalState({ status: 'completed', milestones: [{ completed: false }] }, midQ1)).toBe('completed')
  })

  it('returns not_started when the window has not opened and nothing is done', () => {
    // Q4 goal viewed from Q1 — timeElapsed 0, progress 0.
    const goal = { type: 'quarterly', quarter: 4, status: 'not_started', milestones: [{ completed: false }] }
    expect(getGoalState(goal, midQ1)).toBe('not_started')
  })

  it('does NOT return not_started when the window has not opened but progress exists', () => {
    const goal = { type: 'quarterly', quarter: 4, status: 'not_started', milestones: [{ completed: true }] }
    expect(getGoalState(goal, midQ1)).toBe('on_track')
  })

  it('returns on_track when progress keeps pace with elapsed time (gap <= 0)', () => {
    // 49% elapsed, 50% done -> gap -1
    const goal = { type: 'quarterly', quarter: 1, status: 'not_started', milestones: [{ completed: true }, { completed: false }] }
    expect(getGoalState(goal, midQ1)).toBe('on_track')
  })

  it('returns at_risk for a gap in (0, 25]', () => {
    // 49% elapsed, 30% done -> gap 19
    const goal = { type: 'quarterly', quarter: 1, status: 'not_started', progress: 30 }
    expect(getGoalState(goal, midQ1)).toBe('at_risk')
  })

  it('returns behind for a gap greater than 25', () => {
    // 49% elapsed, 10% done -> gap 39
    const goal = { type: 'quarterly', quarter: 1, status: 'not_started', progress: 10 }
    expect(getGoalState(goal, midQ1)).toBe('behind')
  })

  it('treats an 86%-complete on-track goal as on_track (the reported colour bug)', () => {
    const goal = { type: 'quarterly', quarter: 1, status: 'not_started', progress: 86 }
    expect(getGoalState(goal, midQ1)).toBe('on_track')
    expect(GOAL_STATE_COLOR[getGoalState(goal, midQ1)]).toBe('success')
  })
})

describe('getGoalState regression vs legacy getHealthStatus', () => {
  const now = new Date(2026, 1, 15, 12, 0, 0)
  const currentQuarter = quarterOf(now)

  const goals = []
  ;['not_started', 'in_progress', 'completed'].forEach((status) => {
    ;[1, 2, 3, 4].forEach((quarter) => {
      ;[0, 10, 25, 40, 50, 75, 86, 100].forEach((progress) => {
        goals.push({ status, quarter, type: 'quarterly', progress })
        goals.push({
          status,
          quarter,
          type: 'quarterly',
          progress,
          milestones: [{ completed: progress >= 50 }, { completed: progress >= 100 }]
        })
      })
    })
    ;[0, 25, 50, 100].forEach((progress) => goals.push({ status, type: 'yearly', progress }))
  })

  it('covers a broad matrix', () => {
    expect(goals.length).toBeGreaterThan(100)
  })

  it('matches legacy output for every input that is not the new not_started case', () => {
    const mismatches = goals.filter((goal) => {
      const next = getGoalState(goal, now)
      if (next === 'not_started') return false
      return next !== legacyGetHealthStatus(goal, now)
    })
    expect(mismatches).toEqual([])
  })

  it('only ever diverges from legacy by classifying a legacy on_track as not_started', () => {
    goals.forEach((goal) => {
      const next = getGoalState(goal, now)
      if (next === 'not_started') expect(legacyGetHealthStatus(goal, now)).toBe('on_track')
    })
  })

  it('never returns a state outside the documented five', () => {
    goals.forEach((goal) => expect(GOAL_STATES).toContain(getGoalState(goal, now)))
  })

  it('sanity: the matrix actually exercises the not_started branch', () => {
    const notStarted = goals.filter((goal) => getGoalState(goal, now) === 'not_started')
    expect(notStarted.length).toBeGreaterThan(0)
    notStarted.forEach((goal) => {
      expect(goal.quarter).toBeGreaterThan(currentQuarter)
      expect(calculateProgress(goal)).toBe(0)
    })
  })
})

describe('GOAL_STATE_COLOR / GOAL_STATE_I18N', () => {
  it('maps every state to a Joy semantic palette', () => {
    expect(GOAL_STATE_COLOR).toEqual({
      completed: 'success',
      not_started: 'neutral',
      on_track: 'success',
      at_risk: 'warning',
      behind: 'danger'
    })
  })

  it('maps every state to an i18n key suffix and never to translated text', () => {
    GOAL_STATES.forEach((state) => {
      expect(typeof GOAL_STATE_I18N[state]).toBe('string')
      expect(GOAL_STATE_I18N[state]).not.toMatch(/\s/)
    })
  })

  it('reproduces the legacy HEALTH_STATUS_MAP pairings it replaces', () => {
    const legacyMap = {
      on_track: { key: 'onTrack', color: 'success' },
      at_risk: { key: 'atRisk', color: 'warning' },
      behind: { key: 'behind', color: 'danger' },
      completed: { key: 'completed', color: 'success' }
    }
    Object.entries(legacyMap).forEach(([state, { key, color }]) => {
      expect(GOAL_STATE_COLOR[state]).toBe(color)
      expect(GOAL_STATE_I18N[state]).toBe(key)
    })
  })
})

describe('getNextMilestone', () => {
  const now = new Date(2026, 5, 15, 12, 0, 0) // 15 Jun 2026

  it('returns null when there are no milestones', () => {
    expect(getNextMilestone({ milestones: [] }, now)).toBeNull()
    expect(getNextMilestone({}, now)).toBeNull()
  })

  it('returns null when every milestone is complete', () => {
    expect(getNextMilestone({ milestones: [{ completed: true }, { completed: true }] }, now)).toBeNull()
  })

  it('picks the earliest due_date among incomplete milestones', () => {
    const goal = {
      milestones: [
        { title: 'late', due_date: '2026-09-01', completed: false },
        { title: 'early', due_date: '2026-07-01', completed: false },
        { title: 'earliest but done', due_date: '2026-01-01', completed: true }
      ]
    }
    const next = getNextMilestone(goal, now)
    expect(next.milestone.title).toBe('early')
    expect(next.index).toBe(1)
  })

  it('falls back to array order for milestones without a due_date', () => {
    const goal = {
      milestones: [
        { title: 'first', completed: false },
        { title: 'second', completed: false }
      ]
    }
    expect(getNextMilestone(goal, now).milestone.title).toBe('first')
    expect(getNextMilestone(goal, now).index).toBe(0)
  })

  it('orders dated milestones ahead of undated ones', () => {
    const goal = {
      milestones: [
        { title: 'undated', completed: false },
        { title: 'dated', due_date: '2026-12-01', completed: false }
      ]
    }
    expect(getNextMilestone(goal, now).milestone.title).toBe('dated')
  })

  it('breaks ties on identical due dates by array order', () => {
    const goal = {
      milestones: [
        { title: 'b', due_date: '2026-07-01', completed: false },
        { title: 'a', due_date: '2026-07-01', completed: false }
      ]
    }
    expect(getNextMilestone(goal, now).milestone.title).toBe('b')
  })

  it('flags an overdue next milestone', () => {
    const goal = { milestones: [{ title: 'past', due_date: '2026-01-01', completed: false }] }
    expect(getNextMilestone(goal, now).isOverdue).toBe(true)
  })

  it('does not flag an undated milestone as overdue', () => {
    expect(getNextMilestone({ milestones: [{ title: 'x', completed: false }] }, now).isOverdue).toBe(false)
  })
})

describe('isMilestoneOverdue across the local-midnight boundary', () => {
  const dueDate = '2026-06-15'

  it('is not overdue one second before local midnight on the day before it is due', () => {
    expect(isMilestoneOverdue({ due_date: dueDate }, new Date(2026, 5, 14, 23, 59, 59))).toBe(false)
  })

  it('is not overdue at any point during the day it is due', () => {
    expect(isMilestoneOverdue({ due_date: dueDate }, new Date(2026, 5, 15, 0, 0, 0))).toBe(false)
    expect(isMilestoneOverdue({ due_date: dueDate }, new Date(2026, 5, 15, 23, 59, 59))).toBe(false)
  })

  it('becomes overdue at local midnight of the following day', () => {
    expect(isMilestoneOverdue({ due_date: dueDate }, new Date(2026, 5, 16, 0, 0, 0))).toBe(true)
  })

  it('is never overdue once completed', () => {
    expect(isMilestoneOverdue({ due_date: '2020-01-01', completed: true }, new Date(2026, 5, 16))).toBe(false)
  })

  it('ignores an unparseable due date rather than throwing', () => {
    expect(isMilestoneOverdue({ due_date: 'not-a-date' }, new Date(2026, 5, 16))).toBe(false)
  })
})

describe('getGoalDeadline', () => {
  const now = new Date(2026, 1, 15, 12, 0, 0)

  it('delegates to quarterUtils.getDaysUntilQuarterEnd for a quarterly goal', () => {
    const goal = { type: 'quarterly', quarter: 1 }
    expect(getGoalDeadline(goal, 2026, now).daysLeft).toBe(getDaysUntilQuarterEnd(2026, 1, now))
  })

  it('measures a yearly goal to the year end, mirroring calculateTimeElapsedPercentage', () => {
    const goal = { type: 'yearly' }
    // Q4's end IS 31 Dec, so the year end comes from the same helper.
    expect(getGoalDeadline(goal, 2026, now).daysLeft).toBe(getDaysUntilQuarterEnd(2026, 4, now))
  })

  it('ignores a stale quarter on a yearly goal', () => {
    expect(getGoalDeadline({ type: 'yearly', quarter: 1 }, 2026, now).daysLeft).toBe(getDaysUntilQuarterEnd(2026, 4, now))
  })

  it('returns null for a quarterly goal with no quarter', () => {
    expect(getGoalDeadline({ type: 'quarterly' }, 2026, now)).toBeNull()
  })

  it('reports isOverdue once the window has closed', () => {
    const past = getGoalDeadline({ type: 'quarterly', quarter: 1 }, 2025, now)
    expect(past.daysLeft).toBeLessThan(0)
    expect(past.isOverdue).toBe(true)
  })

  it('falls back to the current year when planYear is missing', () => {
    expect(getGoalDeadline({ type: 'quarterly', quarter: 1 }, null, now).daysLeft).toBe(getDaysUntilQuarterEnd(2026, 1, now))
  })
})

describe('filterGoalActivities', () => {
  const activities = [
    { _id: 'a1', goal_id: 'g1' },
    { _id: 'a2', goal_id: 'g2' },
    { _id: 'a3', goal_id: 'g1' }
  ]

  it('selects only the activities belonging to the goal', () => {
    expect(filterGoalActivities(activities, 'g1').map((a) => a._id)).toEqual(['a1', 'a3'])
  })

  it('returns an empty array for an unknown goal, a missing id, or no activities', () => {
    expect(filterGoalActivities(activities, 'nope')).toEqual([])
    expect(filterGoalActivities(activities, undefined)).toEqual([])
    expect(filterGoalActivities(null, 'g1')).toEqual([])
  })
})

describe('module purity (UX-CONTRACT §5.1)', () => {
  it('imports no React, no i18n, no service and no component', () => {
    const fs = require('fs')
    const source = fs.readFileSync(require.resolve('./goalDerivation.js'), 'utf8')
    const imports = source.match(/^import .*$/gm) || []
    expect(imports).toEqual(["import { getDaysUntilQuarterEnd } from './quarterUtils'"])
  })

  it('never translates — no t() call and no i18n usage in executable code', () => {
    const fs = require('fs')
    const source = fs.readFileSync(require.resolve('./goalDerivation.js'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bt\(['"`]/) // no t('key') call
    expect(code).not.toMatch(/useTranslation|react-i18next/)
  })
})
