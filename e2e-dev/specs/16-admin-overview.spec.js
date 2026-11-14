/**
 * The Overview and the admin log (prd-admin.md FR-011, batch 5; boards A and K).
 * /admin opens on the Overview; an invitation sent through the batch call shows
 * in the Overview's "What admins did" and in /admin/log, where the Invitations
 * filter keeps it and the Moderation filter does not; the "Needs you" counts
 * are the API's, and the invitations ending in 3 days match the open
 * invitations the invitation list holds.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignIn } = require('../lib/api')
const { db } = require('../lib/db')

const COHORT = 'e2e'
const THREE_DAYS = 3 * 24 * 3600 * 1000

let adminEmail
let invited

test.beforeAll(async () => {
  adminEmail = alias('ov-admin')
  invited = alias('ov-invited')
  await makeAccount(adminEmail).catch((error) => {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error
  })
  await db('make-admin', adminEmail)
})

const adminHeaders = async () => bearer((await firebaseSignIn(adminEmail)).idToken)

/** One invitation, sent the way the screen sends it; a rerun after a worker restart finds it already open. */
async function sendOne() {
  const client = await api()
  const response = await client.post('/beta/admin/invites/batch', {
    headers: await adminHeaders(),
    data: { addresses: [invited], cohort: COHORT, expires_in_days: 14, locale: 'en', dry_run: false }
  })
  expect(response.status()).toBe(200)
  const [result] = (await response.json()).results
  expect(['sent', 'open_invite']).toContain(result.outcome)
}

async function overview() {
  const client = await api()
  const response = await client.get('/admin/overview', { headers: await adminHeaders() })
  expect(response.status()).toBe(200)
  return response.json()
}

test('[happy] /admin opens on the Overview, first in the tab bar', async ({ page }) => {
  await signIn(page, adminEmail)
  await page.goto('/admin')
  await page.waitForURL((url) => url.pathname === '/admin/overview', { timeout: 30000 })
  const tabs = page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link')
  await expect(tabs.first()).toHaveText('Overview')
  await expect(tabs.first()).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: /Needs you/, level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Emails today/, level: 2 })).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Invitations' })).toBeVisible()
})

test('[happy] a sent invitation shows in the Overview and in the admin log, under Invitations only', async ({ page }) => {
  await sendOne()
  const sentence = `You sent an invitation to ${invited} (${COHORT})`
  const ours = (row) => row.action === 'invite.send' && row.target_title === invited && row.actor.is_you
  // The Overview holds the 8 newest actions of every admin; other scenarios send invitations at the
  // same time, so ours may already be pushed off by newer ones. Judge the card by the answer the page
  // itself loaded: our line is drawn, or the card is full of actions newer than it.
  await signIn(page, adminEmail)
  const loaded = page.waitForResponse((response) => response.url().includes('/admin/overview') && response.ok())
  await page.goto('/admin/overview')
  const recent = (await (await loaded).json()).recent_actions
  const card = page.getByRole('region', { name: 'What admins did' })
  if (recent.some(ours)) {
    await expect(card.getByText(sentence)).toBeVisible({ timeout: 30000 })
  } else {
    expect(recent.length, 'our action was pushed off only by a full card').toBe(8)
  }

  await card.getByRole('link', { name: 'Full log' }).click()
  await page.waitForURL((url) => url.pathname === '/admin/log', { timeout: 30000 })
  // The log is reached from the Overview, so Overview stays marked.
  await expect(page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Overview' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  await expect(page.getByText('kept 24 months')).toBeVisible()
  const table = page.getByRole('table', { name: 'Admin log' })
  const row = table.getByRole('row').filter({ hasText: `Sent an invitation to ${invited} (${COHORT})` })
  await expect(row.first()).toBeVisible({ timeout: 30000 })
  await expect(row.first()).toContainText('You')

  const filters = page.getByRole('group', { name: 'Show one kind of action' })
  await filters.getByRole('button', { name: 'Invitations' }).click()
  await expect(page).toHaveURL(/\/admin\/log\?kind=invitations$/)
  await expect(row.first()).toBeVisible({ timeout: 30000 })

  await filters.getByRole('button', { name: 'Moderation' }).click()
  await expect(page).toHaveURL(/\/admin\/log\?kind=moderation$/)
  await expect(page.getByText(`Sent an invitation to ${invited}`)).toHaveCount(0)
})

test('[happy] the log answers the Invitations kind with invitation actions only', async () => {
  await sendOne()
  const client = await api()
  const response = await client.get('/admin/actions', { headers: await adminHeaders(), params: { kind: 'invitations', limit: 50 } })
  expect(response.status()).toBe(200)
  const { actions } = await response.json()
  expect(actions.length).toBeGreaterThan(0)
  expect(actions.every((action) => action.action.startsWith('invite.'))).toBe(true)
  expect(actions.some((action) => action.target_title === invited)).toBe(true)
})

test('[edge] the Needs you counts are the API’s, and the invitations ending in 3 days match the open list', async ({ page }) => {
  const client = await api()
  const headers = await adminHeaders()
  const list = await (await client.get('/beta/admin/invites', { headers, params: { state: 'open', limit: 200 } })).json()
  test.skip(list.totals.open > 200, `more open invitations (${list.totals.open}) than one list holds`)
  const now = Date.now()
  const endingSoon = list.invites.filter((invite) => {
    const ends = Date.parse(invite.expires_at.endsWith('Z') ? invite.expires_at : `${invite.expires_at}Z`)
    return ends > now && ends - now <= THREE_DAYS
  }).length
  const { needs } = await overview()
  expect(needs.invitations_ending.count).toBe(endingSoon)
  expect(needs.invitations_ending.count).toBeLessThanOrEqual(list.totals.open)

  // Other scenarios run beside this one, so the screen is checked against the answer it drew from.
  await signIn(page, adminEmail)
  const drawn = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/admin/overview'))
  await page.goto('/admin/overview')
  const shown = (await (await drawn).json()).needs
  const counts = {
    'Reports to review': shown.reports_to_review.count,
    'New bug reports': shown.new_bugs.count,
    'Invitations ending in 3 days': shown.invitations_ending.count,
    'Waiting on the list': shown.waiting.count
  }
  for (const [title, count] of Object.entries(counts)) {
    await expect(page.getByRole('link', { name: `${title}: ${count}` })).toBeVisible({ timeout: 30000 })
  }
  const opened = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/beta/admin/invites'))
  await page.getByRole('link', { name: `Invitations ending in 3 days: ${shown.invitations_ending.count}` }).click()
  await expect(page).toHaveURL(/\/admin\/invitations\?state=open$/)
  const open = (await (await opened).json()).totals.open
  await expect(page.getByRole('button', { name: `Open · ${open}` })).toHaveAttribute('aria-pressed', 'true')
})
