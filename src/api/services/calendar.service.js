import { tasksService } from './tasks.service'
import { annualPlanningService } from './annualPlanning.service'
import { apiCache } from '../utils/cache'

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
const PLAN_TTL = 5 * 60000 // 5 minutes — shared with useAnnualPlan
const CALENDAR_TTL = 2 * 60000 // 2 minutes — calendar result cache

/**
 * Calendar Service
 * Aggregates all user assets with deadline/date fields into a
 * normalized format for the calendar modal.
 *
 * Performance strategy:
 *  1. Use /annual-plan/full (same cache key as useAnnualPlan) to collapse
 *     the plan→areas→goals waterfall into a single request
 *  2. Run tasks + full-plan fetch in parallel
 *  3. Run all activity fetches in parallel after the full plan resolves
 *  4. Cache the final events array so reopening the modal is instant
 */
export const calendarService = {
  async getAllEvents() {
    const year = new Date().getFullYear()
    const cacheKey = `calendar:events:${year}`

    return apiCache.get(cacheKey, CALENDAR_TTL, async () => {
      const events = []

      // ── Tier 1: tasks + full annual plan IN PARALLEL ────────────────────
      const [tasksResult, fullPlanResult] = await Promise.allSettled([
        tasksService.getAll(),
        // Use the same cache key as useAnnualPlan so if the planning page
        // was visited first, this is a free cache hit (zero network request)
        apiCache.get(`annualPlanFull:${year}`, PLAN_TTL, () => annualPlanningService.getFullAnnualPlan(year))
      ])

      // ── 1. Tasks ─────────────────────────────────────────────────────────
      if (tasksResult.status === 'fulfilled') {
        tasksResult.value.forEach((task) => {
          if (task.deadline) {
            events.push({
              id: `task-${task._id || task.id}`,
              title: task.title,
              date: parseLocalDate(task.deadline),
              type: 'task',
              color: '#6366f1',
              status: task.is_completed ? 'completed' : 'pending',
              category: task.category || null
            })
          }
        })
      } else {
        console.warn('[CalendarService] Could not load tasks:', tasksResult.reason)
      }

      // ── 2. Annual plan: priorities, goals, activities ────────────────────
      if (fullPlanResult.status === 'fulfilled') {
        const { plan, priorities = [], focus_areas = [] } = fullPlanResult.value

        // Priorities
        priorities.forEach((p) => {
          if (p.deadline || p.target_date) {
            events.push({
              id: `priority-${p._id}`,
              title: p.title || p.name,
              date: parseLocalDate(p.deadline || p.target_date),
              type: 'priority',
              color: '#f59e0b',
              status: p.status || 'active'
            })
          }
        })

        // Build a lookup map: focus_area_id → { color, name }
        // The /full endpoint returns goals as a TOP-LEVEL array (not nested
        // under each focus_area), so we need to map colors by ID.
        const areaMap = Object.fromEntries(focus_areas.map((area) => [area._id, { color: area.color || '#10b981', name: area.name }]))

        // Goals — use top-level `goals` array from API response
        const topLevelGoals = fullPlanResult.value.goals || []
        const activityFetches = []

        topLevelGoals.forEach((goal) => {
          const area = areaMap[goal.focus_area_id] || { color: '#10b981', name: '' }
          const areaColor = area.color
          const areaName = area.name

          if (goal.target_date || goal.deadline) {
            events.push({
              id: `goal-${goal._id}`,
              title: goal.title,
              date: parseLocalDate(goal.target_date || goal.deadline),
              type: 'goal',
              color: areaColor,
              status: goal.status || 'not_started',
              areaName
            })
          }

          // Milestone events — push milestones that have a due_date set
          ;(goal.milestones || []).forEach((ms, idx) => {
            if (ms.due_date && !ms.completed) {
              events.push({
                id: `milestone-${goal._id}-${idx}`,
                title: ms.title,
                date: parseLocalDate(ms.due_date),
                type: 'milestone',
                color: areaColor,
                status: 'pending',
                areaName,
                goalTitle: goal.title
              })
            }
          })

          // Queue activity fetch — all fired in parallel below
          activityFetches.push(
            apiCache
              .get(`activities:${goal._id}`, PLAN_TTL, () => annualPlanningService.getActivities(goal._id))
              .then((activities) => ({ activities, areaColor, areaName }))
              .catch(() => null)
          )
        })

        // ── Tier 2: all activities in PARALLEL ──────────────────────────
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
        console.warn('[CalendarService] Could not load annual plan:', fullPlanResult.reason)
      }

      return events
    })
  }
}
