/**
 * Smoke (E2E-002): the bypass opens dev.nowry.app, the dev-test code signs up
 * an alias, its verification email is read from the outbox and opened, and
 * the account is deleted.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signUp, skipOnboarding, verifyEmail } = require('../lib/ui')
const { db } = require('../lib/db')

test('[smoke] open the site, sign up, verify from the outbox, delete', async ({ page }) => {
  const email = alias('smoke')
  const started = new Date(Date.now() - 5000)

  await test.step('the bypass opens dev.nowry.app', async () => {
    const response = await page.goto('/')
    expect(response.status()).toBeLessThan(400)
    expect(new URL(page.url()).host).toBe('www.dev.nowry.app')
  })

  await test.step('sign up with the dev-test code', async () => {
    await signUp(page, email)
    await skipOnboarding(page)
  })

  await test.step('the verification email is read and opened', async () => {
    await verifyEmail(page, email, started)
  })

  await test.step('delete the account (a fresh sign-in, so no second step)', async () => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Delete account' }).first().click()
    await page.locator('input[name="confirm-email"]').fill(email)
    await page.getByRole('button', { name: 'Delete permanently' }).click()
    await page.waitForURL((url) => url.pathname === '/', { timeout: 60000 })
    await expect.poll(async () => (await db('account', email)).deleted.length, { timeout: 60000 }).toBe(1)
  })
})
