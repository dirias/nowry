/**
 * The admin area's tabs, in bar order (ADMIN-007a, FR-011, D9). Only tabs that
 * exist are listed: the area grows by one finished tab per batch, so a new tab
 * is one entry here and one route in `App.js`. `/admin` opens on the first.
 */
export const ADMIN_TABS = Object.freeze([{ key: 'invitations', path: '/admin/invitations', labelKey: 'admin.tabs.invitations' }])

/** Where `/admin` itself opens. */
export const ADMIN_HOME = ADMIN_TABS[0].path
