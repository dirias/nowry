/**
 * PLAN-007 — which occurrences earn a reminder, and when it fires.
 */
import { fireAt, reminderItems } from '../reminders'

const occurrence = (overrides = {}) => ({
  blockId: 'b1',
  date: '2026-10-15',
  start: '07:30',
  lengthMin: 20,
  title: 'Morning review',
  block: { id: 'b1', reminderMin: 5 },
  log: null,
  ...overrides
})

it('fires lead minutes before the start, on the local clock', () => {
  const at = fireAt('2026-10-15', '07:30', 5)
  expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([2026, 9, 15, 7, 25])
  expect(fireAt('2026-10-15', '00:10', 15).getDate()).toBe(14) // the evening before
})

it('earns a reminder only with a lead set, only before it fires, never once logged', () => {
  const now = new Date(2026, 9, 15, 7, 0)
  const items = reminderItems(
    [
      occurrence(),
      occurrence({ blockId: 'b2', block: { id: 'b2', reminderMin: null } }),
      occurrence({ blockId: 'b3', start: '06:30', block: { id: 'b3', reminderMin: 0 } }),
      occurrence({ blockId: 'b4', start: '20:00', block: { id: 'b4', reminderMin: 15 }, log: { status: 'skipped' } }),
      occurrence({ blockId: 'b5', start: '13:00', block: { id: 'b5', reminderMin: 30 } })
    ],
    now
  )
  expect(items.map((i) => i.blockId)).toEqual(['b1', 'b5'])
  expect(items[0].leadMin).toBe(5)
  expect(items[1].fireAt.getHours()).toBe(12)
  expect(items[1].fireAt.getMinutes()).toBe(30)
})
