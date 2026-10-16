import { priorityItemRef } from '../priorities'

describe('priorityItemRef (ADR-046 §5)', () => {
  it('a flagged task is addressed by its own id, which the shape repeats as the linked entity', () => {
    expect(priorityItemRef({ _id: 't1', linked_entity_type: 'task', linked_entity_id: 't1' })).toEqual({ kind: 'task', id: 't1' })
  })

  it('a flagged milestone is addressed by its goal and itself', () => {
    expect(priorityItemRef({ _id: 'm1', linked_entity_type: 'milestone', linked_entity_id: 'g1' })).toEqual({
      kind: 'milestone',
      goalId: 'g1',
      id: 'm1'
    })
  })

  it('falls back to the row id when no link is set', () => {
    expect(priorityItemRef({ id: 'x' })).toEqual({ kind: 'task', id: 'x' })
  })
})
