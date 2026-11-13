/**
 * Sign-up with a password and the dev-test code: the email is verified from the
 * outbox, onboarding saves an interest and Home's news follows it without a
 * refresh, and the companion is drawn and still (FR-036, FR-037).
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signUp, verifyEmail } = require('../lib/ui')
const { db } = require('../lib/db')

test('[happy] sign-up with a password and the dev-test code, then email verification', async ({ page }) => {
  const email = alias('signup')
  const started = new Date(Date.now() - 5000)
  await signUp(page, email)
  await page.waitForURL((url) => url.pathname === '/onboarding', { timeout: 60000 })
  const before = (await db('account', email)).live
  expect(before.beta_cohort).toBe('dev')
  expect(before.email_verified).toBe(false)
  await verifyEmail(page, email, started)
  // The account record follows Firebase on the person's next request.
  await page.goto('/')
  await expect.poll(async () => (await db('account', email)).live.email_verified, { timeout: 30000 }).toBe(true)
})

test('[happy] onboarding with an interest: news follows without a refresh; companion visible and still', async ({ page }) => {
  const email = alias('onboard')
  const news = []
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/^\/news\/[a-z]{2}\/([a-z_]+)$/)
    if (match) news.push(match[1])
  })
  await signUp(page, email)
  await page.waitForURL((url) => url.pathname === '/onboarding', { timeout: 60000 })
  await page.getByRole('button', { name: 'Get Started' }).click()
  await page.getByRole('button', { name: 'Science', exact: true }).click()
  await page.getByRole('radio', { name: 'General Knowledge' }).check({ force: true })
  await page.getByRole('button', { name: 'Choose Your First Deck' }).click()
  await page.getByRole('button', { name: 'Finish for Now' }).click()
  await page.waitForURL((url) => url.pathname === '/', { timeout: 60000 })
  await expect.poll(() => news.includes('science'), { timeout: 30000, message: `news asked for: ${news.join(', ')}` }).toBe(true)

  const orb = page.getByRole('button', { name: 'Open Study Buddy' })
  await expect(orb).toBeVisible({ timeout: 30000 })
  const first = await orb.boundingBox()
  await page.waitForTimeout(6000)
  const second = await orb.boundingBox()
  expect(Math.abs(first.x - second.x) + Math.abs(first.y - second.y), 'the companion stays in its spot').toBeLessThan(4)
  const live = (await db('account', email)).live
  expect(live.pet_active).toBe(true)
  expect(live.roaming === null || live.roaming === undefined || live.roaming === false).toBe(true)
})
