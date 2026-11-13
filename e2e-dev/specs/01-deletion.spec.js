/**
 * Deletion (ADR-089, FR-038..041): an old sign-in is asked for again; the
 * deletion then goes through; one notice email; the records are marked; the
 * same address signs up again empty; the re-registration notice appears only
 * after verification; after 30 days it is gone and the old record is erased.
 * Steps share one browser so the sign-in really is more than 5 minutes old.
 */
const { test, expect, sharedPage } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signUp, skipOnboarding, verifyEmail, pageToken } = require('../lib/ui')
const { api, bearer, firebaseSignIn } = require('../lib/api')
const { emails, waitForEmails } = require('../lib/outbox')
const { db } = require('../lib/db')
const { PASSWORD } = require('../lib/env')

test.describe.configure({ mode: 'serial' })

let page
let email
let oldToken
test.beforeAll(async ({ browser }) => {
  page = await sharedPage(browser)
  email = alias('del')
})
test.afterAll(async () => page?.context().close())

test('[edge] a sign-in older than 5 minutes must be given again before deleting', async () => {
  test.setTimeout(9 * 60 * 1000)
  const started = new Date(Date.now() - 5000)
  await signUp(page, email)
  await skipOnboarding(page)
  await verifyEmail(page, email, started)
  // Something to delete: one deck.
  const client = await api()
  const made = await client.post('/decks', { headers: bearer(await pageToken(page)), data: { name: 'E2E deck', description: '' } })
  expect(made.status(), 'a deck is created').toBeLessThan(300)
  oldToken = (await firebaseSignIn(email)).idToken
  await page.waitForTimeout(5 * 60 * 1000 + 15000)

  // The API refuses a direct call with that old sign-in.
  const refused = await client.delete('/users/account', { headers: bearer(oldToken) })
  expect(refused.status()).toBe(401)
  expect((await refused.json()).detail.code).toBe('reauth_required')

  // The dialog asks for the password instead of deleting.
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete account' }).first().click()
  await page.locator('input[name="confirm-email"]').fill(email)
  await page.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText('Sign in again to delete')).toBeVisible()
  expect((await db('account', email)).live, 'nothing deleted yet').not.toBeNull()
})

test('[happy] after signing in again the account is deleted', async () => {
  await page.locator('input[name="current-password"]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Confirm and delete' }).click()
  await page.waitForURL((url) => url.pathname === '/', { timeout: 60000 })
  await expect.poll(async () => (await db('account', email)).deleted.length, { timeout: 60000 }).toBe(1)
})

test('[happy] one notice email goes to the address', async () => {
  const notices = await waitForEmails(email, 'account.deleted')
  expect(notices).toHaveLength(1)
  expect(notices[0].text).toContain('support@nowry.app')
  expect(notices[0].text).toContain('Your Nowry account was deleted')
})

test('[happy] the records are marked and the address released', async () => {
  const { live, deleted } = await db('account', email)
  expect(live).toBeNull()
  expect(deleted[0].email_released).toBe(true)
  expect(deleted[0].marked.decks).toBeGreaterThanOrEqual(1)
  expect(['sent', 'over_budget', 'not_allowed']).toContain(deleted[0].notice)
})

let reSignUp
test('[happy] the same address signs up again and starts empty', async () => {
  reSignUp = new Date(Date.now() - 5000)
  await signUp(page, email)
  await skipOnboarding(page)
  const client = await api()
  const decks = await client.get('/decks', { headers: bearer(await pageToken(page)) })
  expect(decks.status()).toBe(200)
  const body = await decks.json()
  expect(Array.isArray(body) ? body.length : (body.items || body.decks || []).length).toBe(0)
  expect((await db('account', email)).live.decks).toBe(0)
})

test('[edge] the re-registration notice waits for the address to be verified', async () => {
  await page.goto('/')
  await expect(page.getByText('Welcome', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  await expect(page.getByTestId('previous-account-notice')).toHaveCount(0)
  const client = await api()
  const me = await (await client.get('/users/me', { headers: bearer(await pageToken(page)) })).json()
  expect(me.previous_account).toBeNull()

  await verifyEmail(page, email, reSignUp)
  await page.goto('/')
  const notice = page.getByTestId('previous-account-notice')
  await expect(notice).toBeVisible({ timeout: 30000 })
  await expect(notice).toContainText('This address had a Nowry account')
  await expect(notice).toContainText(String(new Date().getUTCFullYear()))
})

test('[edge] after 30 days the notice is gone and the old record is erased', async () => {
  test.setTimeout(6 * 60 * 1000)
  const moved = await db('backdate-deletion', email, 31)
  expect(moved.records).toBe(1)
  await page.goto('/')
  await expect(page.getByText('Welcome', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  await expect(page.getByTestId('previous-account-notice')).toHaveCount(0)
  // MongoDB's expiry runs about once a minute.
  await expect.poll(async () => (await db('account', email)).deleted.length, { timeout: 5 * 60 * 1000, intervals: [20000] }).toBe(0)
  expect((await emails(email, 'account.deleted')).length).toBe(1)
})
