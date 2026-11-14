/**
 * Whether an account is an admin (ADMIN-004b, FR-009, ADR-086).
 *
 * `/users/me` answers `is_admin: true` for an admin and leaves the field out
 * otherwise; `role` is retired and is never read. Only `true` counts, so a
 * stale profile or a missing field is never an admin. The API decides every
 * admin call on its own (403); this only chooses what the client shows.
 */
export const isAdmin = (user) => user?.is_admin === true
