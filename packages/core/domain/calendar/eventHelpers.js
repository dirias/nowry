/**
 * Small pure helpers shared by the calendar page, the agenda and the event
 * form, so the rules about an event's id and its completion live in one place.
 */

/**
 * Calendar event ids are `<type>-<entity id>` so five entity kinds can share
 * one list. This strips the type back off for the service call. `startsWith`
 * rather than a regex so a hyphenated entity id (UUIDs, `goal-7-0`) is never
 * truncated past its prefix.
 */
const TYPE_PREFIXES = ['task-', 'priority-', 'goal-', 'milestone-', 'activity-']

export const stripTypePrefix = (eventId) => {
  const prefix = TYPE_PREFIXES.find((candidate) => eventId.startsWith(candidate))
  return prefix ? eventId.slice(prefix.length) : eventId
}

/**
 * The types with a completion state of their own (ADR-018). A goal completes
 * through its milestones and its status cascade; a habit is done *today*, in
 * the routine — neither is a row action on a day.
 */
export const COMPLETABLE = ['task', 'priority', 'milestone']

/** The body each completable type's route takes for its done flag. */
export const completionPatch = (type, done) => (type === 'milestone' ? { completed: done } : { is_completed: done })

/** The status a type returns to when un-done, as calendar.service would emit it. */
export const undoneStatus = (type) => (type === 'priority' ? 'active' : 'pending')
