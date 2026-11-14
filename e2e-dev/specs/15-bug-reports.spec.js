/**
 * Bug reports (prd-admin.md FR-007, FR-008, FR-011 "Bug reports", dev test
 * steps · batch 4). A tester reports a problem from the account menu; the
 * admin triages it in the Bug reports tab with a status and a note kept as a
 * history; the limits refuse an eleventh report in a day and an oversized
 * screenshot; an ordinary account cannot read the triage list.
 */
const { test, expect, withBypass } = require('../lib/fixtures')
const { SITE } = require('../lib/env')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignIn } = require('../lib/api')
const { db } = require('../lib/db')

const existing = (error) => {
  if (!String(error.message).includes('EMAIL_EXISTS')) throw error
}
const tokenOf = async (email) => (await firebaseSignIn(email)).idToken

let admin
let tester

test.beforeAll(async () => {
  admin = alias('bug-admin')
  tester = alias('bug-tester')
  await makeAccount(admin).catch(existing)
  await makeAccount(tester).catch(existing)
  await db('make-admin', admin)
})

const report = (title, extra = {}) => ({
  title,
  description: 'Tapping a card twice quickly shows the back, then the front again.',
  severity: 'high',
  category: 'study',
  platform: 'web',
  url: 'https://www.dev.nowry.app/study',
  ...extra
})

test('[happy] a tester reports from the account menu; the admin sets a status and keeps a note', async ({ page, browser }) => {
  const title = `Card flips twice ${Date.now().toString(36)}`
  await signIn(page, tester)
  await page.getByRole('button', { name: 'Open profile menu' }).click()
  await page.getByRole('menuitem', { name: 'Report a problem' }).click()
  await page.getByLabel('What went wrong?').fill(title)
  await page.getByLabel('What happened', { exact: true }).fill('Tapping a card twice quickly shows the back, then the front again.')
  await page.getByRole('button', { name: 'Send report' }).click()
  await expect(page.getByText('Thanks. Your report reached us.')).toBeVisible({ timeout: 30000 })

  const context = await browser.newContext({ baseURL: SITE })
  await withBypass(context)
  const adminPage = await context.newPage()
  await signIn(adminPage, admin)
  await adminPage.goto('/admin/bugs')
  await adminPage.getByText(title).first().click({ timeout: 30000 })
  await adminPage.getByRole('button', { name: 'In progress', exact: true }).click()
  await adminPage.getByLabel('Add a note').fill('Reproduced on a Pixel 7.')
  await adminPage.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(adminPage.getByText('Saved.')).toBeVisible({ timeout: 30000 })
  // In progress, it has left the New list; it is found under In progress with its note.
  await adminPage.getByRole('button', { name: /^In progress · / }).click()
  await adminPage.getByText(title).first().click({ timeout: 30000 })
  await expect(adminPage.getByText('Reproduced on a Pixel 7.')).toBeVisible()

  const client = await api()
  const rows = await (await client.get('/bugs/all', { headers: bearer(await tokenOf(admin)), params: { status: 'in_progress' } })).json()
  const row = rows.find((item) => item.title === title)
  expect(row.status).toBe('in_progress')
  expect(row.notes.map((note) => note.text)).toEqual(['Reproduced on a Pixel 7.'])
  expect('reporter_email' in row || 'email' in row).toBe(false)
  await context.close()
})

test('[edge] an ordinary account cannot read the triage list', async () => {
  const client = await api()
  const headers = bearer(await tokenOf(tester))
  expect((await client.get('/bugs/all', { headers })).status()).toBe(403)
  expect((await client.get('/bugs/stats', { headers })).status()).toBe(403)
})

test('[edge] a screenshot over 2 MB is refused; the eleventh report of the day is refused', async () => {
  const client = await api()
  const email = alias('bug-limits')
  await makeAccount(email).catch(existing)
  const headers = bearer(await tokenOf(email))
  // A PNG header and 2.5 MB of padding: a picture type the API accepts, over its size.
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2.5 * 1024 * 1024)])
  const big = await client.post('/bugs', {
    headers,
    data: report('Too big', { screenshots: [{ filename: 'big.png', data: `data:image/png;base64,${png.toString('base64')}` }] })
  })
  expect(big.status()).toBe(413)
  expect(JSON.stringify(await big.json())).toContain('screenshots')

  for (let i = 1; i <= 10; i += 1) {
    expect((await client.post('/bugs', { headers, data: report(`Report ${i}`) })).status(), `report ${i}`).toBe(200)
  }
  const eleventh = await client.post('/bugs', { headers, data: report('Report 11') })
  expect(eleventh.status()).toBe(429)
  expect(JSON.stringify(await eleventh.json())).toContain('daily_limit')
})
