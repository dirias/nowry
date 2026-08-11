import { useMemo } from 'react'
import {
  GOAL_STATE_COLOR,
  GOAL_STATE_I18N,
  filterGoalActivities,
  getGoalDeadline,
  getGoalProgress,
  getGoalState,
  getNextMilestone
} from '../components/AnnualPlanning/goalDerivation'

/**
 * useGoalCardModel — the one view model behind every goal layout.
 *
 * GoalCard and GoalRow consume this and nothing else: neither may derive state,
 * map a colour, or compute progress itself. Memoised on its inputs so a
 * re-render with identical props returns a referentially equal object and the
 * layouts stay cheap in a long grid.
 *
 * @param {object} goal
 * @param {{ area?: object, activities?: Array, quarterReports?: Array, planYear?: number }} context
 * @returns {{
 *   state: string, color: string, stateLabelKey: string,
 *   progress: { percent: number, completed: number, total: number, isMilestoneBased: boolean },
 *   next: { milestone: object, index: number, isOverdue: boolean }|null,
 *   deadline: { daysLeft: number, isOverdue: boolean }|null,
 *   activities: Array, activityCount: number,
 *   isLocked: boolean, areaName: string|null, areaColor: string|null
 * }}
 */
const useGoalCardModel = (goal, { area = null, activities = null, quarterReports = null, planYear = null } = {}) =>
  useMemo(() => {
    const state = getGoalState(goal)
    const goalActivities = filterGoalActivities(activities, goal?._id)

    // Mirrors GoalsTabView's isGoalQuarterClosed: a goal is locked once a
    // quarter_report exists for its quarter in the plan's year. Yearly
    // objectives have no quarter and are therefore never quarter-locked.
    const isLocked = goal?.quarter
      ? (quarterReports || []).some((report) => report.quarter === goal.quarter && report.year === planYear)
      : false

    return {
      state,
      color: GOAL_STATE_COLOR[state],
      stateLabelKey: `annualPlanning.goal.healthStatus.${GOAL_STATE_I18N[state]}`,
      progress: getGoalProgress(goal),
      next: getNextMilestone(goal),
      deadline: getGoalDeadline(goal, planYear),
      activities: goalActivities,
      activityCount: goalActivities.length,
      isLocked,
      areaName: area?.name || null,
      areaColor: area?.color || null
    }
  }, [goal, area, activities, quarterReports, planYear])

export default useGoalCardModel
