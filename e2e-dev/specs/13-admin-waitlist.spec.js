/**
 * The waitlist in the admin area (prd-admin.md FR-012 "The waitlist", dev test
 * steps · batch 2; WAIT-002, WAIT-006, WAIT-007). Rows are listed by state and
 * language; ticked rows are invited as one batch in each row's language and
 * become invited; an invited address that signs up makes its row joined.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, asSuite, makeAccount, firebaseSignUp, firebaseSignIn, applyOobCode } = require('../lib/api')
const { waitForEmails, linkIn } = require('../lib/outbox')
const { db } = require('../lib/db')

const KIND = 'beta.invitation'
let adminEmail

test.beforeAll(async () => {
  adminEmail = alias('wl-admin')
  await makeAccount(adminEmail).catch((error) => {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error
  })
  await db('make-admin', adminEmail)
})

const join = async (email, locale) => {
  const client = await api()
  const response = await client.post('/beta/waitlist', { data: { email, locale, source: 'e2e' } })
  expect(response.status(), `waitlist ${email}`).toBe(201)
}

const rowOf = async (email, state) => {
  const client = await api()
  const headers = bearer((await firebaseSignIn(adminEmail)).idToken)
  const response = await client.get('/beta/admin/waitlist', { headers, params: { state, limit: 200 } })
  expect(response.status()).toBe(200)
  return (await response.json()).rows.find((row) => row.email === email)
}

test('[happy] tick two Spanish rows, invite them in Spanish; they become invited; one signs up and becomes joined', async ({ page }) => {
  const first = alias('wl-es-a')
  const second = alias('wl-es-b')
  await join(first, 'es-MX')
  await join(second, 'es')
  expect((await rowOf(first, 'waiting'))?.locale).toBe('es')

  await signIn(page, adminEmail)
  await page.goto('/admin/waitlist')
  await expect(page.getByRole('link', { name: /Waitlist/ })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Spanish', exact: true }).click()
  const started = new Date(Date.now() - 5000)
  await page.getByRole('checkbox', { name: `Select ${first}` }).check()
  await page.getByRole('checkbox', { name: `Select ${second}` }).check()
  await page.getByRole('button', { name: /^Invite 2 to / }).click()
  await expect(page.getByText('Sent 2 invitations.')).toBeVisible({ timeout: 30000 })

  for (const email of [first, second]) {
    const [message] = await waitForEmails(email, KIND, { since: started })
    expect(message.subject).toBe('Tu plaza en la beta de Nowry')
  }
  await expect.poll(async () => (await rowOf(first, 'invited'))?.status, { timeout: 30000 }).toBe('invited')
  expect((await db('admin-log', first)).actions).toEqual(['invite.send'])

  // The first address signs up with its link: its row becomes joined (WAIT-007).
  const [letter] = await waitForEmails(first, KIND, { since: started })
  const token = new URL(linkIn(letter, '/register?invite=')).searchParams.get('invite')
  const auth = await firebaseSignUp(first)
  const client = await api()
  await client.post('/auth/email/verification', { headers: asSuite(bearer(auth.idToken)), data: { language: 'es' } })
  const [verify] = await waitForEmails(first, 'account.verify')
  await applyOobCode(new URL(linkIn(verify, '/auth/action')).searchParams.get('oobCode'))
  const fresh = (await firebaseSignIn(first)).idToken
  expect((await client.get('/users/me', { headers: bearer(fresh, { 'X-Invite-Code': token }) })).status()).toBe(200)
  await expect.poll(async () => (await rowOf(first, 'joined'))?.status, { timeout: 30000 }).toBe('joined')
  expect((await rowOf(second, 'invited'))?.status).toBe('invited')
})

test('[edge] only waiting rows can be ticked; the filters ask the API by state', async ({ page }) => {
  const waiting = alias('wl-wait')
  await join(waiting, 'en')
  await signIn(page, adminEmail)
  await page.goto('/admin/waitlist')
  await expect(page.getByRole('checkbox', { name: `Select ${waiting}` })).toBeEnabled({ timeout: 30000 })
  await page.getByRole('button', { name: /^Invited/ }).click()
  await expect(page.getByText(waiting)).toHaveCount(0)
  for (const box of await page.getByRole('checkbox', { name: /^Select .+@/ }).all()) {
    await expect(box).toBeDisabled()
  }
})
