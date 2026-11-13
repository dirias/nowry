/**
 * Personal invitations (ADR-077): the happy path in the browser; the refusals
 * through the API from the test process.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signUp, verifyEmail } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignUp, firebaseSignIn, applyOobCode } = require('../lib/api')
const { waitForEmails, linkIn } = require('../lib/outbox')
const { db } = require('../lib/db')

let adminToken
const invite = async (email) => {
  const client = await api()
  const response = await client.post('/beta/admin/invites', { headers: bearer(adminToken), data: { email, cohort: 'e2e' } })
  expect(response.status(), `invite ${email}`).toBe(201)
  const body = await response.json()
  return { id: body.id, link: body.link, token: new URL(body.link).searchParams.get('invite') }
}
const usable = async (token) => {
  const client = await api()
  const response = await client.post('/beta/invites/check', { data: { code: token } })
  return (await response.json()).valid
}

test.beforeAll(async () => {
  const admin = alias('admin')
  // A failed test restarts its worker and this runs again: the account may already exist.
  await makeAccount(admin).catch((error) => {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error
  })
  await db('make-admin', admin)
  adminToken = (await firebaseSignIn(admin)).idToken
})

test('[happy] sign-up with a personal invitation, confirmed by email', async ({ page }) => {
  const email = alias('inv-ok')
  const { link } = await invite(email)
  const started = new Date(Date.now() - 5000)
  await page.goto(new URL(link).pathname + new URL(link).search)
  await signUp(page, email, { invited: true })
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 30000 })
  expect((await db('account', email)).live, 'no account before the email is confirmed').toBeNull()
  await verifyEmail(page, email, started)
  await page.getByText('Finish signing up', { exact: true }).click()
  // The held sign-up finishes on its own screen (INVITE-005): one more press after confirming.
  test.info().annotations.push({
    type: 'observation',
    description:
      'Opened in the same tab, "Finish signing up" returns to "Confirm your email", and the account is made only after "I\'ve confirmed": one press more than needed.'
  })
  await page.getByRole('button', { name: "I've confirmed" }).click()
  await expect.poll(async () => (await db('account', email)).live?.beta_cohort, { timeout: 60000 }).toBe('e2e')
})

test('[edge] an invitation used by its owner no longer works', async () => {
  const email = alias('inv-used')
  const { token } = await invite(email)
  const auth = await firebaseSignUp(email)
  const client = await api()
  await client.post('/auth/email/verification', { headers: bearer(auth.idToken), data: { language: 'en' } })
  const [message] = await waitForEmails(email, 'account.verify')
  await applyOobCode(new URL(linkIn(message, '/auth/action')).searchParams.get('oobCode'))
  const fresh = (await firebaseSignIn(email)).idToken
  const me = await client.get('/users/me', { headers: bearer(fresh, { 'X-Invite-Code': token }) })
  expect(me.status()).toBe(200)
  expect(await usable(token)).toBe(false)
})

test('[edge] an invitation for another address is refused after that address is confirmed', async () => {
  const { token } = await invite(alias('inv-owner'))
  const other = alias('inv-other')
  const auth = await firebaseSignUp(other)
  const client = await api()
  await client.post('/auth/email/verification', { headers: bearer(auth.idToken), data: { language: 'en' } })
  const [message] = await waitForEmails(other, 'account.verify')
  await applyOobCode(new URL(linkIn(message, '/auth/action')).searchParams.get('oobCode'))
  const fresh = (await firebaseSignIn(other)).idToken
  const me = await client.get('/users/me', { headers: bearer(fresh, { 'X-Invite-Code': token }) })
  expect(me.status()).toBe(403)
  expect(JSON.stringify(await me.json())).toContain('beta_invite_required')
  expect((await db('account', other)).live).toBeNull()
})

test('[edge] a revoked invitation no longer works', async () => {
  const { id, token } = await invite(alias('inv-revoked'))
  const client = await api()
  expect((await client.post(`/beta/admin/invites/${id}/revoke`, { headers: bearer(adminToken) })).status()).toBe(200)
  expect(await usable(token)).toBe(false)
})

test('[edge] an expired invitation no longer works', async () => {
  const email = alias('inv-expired')
  const { token } = await invite(email)
  expect(await usable(token)).toBe(true)
  await db('expire-invites', email)
  expect(await usable(token)).toBe(false)
})

test('[edge] a replaced invitation stops working; the new one works', async () => {
  const email = alias('inv-replaced')
  const first = await invite(email)
  const second = await invite(email)
  expect(await usable(first.token)).toBe(false)
  expect(await usable(second.token)).toBe(true)
})
