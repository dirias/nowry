/**
 * The production check after a release (E2E-008): nowry.app as a visitor sees it.
 * No account is made, no email is sent, nothing is written.
 */
const { test, expect } = require('@playwright/test')
const { publicChecks } = require('../lib/publicChecks')

test('[prod] nowry.app and the API answer', async ({ page, request }) => {
  expect((await page.goto('/')).status()).toBe(200)
  const health = await request.get('https://nowry-api-production.up.railway.app/health')
  expect(health.status()).toBe(200)
  expect((await health.json()).status).toBe('ok')
  const outbox = await request.get('https://nowry-api-production.up.railway.app/dev/outbox')
  expect(outbox.status(), 'production has no outbox').toBe(404)
})

publicChecks(test, expect)

/**
 * The Play reviewer account (Didier, 2026-11-14): it exists in production and its mail reaches the
 * support mailbox. The API writes it "You already have a Nowry account" at most once a day (ADR-084).
 */
const ACCOUNT_ADDRESS = 'demo@nowry.app'

test('[prod] the waitlist answer for an address that already has an account', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="email"]').first().fill(ACCOUNT_ADDRESS)
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click()
  await expect(page.getByText('Done. If this is your first time', { exact: false })).toBeVisible({ timeout: 30000 })
})
