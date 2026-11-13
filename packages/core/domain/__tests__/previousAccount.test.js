/** ADR-089, FR-041: the re-registration notice's two dates, in the reader's language. */
import { previousAccountDates } from '../previousAccount'

const previous = { deleted_at: '2026-11-10T09:00:00+00:00', erased_at: '2026-12-10T09:00:00+00:00' }

test('both dates are written as long dates in the language asked for', () => {
  expect(previousAccountDates(previous, 'en')).toEqual({ deletedOn: 'November 10, 2026', erasedOn: 'December 10, 2026' })
  expect(previousAccountDates(previous, 'es').deletedOn).toBe('10 de noviembre de 2026')
})

test('nothing to say without both dates', () => {
  expect(previousAccountDates(null)).toBe(null)
  expect(previousAccountDates({ deleted_at: previous.deleted_at })).toBe(null)
  expect(previousAccountDates({ deleted_at: 'nope', erased_at: 'nope' })).toBe(null)
})
