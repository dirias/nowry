/**
 * Invitations through the admin screen (prd-admin.md FR-012, dev test steps ·
 * batch 1, steps 2–3; ADR-077 amendment). Paste, check, send: every line is
 * sorted before anything leaves; the email carries the link and the Android
 * line; Resend replaces the link and is held to once an hour; Revoke and Invite
 * again; a batch over the day's share is refused whole; every write is logged.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignIn } = require('../lib/api')
const { waitForEmails, linkIn } = require('../lib/outbox')
const { db } = require('../lib/db')

const KIND = 'beta.invitation'

const usable = async (token) => {
  const client = await api()
  const response = await client.post('/beta/invites/check', { data: { code: token } })
  return (await response.json()).valid
}
const tokenOf = (message) => new URL(linkIn(message, '/register?invite=')).searchParams.get('invite')

let adminEmail

test.beforeAll(async () => {
  adminEmail = alias('inv-admin')
  await makeAccount(adminEmail).catch((error) => {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error
  })
  await db('make-admin', adminEmail)
})

/** The admin's Invitations tab with one invitation's row actions reachable by address. */
async function openTab(page) {
  await signIn(page, adminEmail)
  await page.goto('/admin/invitations')
  await expect(page.getByText('Invite people')).toBeVisible({ timeout: 30000 })
  await page.getByLabel('Cohort').fill('e2e')
}

test('[happy] paste, check, send: two invited, one left as it was, one not an address', async ({ page }) => {
  const first = alias('inv-ui-a')
  const second = alias('inv-ui-b')
  const already = alias('inv-ui-open')
  const client = await api()
  const token = (await firebaseSignIn(adminEmail)).idToken
  expect((await client.post('/beta/admin/invites', { headers: bearer(token), data: { email: already, cohort: 'e2e' } })).status()).toBe(201)

  await openTab(page)
  const started = new Date(Date.now() - 5000)
  await page.getByLabel('Addresses, one per line').fill([first, second, 'not-an-address', already].join('\n'))
  const check = page.getByTestId('invite-check')
  await expect(check).toContainText('will be invited', { timeout: 30000 })
  await expect(check).toContainText('already has an open invitation')
  await expect(check).toContainText('is not a complete address')
  await page.getByRole('button', { name: 'Send 2 invitations' }).click()
  await expect(page.getByText('Sent 2 invitations.')).toBeVisible({ timeout: 30000 })

  for (const email of [first, second]) {
    const [message] = await waitForEmails(email, KIND, { since: started })
    expect(message.subject).toBe('Your place in the Nowry beta')
    expect(message.text).toContain('Testing the Android app?')
    expect(await usable(tokenOf(message))).toBe(true)
  }
  expect((await db('admin-log', first)).actions).toEqual(['invite.send'])
  // The address that already had one keeps its single open invitation and gets no email.
  expect(await waitForEmails(already, KIND, { timeoutMs: 3000 }).catch(() => [])).toEqual([])
})

test('[happy] Resend: held within the hour, then a new link replaces the old one', async ({ page }) => {
  const email = alias('inv-ui-resend')
  await openTab(page)
  const started = new Date(Date.now() - 5000)
  await page.getByLabel('Addresses, one per line').fill(email)
  await page.getByRole('button', { name: 'Send 1 invitation' }).click()
  const [firstMail] = await waitForEmails(email, KIND, { since: started })
  const oldToken = tokenOf(firstMail)

  await page.getByRole('button', { name: `Send a new link to ${email}` }).click()
  await page.getByRole('button', { name: 'Send new link' }).click()
  await expect(page.getByText('less than an hour ago')).toBeVisible({ timeout: 30000 })
  expect(await usable(oldToken)).toBe(true)

  await db('backdate-invites', email, 2)
  await page.reload()
  await page.getByRole('button', { name: `Send a new link to ${email}` }).click()
  await expect(page.getByText('The new link works for 14 days.')).toBeVisible()
  await page.getByRole('button', { name: 'Send new link' }).click()
  await expect(page.getByText(`A new link went to ${email}.`)).toBeVisible({ timeout: 30000 })
  const mails = await waitForEmails(email, KIND, { count: 2, since: started })
  const newToken = tokenOf(mails[0])
  expect(newToken).not.toBe(oldToken)
  expect(await usable(oldToken)).toBe(false)
  expect(await usable(newToken)).toBe(true)
  expect((await db('admin-log', email)).actions).toEqual(['invite.send', 'invite.resend'])
})

test('[happy] Revoke asks first and closes the link; Invite again sends a working one', async ({ page }) => {
  const email = alias('inv-ui-revoke')
  await openTab(page)
  const started = new Date(Date.now() - 5000)
  await page.getByLabel('Addresses, one per line').fill(email)
  await page.getByRole('button', { name: 'Send 1 invitation' }).click()
  const [message] = await waitForEmails(email, KIND, { since: started })
  const oldToken = tokenOf(message)

  await page.getByRole('button', { name: `Revoke the invitation for ${email}` }).click()
  await expect(page.getByText(`Revoke the invitation for ${email}?`)).toBeVisible()
  await page.getByRole('button', { name: 'Revoke', exact: true }).click()
  await expect(page.getByText(`The invitation for ${email} was revoked.`)).toBeVisible({ timeout: 30000 })
  expect(await usable(oldToken)).toBe(false)

  await db('backdate-invites', email, 2)
  await page.reload()
  await page.getByRole('button', { name: `Invite ${email} again` }).click()
  await page.getByRole('button', { name: 'Invite again', exact: true }).click()
  await expect(page.getByText(`A new invitation went to ${email}.`)).toBeVisible({ timeout: 30000 })
  const mails = await waitForEmails(email, KIND, { count: 2, since: started })
  expect(await usable(tokenOf(mails[0]))).toBe(true)
  expect((await db('admin-log', email)).actions).toEqual(['invite.send', 'invite.revoke', 'invite.resend'])
})

test('[edge] a batch larger than the invitations left today is refused whole', async () => {
  const client = await api()
  const headers = bearer((await firebaseSignIn(adminEmail)).idToken)
  const cohorts = await (await client.get('/beta/admin/cohorts', { headers })).json()
  const needed = cohorts.invitations_left_today + 1
  test.skip(needed > 50, `the day's share (${cohorts.invitations_left_today}) is above one batch`)
  const addresses = Array.from({ length: needed }, (_, i) => alias(`inv-budget-${i}`))
  const response = await client.post('/beta/admin/invites/batch', {
    headers,
    data: { addresses, cohort: 'e2e', expires_in_days: 14, locale: 'en', dry_run: false }
  })
  expect(response.status()).toBe(409)
  const body = await response.json()
  expect(body.detail ?? body).toMatchObject({ code: 'over_budget', needed, left: cohorts.invitations_left_today })
  const check = await client.post('/beta/admin/invites/batch', {
    headers,
    data: { addresses: addresses.slice(0, 1), cohort: 'e2e', expires_in_days: 14, locale: 'en', dry_run: true }
  })
  expect((await check.json()).results[0].outcome).toBe('will_invite')
})
