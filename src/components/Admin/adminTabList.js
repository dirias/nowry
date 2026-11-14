/**
 * The admin area's tabs, in bar order (ADMIN-007a, FR-011, D9). Only tabs that
 * exist are listed: the area grows by one finished tab per batch, so a new tab
 * is one entry here and one route in `App.js`. The order is the boards'
 * (Overview, Moderation, Bug reports, Invitations, Waitlist), so a tab built
 * later is inserted where the boards draw it, not appended.
 * `count` names the readout a tab carries after its label (board A: "Waitlist 37").
 * `also` lists pages reached from a tab that keep it marked (board K: the admin
 * log opens from the Overview, so Overview stays selected there).
 */
export const ADMIN_TABS = Object.freeze([
  { key: 'overview', path: '/admin/overview', labelKey: 'admin.tabs.overview', also: ['/admin/log'] },
  { key: 'moderation', path: '/admin/moderation', labelKey: 'admin.tabs.moderation', count: 'toReview' },
  { key: 'bugs', path: '/admin/bugs', labelKey: 'admin.tabs.bugs', count: 'newBugs' },
  { key: 'invitations', path: '/admin/invitations', labelKey: 'admin.tabs.invitations' },
  { key: 'waitlist', path: '/admin/waitlist', labelKey: 'admin.tabs.waitlist', count: 'waiting' }
])

/** Where `/admin` itself opens: the Overview, the first tab (FR-011, D9; batch 5). */
export const ADMIN_HOME = '/admin/overview'
