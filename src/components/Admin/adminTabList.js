/**
 * The admin area's tabs, in bar order (ADMIN-007a, FR-011, D9). Only tabs that
 * exist are listed: the area grows by one finished tab per batch, so a new tab
 * is one entry here and one route in `App.js`. `/admin` opens on the first.
 * `count` names the readout a tab carries after its label (board A: "Waitlist 37").
 */
export const ADMIN_TABS = Object.freeze([
  { key: 'invitations', path: '/admin/invitations', labelKey: 'admin.tabs.invitations' },
  { key: 'waitlist', path: '/admin/waitlist', labelKey: 'admin.tabs.waitlist', count: 'waiting' }
])

/** Where `/admin` itself opens. */
export const ADMIN_HOME = ADMIN_TABS[0].path
