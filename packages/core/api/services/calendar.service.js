import { tasksService } from './tasks.service'
import { annualPlanningService, fetchAnnualPlanData } from './annualPlanning.service'
import { COMPLETABLE, completionPatch, stripTypePrefix } from '../../domain/calendar/eventHelpers'
import { queryClient } from '../queryClient'
import { categoryDot } from '../../tokens/colorSystem'

/** Types the learner did not colour, drawn from the category family (ADR-034). */
const TASK_COLOR = categoryDot('lake')
const PRIORITY_COLOR = categoryDot('amber')
const UNASSIGNED_AREA_COLOR = categoryDot('moss')

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
 * Helper to get calendar occurrences for recurring habits correctly
 */
const generateHabitOccurrences = (act, year, areaColor, areaName, events) => {
  const startDateStr = act.created_at || act.startDate || `${year}-01-01T00:00:00`
  const startDate = new Date(startDateStr)
  const start = startDate.getFullYear() < year ? new Date(year, 0, 1) : startDate
  // Strip time from start for clean date comparison
  start.setHours(0, 0, 0, 0)

  const end = new Date(year, 11, 31, 0, 0, 0, 0)

  if (act.frequency === 'daily') {
    const d = new Date(start)
    while (d <= end) {
      const snapshot = new Date(d) // immutable copy — capture before advancing d
      events.push({
        id: `activity-${act._id || act.id}-${snapshot.getTime()}`,
        title: act.title || act.name,
        date: snapshot,
        type: 'activity',
        color: areaColor,
        status: act.status || 'active',
        areaName,
        focusAreaId: act.focus_area_id || null // D-02
      })
      d.setDate(d.getDate() + 1) // advance AFTER the push
    }
  } else if (act.frequency === 'weekly' || act.frequency === 'custom') {
    const daysAllowed = act.days_of_week || [] // 0=Mon, 6=Sun
    const d = new Date(start)
    while (d <= end) {
      const snapshot = new Date(d) // immutable copy — capture before advancing d
      const jsDay = snapshot.getDay() // 0=Sun, 1=Mon
      const backendDay = (jsDay + 6) % 7 // shift to 0=Mon, 6=Sun
      if (daysAllowed.includes(backendDay)) {
        events.push({
          id: `activity-${act._id || act.id}-${snapshot.getTime()}`,
          title: act.title || act.name,
          date: snapshot,
          type: 'activity',
          color: areaColor,
          status: act.status || 'active',
          areaName,
          focusAreaId: act.focus_area_id || null // D-02
        })
      }
      d.setDate(d.getDate() + 1) // advance AFTER the check
    }
  } else if (act.due_date || act.deadline) {
    // Fallback for any legacy activities that might actually have a date
    events.push({
      id: `activity-${act._id || act.id}`,
      title: act.title || act.name,
      date: parseLocalDate(act.due_date || act.deadline),
      type: 'activity',
      color: areaColor,
      status: act.status || 'active',
      areaName,
      focusAreaId: act.focus_area_id || null // D-02
    })
  }
}

const PLAN_TTL = 5 * 60000 // 5 minutes — shared with useAnnualPlan's PLAN_STALE_TIME
const CALENDAR_TTL = 2 * 60000 // 2 minutes — calendar result cache

/**
 * The calendar's query key, exported so every client reads and writes ONE
 * cache entry. The web fetches through `getAllEvents`; the phone subscribes to
 * the same key with `useCalendarEvents`, which is what makes the calendar
 * survive airplane mode on a device where the cache is persisted to disk.
 */
export const calendarEventsKey = (userId, year = new Date().getFullYear()) => ['calendarEvents', userId, year]

/**
 * Calendar Service
 * Aggregates all user assets with deadline/date fields into a
 * normalized format for the calendar modal.
 *
 * Performance strategy:
 *  1. Use /annual-plan/full (via fetchAnnualPlanData, the SAME React Query key
 *     + queryFn useAnnualPlan.js uses) to collapse the plan→areas→goals
 *     waterfall into a single request
 *  2. Run tasks + full-plan fetch in parallel
 *  3. Run all activity fetches in parallel after the full plan resolves
 *  4. Cache the final events array so reopening the modal is instant
 *
 * React Query migration (CACHE-008 / ADR-008): replaces the old apiCache
 * singleton. `getAllEvents` and `invalidateCache` both take a `userId` param
 * (the caller's `useAuth().user?.id`) rather than resolving it internally —
 * this is a plain service function, not a hook or component, so it has no
 * direct access to AuthContext.
 *
 * Split out of `getAllEvents` so a React Query hook can BE the cache rather
 * than nest inside one: a `useQuery` on this key whose queryFn called
 * `getAllEvents` would call `fetchQuery` on the key it is already fetching,
 * and wait on itself. The web still goes through `getAllEvents`; the phone
 * subscribes to the key instead.
 *
 * @param {string|null} userId - the caller's backend user id
 * @param {number} [year]
 * @returns {Promise<{ events: Array, focusAreas: Array }>}
 */
export async function fetchCalendarEvents(userId, year = new Date().getFullYear()) {
  const events = []
  let areaMap = {} // D-01: populated from focusAreas; used to build focusAreas array

  // ── Tier 1: tasks + full annual plan IN PARALLEL ────────────────────
  const [tasksResult, fullPlanResult] = await Promise.allSettled([
    tasksService.getAll(),
    // Same query key + queryFn useAnnualPlan.js uses for ['annualPlan', userId,
    // year] — if the planning page was visited first, this is a real cache hit
    // (zero network request), not a duplicate fetch (CACHE-008).
    queryClient.fetchQuery({
      queryKey: ['annualPlan', userId, year],
      queryFn: () => fetchAnnualPlanData(year),
      staleTime: PLAN_TTL
    })
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
          color: TASK_COLOR,
          status: task.is_completed ? 'completed' : 'pending',
          category: task.category || null,
          focusAreaId: null // D-02: tasks have no focus area
        })
      }
    })
  } else {
    console.warn('[CalendarService] Could not load tasks:', tasksResult.reason)
  }

  // ── 2. Annual plan: priorities, goals, activities ────────────────────
  if (fullPlanResult.status === 'fulfilled') {
    // fetchAnnualPlanData's normalized shape (see annualPlanning.service.js):
    // focusAreas/goals/activities/priorities, goal.focus_area_id already
    // normalized to the plain area id string (not raw `focus_areas`/snake_case).
    const { priorities = [], focusAreas: planFocusAreas = [], goals = [], activities = [] } = fullPlanResult.value

    // Priorities
    priorities.forEach((p) => {
      if (p.deadline || p.target_date) {
        events.push({
          id: `priority-${p._id}`,
          title: p.title || p.name,
          date: parseLocalDate(p.deadline || p.target_date),
          type: 'priority',
          color: PRIORITY_COLOR,
          // A finished priority reads as `completed`, the same word tasks
          // use, so the agenda has one rule for the two tickable types
          // (ADR-016). Unfinished keeps whatever the plan says.
          status: p.is_completed ? 'completed' : p.status || 'active',
          focusAreaId: null // D-02: priorities have no focus area
        })
      }
    })

    // Build a lookup map: focus_area_id → { color, name }
    // Assigned to outer areaMap so focusAreas can be extracted after all event pushes (D-01)
    areaMap = Object.fromEntries(planFocusAreas.map((area) => [area._id || area.id, { color: area.color || UNASSIGNED_AREA_COLOR, name: area.name }]))

    goals.forEach((goal) => {
      const area = areaMap[goal.focus_area_id] || { color: UNASSIGNED_AREA_COLOR, name: '' }
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
          areaName,
          focusAreaId: goal.focus_area_id || null // D-02
        })
      }

      // Milestone events — push milestones that have a due_date set
      // idx is raw array index (forEach, not filter().forEach()) — stable across completions
      ;(goal.milestones || []).forEach((ms, idx) => {
        // Completed milestones stay on the calendar, struck through like a
        // done task, rather than vanishing on the next load (ADR-018).
        if (ms.due_date) {
          events.push({
            id: `milestone-${goal._id}-${idx}`,
            title: ms.title,
            date: parseLocalDate(ms.due_date),
            type: 'milestone',
            color: areaColor,
            status: ms.completed ? 'completed' : 'pending',
            areaName,
            goalTitle: goal.title,
            // The pair the milestone PATCH route is addressed by. The event
            // id above stays index-based for stability; these are what an
            // edit from the calendar actually sends (CAL-004).
            goalId: goal._id,
            milestoneId: ms.id ?? null,
            focusAreaId: goal.focus_area_id || null // D-02: milestones inherit from parent goal
          })
        }
      })
    })

    // Activities are returned from /full directly
    activities.forEach((act) => {
      const area = areaMap[act.focus_area_id] || { color: UNASSIGNED_AREA_COLOR, name: '' }
      generateHabitOccurrences(act, year, area.color, area.name, events)
    })
  } else {
    console.warn('[CalendarService] Could not load annual plan:', fullPlanResult.reason)
  }

  // D-01: extract focusAreas from areaMap built earlier in this function
  const focusAreas = Object.entries(areaMap).map(([id, { color, name }]) => ({ id, name, color }))

  return { events, focusAreas }
}

export const calendarService = {
  /** @param {string|null} userId - Caller's backend user id (useAuth().user?.id ?? null) */
  async getAllEvents(userId) {
    const year = new Date().getFullYear()

    return queryClient.fetchQuery({
      queryKey: calendarEventsKey(userId, year),
      queryFn: () => fetchCalendarEvents(userId, year),
      staleTime: CALENDAR_TTL
    })
  },

  /**
   * Add one dated thing (ADR-017).
   *
   * Four kinds, four endpoints, and the differences between them are not
   * cosmetic: a goal has to carry the quarter and year its target date falls
   * in, or it lands outside the quarter view it belongs to, and a milestone is
   * addressed through its goal rather than by an id of its own. That knowledge
   * lived inside the web's form. It is here now because the phone needs the
   * same four writes, and a second copy of the quarter arithmetic is a second
   * answer to which quarter a date is in.
   *
   * Habit is deliberately not one of them: a habit is a schedule, and a form
   * that can only write a date cannot make one.
   */
  async createEvent({ type, title, description = '', date = null, focusAreaId = null, goalId = null, annualPlanId = null }) {
    const trimmed = title.trim()
    switch (type) {
      case 'task':
        return tasksService.create({ title: trimmed, deadline: date || null })
      case 'priority':
        return annualPlanningService.createPriority({
          title: trimmed,
          description: description.trim() || '',
          deadline: date || null,
          annual_plan_id: annualPlanId,
          focus_area_id: null,
          linked_entity_id: null,
          linked_entity_type: null
        })
      case 'goal': {
        // T00:00:00 forces local-time parsing; a date-only string is UTC to
        // `new Date()` and slips back a day west of Greenwich.
        const target = date ? new Date(`${date}T00:00:00`) : new Date()
        return annualPlanningService.createGoal({
          title: trimmed,
          target_date: date || null,
          focus_area_id: focusAreaId,
          quarter: Math.ceil((target.getMonth() + 1) / 3),
          year: target.getFullYear()
        })
      }
      case 'milestone':
        return annualPlanningService.createMilestone(goalId, { title: trimmed, due_date: date || null })
      default:
        return null
    }
  },

  /**
   * Change one, including whether it is done — which rides in the same request
   * as the rest rather than a second one (ADR-018).
   *
   * The `event` is the normalised calendar event, because two of these cases
   * need what only it carries: a milestone's real address is its goal's id and
   * its own, never the index-based event id (CAL-004).
   */
  async updateEvent({ event, title, description = '', date = null, done = false }) {
    const type = event?.type ?? 'task'
    const rawId = event?.id ? stripTypePrefix(event.id) : null
    if (!rawId) throw new Error('calendarService.updateEvent: the event has no id')

    const trimmed = title.trim()
    const completion = COMPLETABLE.includes(type) ? completionPatch(type, done) : {}

    switch (type) {
      case 'task':
        return tasksService.update(rawId, { title: trimmed, deadline: date || null, ...completion })
      case 'priority':
        return annualPlanningService.updatePriority(rawId, {
          title: trimmed,
          description: description.trim() || '',
          deadline: date || null,
          ...completion
        })
      case 'goal':
        return annualPlanningService.updateGoal(rawId, { title: trimmed, target_date: date || null })
      case 'activity':
        return annualPlanningService.updateActivity(rawId, { title: trimmed, due_date: date || null })
      case 'milestone':
        if (!event?.goalId || !event?.milestoneId) throw new Error('calendarService.updateEvent: the milestone has no address')
        return annualPlanningService.updateMilestone(event.goalId, event.milestoneId, {
          title: trimmed,
          due_date: date || null,
          ...completion
        })
      default:
        return null
    }
  },

  /**
   * Flush all cached calendar-events entries for every year, for one user.
   * Called after event create or drag-and-drop to force a fresh fetch.
   * @param {string|null} userId - Caller's backend user id (useAuth().user?.id ?? null)
   */
  invalidateCache(userId) {
    queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] })
  }
}
