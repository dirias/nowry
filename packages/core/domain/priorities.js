/**
 * Priority is a flag, not an object (ADR-046 §5). The API still answers the
 * old Priority shape for the lists, and that shape carries the address of the
 * item the flag is on: a task's id, or a milestone's goal and its own id. The
 * two writes a priority row can make — done, and the flag off — go to that
 * item, never to a priority.
 */

/** @returns {{kind: 'task', id: string} | {kind: 'milestone', goalId: string, id: string}} */
export const priorityItemRef = (priority) => {
  const ownId = priority?._id ?? priority?.id
  if (priority?.linked_entity_type === 'milestone') return { kind: 'milestone', goalId: priority.linked_entity_id, id: ownId }
  return { kind: 'task', id: priority?.linked_entity_id ?? ownId }
}
