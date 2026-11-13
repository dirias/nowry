/** The waitlist (ADR-080, ADR-084): new, repeat, leave and rejoin, an existing account in other capitals. */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { api, makeAccount } = require('../lib/api')
const { emails, waitForEmails, linkIn } = require('../lib/outbox')
const { db } = require('../lib/db')

test.describe.configure({ mode: 'serial' })

const join = async (email) => {
  const client = await api()
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.post('/beta/waitlist', { data: { email, locale: 'en', source: '/e2e' } })
    if (response.status() !== 429) return response
    await new Promise((resolve) => setTimeout(resolve, 61000)) // 5 a minute per network address
  }
  throw new Error('the waitlist kept answering 429')
}

const email = () => alias('wait')

test('[happy] a new address joins from the hero and gets one confirmation', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="email"]').first().fill(email())
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click()
  await expect(page.getByText('Done. If this is your first time', { exact: false })).toBeVisible({ timeout: 30000 })
  const sent = await waitForEmails(email(), 'waitlist.confirm')
  expect(sent).toHaveLength(1)
  expect((await db('waitlist', email())).row.status).toBe('waiting')
})

test('[edge] joining again answers alike and sends nothing', async () => {
  expect((await join(email())).status()).toBe(201)
  await new Promise((resolve) => setTimeout(resolve, 6000))
  expect(await emails(email(), 'waitlist.confirm')).toHaveLength(1)
})

test('[edge] leaving from the email, then joining again, sends nothing new', async ({ page }) => {
  const [confirmation] = await emails(email(), 'waitlist.confirm')
  await page.goto(new URL(linkIn(confirmation, '/waitlist/leave/')).pathname)
  await page.getByRole('button', { name: 'Leave the list' }).click()
  await expect(page.getByText("You're off the list.")).toBeVisible({ timeout: 30000 })
  expect((await db('waitlist', email())).row.status).toBe('left')
  expect((await join(email())).status()).toBe(201)
  await expect.poll(async () => (await db('waitlist', email())).row.status, { timeout: 30000 }).toBe('waiting')
  await new Promise((resolve) => setTimeout(resolve, 6000))
  expect(await emails(email(), 'waitlist.confirm')).toHaveLength(1)
})

test('[edge] an address with an account, in other capitals, is told once and not added', async () => {
  const owner = alias('wait-owner')
  await makeAccount(owner)
  const shouted = owner.replace('rikydier', 'RikyDier').replace('gmail', 'GMAIL')
  expect((await join(shouted)).status()).toBe(201)
  await waitForEmails(owner, 'waitlist.account')
  expect((await join(shouted)).status()).toBe(201)
  await new Promise((resolve) => setTimeout(resolve, 6000))
  expect(await emails(owner, 'waitlist.account')).toHaveLength(1)
  expect((await db('waitlist', owner)).row).toBeNull()
})
