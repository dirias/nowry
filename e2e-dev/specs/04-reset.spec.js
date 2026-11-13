/** Password reset through the API's email (ADR-078): the link from the outbox, a new password, a sign-in with it. */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { api, makeAccount, firebaseSignIn } = require('../lib/api')
const { emails, waitForEmails, linkIn } = require('../lib/outbox')
const { NEW_PASSWORD } = require('../lib/env')

test('[happy] password reset from the email link', async ({ page }) => {
  const email = alias('reset')
  await makeAccount(email)
  const started = new Date(Date.now() - 5000)
  await page.goto('/resetPassword')
  await page.locator('input[type="email"]').fill(email)
  await page.getByRole('button', { name: 'Email me a link' }).click()
  await expect(page.getByText('Check your email')).toBeVisible({ timeout: 30000 })
  const [message] = await waitForEmails(email, 'account.reset', { since: started })
  // The suite's aliases stay in the dev outbox (E2E-005): the link is the only one, and it works.
  expect(message.outcome).toBe('outbox')
  await page.goto(linkIn(message, '/auth/action'))
  await expect(page.getByText('Choose a new password')).toBeVisible({ timeout: 30000 })
  const fields = page.locator('input[type="password"]')
  await fields.nth(0).fill(NEW_PASSWORD)
  await fields.nth(1).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Save password' }).click()
  // Saving signs in with the new password and opens Nowry; "Your password is changed" is only the fallback.
  await page.waitForURL((url) => url.pathname === '/', { timeout: 30000 })
  await expect(page.getByText('Welcome back', { exact: false }).first()).toBeVisible({ timeout: 30000 })
  expect((await firebaseSignIn(email, NEW_PASSWORD)).idToken).toBeTruthy()
})

test('[edge] a reset for an address with no account answers the same and sends nothing', async () => {
  const email = alias('reset-nobody')
  const client = await api()
  const response = await client.post('/auth/email/password-reset', { data: { email, language: 'en' } })
  expect(response.status()).toBe(202)
  await new Promise((resolve) => setTimeout(resolve, 8000))
  expect(await emails(email)).toHaveLength(0)
})
