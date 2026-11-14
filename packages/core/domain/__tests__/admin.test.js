/** ADMIN-004b — the admin signal is `is_admin: true` on `/users/me`, and nothing else. */
import { isAdmin } from '../admin'

test('an account is an admin only when /users/me says is_admin: true', () => {
  expect(isAdmin({ is_admin: true })).toBe(true)
  expect(isAdmin({ is_admin: false })).toBe(false)
  expect(isAdmin({ is_admin: 'true' })).toBe(false)
  expect(isAdmin({})).toBe(false)
  expect(isAdmin(null)).toBe(false)
})

test('the retired role is never read', () => {
  expect(isAdmin({ role: 'dev' })).toBe(false)
  expect(isAdmin({ role: 'admin' })).toBe(false)
})
