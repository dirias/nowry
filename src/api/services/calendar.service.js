import { tasksService } from './tasks.service'
import { annualPlanningService } from './annualPlanning.service'

/**
 * Parse a date value as LOCAL time.
 * Date-only strings ("2026-02-18") are treated as UTC by `new Date()`,
 * which shifts them back a day in negative-offset timezones (e.g. UTC-6).
 * Appending "T00:00:00" forces local-time parsing instead.
 */
const parseLocalDate = (value) => {
  if (!value) return null
  const s = typeof value === 'string' ? value : String(value)
  // Extract YYYY-MM-DD from any string (handles both "2026-02-18" and "2026-02-18T00:00:00.000Z")
  // and parse as LOCAL midnight to avoid UTC-shift in negative-offset timezones (e.g. CST = UTC-6)
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return new Date(`${match[1]}T00:00:00`)
  return new Date(s)
}

/**
 * Calendar Service
 * Aggregates all user assets with deadline/date fields into a
 * normalized format for the calendar modal.
 *
 * Performance: all independent API calls are made in PARALLEL using
 * Promise.allSettled so a single failure doesn't block the rest.
 */
export const calendarService = {
  /**
   * Fetch and normalize all calendar events from all asset types.
   * Returns array of: { id, title, date, type, color, status }
   */
  async getAllEvents() {
    const events = []

    // ── Run tasks + annual-plan fetch in PARALLEL ────────────────
    const [tasksResult, planResult] = await Promise.allSettled([
      tasksService.getAll(),
      annualPlanningService.getAnnualPlan(new Date().getFullYear())
    ])

    // ── 1. Tasks ─────────────────────────────────────────────────
    if (tasksResult.status === 'fulfilled') {
      tasksResult.value.forEach((task) => {
        if (task.deadline) {
          events.push({
            id: `task-${task._id || task.id}`,
            title: task.title,
            date: parseLocalDate(task.deadline),
            type: 'task',
            color: '#6366f1', // indigo – tasks
            status: task.is_completed ? 'completed' : 'pending',
            category: task.category || null
          })
        }
      })
    } else {
      console.warn('[CalendarService] Could not load tasks:', tasksResult.reason)
    }

    // ── 2. Annual Plan: priorities, focus-areas, goals, activities ─
    const plan = planResult.status === 'fulfilled' ? planResult.value : null

    if (plan?._id) {
      // Fetch priorities + focus areas IN PARALLEL
      const [prioritiesResult, focusAreasResult] = await Promise.allSettled([
        annualPlanningService.getPriorities(plan._id),
        annualPlanningService.getFocusAreas(plan._id)
      ])

      // Priorities
      if (prioritiesResult.status === 'fulfilled') {
        prioritiesResult.value.forEach((p) => {
          if (p.deadline || p.target_date) {
            events.push({
              id: `priority-${p._id}`,
              title: p.title || p.name,
              date: parseLocalDate(p.deadline || p.target_date),
              type: 'priority',
              color: '#f59e0b', // amber – priorities
              status: p.status || 'active'
            })
          }
        })
      } else {
        console.warn('[CalendarService] Could not load priorities:', prioritiesResult.reason)
      }

      // Focus Areas → Goals (all areas fetched IN PARALLEL)
      if (focusAreasResult.status === 'fulfilled') {
        const focusAreas = focusAreasResult.value

        // Fetch all goals for all focus areas IN PARALLEL
        const goalResults = await Promise.allSettled(
          focusAreas.map((area) => annualPlanningService.getGoals(area._id).then((goals) => ({ area, goals })))
        )

        // Collect all (area, goal) pairs and fetch activities IN PARALLEL
        const activityFetches = []
        goalResults.forEach((result) => {
          if (result.status !== 'fulfilled') return
          const { area, goals } = result.value
          const areaColor = area.color || '#10b981' // default emerald

          goals.forEach((goal) => {
            if (goal.target_date || goal.deadline) {
              events.push({
                id: `goal-${goal._id}`,
                title: goal.title,
                date: parseLocalDate(goal.target_date || goal.deadline),
                type: 'goal',
                color: areaColor,
                status: goal.status || 'not_started',
                areaName: area.name
              })
            }
            // Queue activity fetch
            activityFetches.push(
              annualPlanningService
                .getActivities(goal._id)
                .then((activities) => ({ activities, areaColor, areaName: area.name }))
                .catch(() => null)
            )
          })
        })

        // Fetch ALL activities in PARALLEL
        const activityResults = await Promise.allSettled(activityFetches)
        activityResults.forEach((result) => {
          if (result.status !== 'fulfilled' || !result.value) return
          const { activities, areaColor, areaName } = result.value
          activities.forEach((act) => {
            if (act.due_date || act.deadline) {
              events.push({
                id: `activity-${act._id}`,
                title: act.title || act.name,
                date: parseLocalDate(act.due_date || act.deadline),
                type: 'activity',
                color: areaColor,
                status: act.status || 'active',
                areaName
              })
            }
          })
        })
      } else {
        console.warn('[CalendarService] Could not load focus areas/goals:', focusAreasResult.reason)
      }
    } else if (planResult.status === 'rejected') {
      console.warn('[CalendarService] Could not load annual plan:', planResult.reason)
    }

    return events
  }
}
