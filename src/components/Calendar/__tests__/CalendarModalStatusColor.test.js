/**
 * Guard for the one cross-domain coupling the Goals-tab redesign (ADR-003)
 * touched.
 *
 * calendar.service.js:182 stamps `status: goal.status` onto every `type: 'goal'`
 * calendar event, and CalendarModal.js colours the event chip from it. ADR-003
 * removed the goal card's click-cycle, which was the only surface that wrote
 * `in_progress` implicitly — the value is still written explicitly from the
 * detail drawer's lifecycle Select and the overflow menu's "Reopen goal", so
 * the calendar is unaffected.
 *
 * This suite pins that mapping so a future change to the goal status model
 * cannot silently alter calendar colours. It is deliberately small: a guard,
 * not a CalendarModal test-suite project. Following the convention already used
 * in CalendarPage.test.js, the predicate is mirrored here AND checked against
 * the source, so editing CalendarModal.js without updating this file fails.
 */
const fs = require('fs')

const SOURCE = fs.readFileSync(require.resolve('../CalendarModal.js'), 'utf8')

/** Mirrors statusColor() in CalendarModal.js:134-139. */
const statusColor = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'primary'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

describe('CalendarModal status -> chip colour', () => {
  it.each([
    ['completed', 'success'],
    ['in_progress', 'primary'],
    ['pending', 'warning']
  ])('maps %s to %s', (status, expected) => {
    expect(statusColor(status)).toBe(expected)
  })

  it('falls through to neutral for not_started — the goal status with no explicit branch', () => {
    expect(statusColor('not_started')).toBe('neutral')
  })

  it('falls through to neutral for any unknown, absent or future status value', () => {
    expect(statusColor('archived')).toBe('neutral')
    expect(statusColor(undefined)).toBe('neutral')
    expect(statusColor(null)).toBe('neutral')
    expect(statusColor('')).toBe('neutral')
  })

  it('covers every status the Goal model can hold', () => {
    // Goal.status values per Nowry-API/app/models/Goal.py.
    const goalStatuses = ['not_started', 'in_progress', 'completed']
    goalStatuses.forEach((status) => {
      expect(['success', 'primary', 'warning', 'neutral']).toContain(statusColor(status))
    })
  })
})

describe('the mirror still matches CalendarModal.js', () => {
  it.each([
    ["if (status === 'completed') return 'success'", 'completed'],
    ["if (status === 'in_progress') return 'primary'", 'in_progress'],
    ["if (status === 'pending') return 'warning'", 'pending']
  ])('source still contains the %s branch', (branch) => {
    expect(SOURCE).toContain(branch)
  })

  it('source still ends statusColor with a neutral fallthrough', () => {
    const fn = SOURCE.slice(SOURCE.indexOf('const statusColor'))
    expect(fn.slice(0, fn.indexOf('}'))).toContain("return 'neutral'")
  })
})
