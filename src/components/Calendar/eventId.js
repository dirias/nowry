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
