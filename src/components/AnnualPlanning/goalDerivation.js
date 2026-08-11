/**
 * goalDerivation — the single pure logic core behind every goal surface.
 *
 * Relocated from FocusAreaView.js, which exported these helpers from inside a
 * 1051-line page component; GoalsTabView.js then imported utilities *from a
 * sibling page*. FocusAreaView.js re-exports the original names so existing
 * callers keep resolving.
 *
 * Hard constraints (ADR-003 / UX-CONTRACT §5.1):
 *   - no React, no t(), no service, no component imports;
 *   - GOAL_STATE_COLOR is the ONLY state -> color map in src/;
 *   - no new date math — calendar distances delegate to quarterUtils, which
 *     documents why they must stay client-side and local-timezone.
 */
import { getDaysUntilQuarterEnd } from './quarterUtils'

/**
 * Calendar quarter (1-4) containing `now`, in local time.
 * Moved from FocusAreaView.js:60. `now` is an added optional parameter so the
 * derivation below can be evaluated deterministically in tests; omitted, the
 * behaviour is identical to the original.
 */
export const getCurrentQuarter = (now = new Date()) => {
  const month = now.getMonth() + 1
  return Math.ceil(month / 3)
}

/**
 * Completion percentage. Milestone-based when the goal has milestones, else the
 * stored `progress` field. Moved verbatim from FocusAreaView.js:65.
 */
export const calculateProgress = (goal) => {
  if (goal.milestones && goal.milestones.length > 0) {
    const completedCount = goal.milestones.filter((m) => m.completed).length
    return Math.round((completedCount / goal.milestones.length) * 100)
  }
  return goal.progress || 0
}

/**
 * How much of the goal's window has elapsed, 0-100. Yearly goals measure against
 * the calendar year; quarterly goals against their own quarter.
 * Moved from FocusAreaView.js:73 with `now` added as an optional parameter.
 */
export const calculateTimeElapsedPercentage = (goal, currentQuarter, now = new Date()) => {
  const year = now.getFullYear()
  const today = now
  if (goal.type === 'yearly') {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year + 1, 0, 1)
    const totalDays = (yearEnd - yearStart) / 86400000
    const daysElapsed = Math.min(Math.max((today - yearStart) / 86400000, 0), totalDays)
    return Math.round((daysElapsed / totalDays) * 100)
  }
  // quarterly
  const goalQuarter = goal.quarter || currentQuarter
  if (goalQuarter < currentQuarter) return 100 // that quarter has already fully elapsed
  if (goalQuarter > currentQuarter) return 0 // that quarter has not started yet
  const quarterStartMonth = (goalQuarter - 1) * 3
  const quarterStart = new Date(year, quarterStartMonth, 1)
  const quarterEnd = new Date(year, quarterStartMonth + 3, 1)
  const totalDays = (quarterEnd - quarterStart) / 86400000
  const daysElapsed = Math.min(Math.max((today - quarterStart) / 86400000, 0), totalDays)
  return Math.round((daysElapsed / totalDays) * 100)
}

/**
 * One call replacing the four duplicated `.filter(m => m.completed).length`
 * sites. `isMilestoneBased` tells callers whether `completed`/`total` are
 * meaningful (a goal with no milestones reports its stored percentage only).
 *
 * @returns {{ percent: number, completed: number, total: number, isMilestoneBased: boolean }}
 */
export const getGoalProgress = (goal) => {
  const milestones = goal?.milestones || []
  const total = milestones.length
  if (total > 0) {
    const completed = milestones.filter((m) => m.completed).length
    return { percent: Math.round((completed / total) * 100), completed, total, isMilestoneBased: true }
  }
  return { percent: goal?.progress || 0, completed: 0, total: 0, isMilestoneBased: false }
}

/** The five goal states. Ordered as they are evaluated. */
export const GOAL_STATES = ['completed', 'not_started', 'on_track', 'at_risk', 'behind']

/**
 * The single state -> Joy palette map for the whole feature. Replaces both
 * copies of HEALTH_STATUS_MAP. Colour on a goal means health and nothing else.
 */
export const GOAL_STATE_COLOR = {
  completed: 'success',
  not_started: 'neutral',
  on_track: 'success',
  at_risk: 'warning',
  behind: 'danger'
}

/**
 * State -> i18n key *suffix* under `annualPlanning.goal.healthStatus.`.
 * Suffixes only: a pure module never calls t().
 */
export const GOAL_STATE_I18N = {
  completed: 'completed',
  not_started: 'notStarted',
  on_track: 'onTrack',
  at_risk: 'atRisk',
  behind: 'behind'
}

/**
 * Supersedes getHealthStatus (FocusAreaView.js:95). Identical output for every
 * input except the new `not_started` branch, which catches goals whose window
 * has not opened yet — previously reported as `on_track`, which claimed credit
 * for a quarter that had not begun.
 *
 * @returns {'completed'|'not_started'|'on_track'|'at_risk'|'behind'}
 */
export const getGoalState = (goal, now = new Date()) => {
  if (goal?.status === 'completed') return 'completed'
  const quarter = getCurrentQuarter(now)
  const timeElapsed = calculateTimeElapsedPercentage(goal, quarter, now)
  const progress = calculateProgress(goal)
  if (timeElapsed === 0 && progress === 0) return 'not_started'
  const gap = timeElapsed - progress
  if (gap <= 0) return 'on_track'
  if (gap <= 25) return 'at_risk'
  return 'behind'
}

/** Local midnight of a `YYYY-MM-DD` milestone due date, or null. */
const parseDueDate = (dueDate) => {
  if (!dueDate) return null
  const parsed = new Date(`${dueDate}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * A milestone is overdue once its due *day* is behind today's local day — never
 * during the day it is due. Comparing raw timestamps (`due < now`) would flip a
 * milestone to overdue at 00:00 on the morning it is actually due.
 */
export const isMilestoneOverdue = (milestone, now = new Date()) => {
  if (!milestone || milestone.completed) return false
  const due = parseDueDate(milestone.due_date)
  if (!due) return false
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return due.getTime() < todayMidnight.getTime()
}

/**
 * The milestone the next-action ladder points at: earliest `due_date` first,
 * undated milestones behind dated ones in array order. Milestone has no `order`
 * field and does not need one.
 *
 * @returns {{ milestone: object, index: number, isOverdue: boolean }|null}
 */
export const getNextMilestone = (goal, now = new Date()) => {
  const milestones = goal?.milestones || []
  const incomplete = milestones.map((milestone, index) => ({ milestone, index })).filter((entry) => !entry.milestone.completed)
  if (incomplete.length === 0) return null

  const [next] = [...incomplete].sort((a, b) => {
    const aDue = a.milestone.due_date || null
    const bDue = b.milestone.due_date || null
    if (aDue && bDue) return aDue === bDue ? a.index - b.index : aDue < bDue ? -1 : 1
    if (aDue) return -1
    if (bDue) return 1
    return a.index - b.index
  })

  return { milestone: next.milestone, index: next.index, isOverdue: isMilestoneOverdue(next.milestone, now) }
}

/**
 * Days remaining in the goal's window. Wraps quarterUtils — no new date math.
 * Yearly goals measure to the year end, mirroring calculateTimeElapsedPercentage's
 * yearly branch; Q4's end *is* Dec 31, so the same helper serves both.
 *
 * @returns {{ daysLeft: number, isOverdue: boolean }|null} null when the goal has no window
 */
export const getGoalDeadline = (goal, planYear, now = new Date()) => {
  const year = Number(planYear) || now.getFullYear()
  const quarter = goal?.type === 'yearly' ? 4 : goal?.quarter
  if (!quarter) return null
  const daysLeft = getDaysUntilQuarterEnd(year, quarter, now)
  return { daysLeft, isOverdue: daysLeft < 0 }
}

/**
 * Activities belonging to one goal, out of the flat plan-wide array that
 * GET /annual-plan/full already returns. Exists so no component re-derives it
 * (and so nothing re-fetches per goal).
 */
export const filterGoalActivities = (activities, goalId) => {
  if (!goalId) return []
  return (activities || []).filter((activity) => activity?.goal_id === goalId)
}

export default {
  getCurrentQuarter,
  calculateProgress,
  calculateTimeElapsedPercentage,
  getGoalProgress,
  getGoalState,
  getNextMilestone,
  getGoalDeadline,
  isMilestoneOverdue,
  filterGoalActivities,
  GOAL_STATES,
  GOAL_STATE_COLOR,
  GOAL_STATE_I18N
}
