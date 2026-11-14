/**
 * Passwords (ADR-092, FR-044..046): change with the right and a wrong current
 * password, one notice email, other sessions signed out, and the hourly lock.
 * Setting a password needs a Google sign-in, which stays manual.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignIn } = require('../lib/api')
const { emails, waitForEmails } = require('../lib/outbox')
const { PASSWORD, NEW_PASSWORD } = require('../lib/env')

const openChange = async (page) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Change password' }).click()
}
const fill = async (page, current, next) => {
  const section = page.getByTestId('password-section')
  await section.locator('input[name="current-password"]').fill(current)
  await section.locator('input[name="new-password"]').fill(next)
  await section.locator('input[name="confirm-password"]').fill(next)
  await section.getByRole('button', { name: 'Update password' }).click()
}

test('[edge] a wrong current password is refused plainly and changes nothing', async ({ page }) => {
  const email = alias('pw-wrong')
  await makeAccount(email)
  await signIn(page, email)
  await openChange(page)
  await fill(page, 'Not-the-password-1', NEW_PASSWORD)
  await expect(page.getByText("That isn't your current password.")).toBeVisible()
  expect((await firebaseSignIn(email, PASSWORD)).idToken, 'the old password still works').toBeTruthy()
  await new Promise((resolve) => setTimeout(resolve, 4000))
  expect(await emails(email, 'account.password')).toHaveLength(0)
})

test('[happy] the right current password changes it, tells once, and signs other sessions out', async ({ page }) => {
  const email = alias('pw-change')
  await makeAccount(email)
  // A sign-in in the same second as makeAccount's returns the very token makeAccount already used,
  // which an API worker has cached; the other device must be a session of its own.
  await new Promise((resolve) => setTimeout(resolve, 1100))
  const otherDevice = (await firebaseSignIn(email, PASSWORD)).idToken
  await signIn(page, email)
  await openChange(page)
  await fill(page, PASSWORD, NEW_PASSWORD)
  await expect(page.getByText('Password changed.', { exact: false })).toBeVisible({ timeout: 30000 })

  const notices = await waitForEmails(email, 'account.password')
  expect(notices).toHaveLength(1)
  expect(notices[0].text).toContain('Your Nowry password was changed')

  const client = await api()
  expect((await client.get('/users/me', { headers: bearer(otherDevice) })).status(), 'the other device is signed out').toBe(401)
  expect((await firebaseSignIn(email, NEW_PASSWORD)).idToken, 'the new password works').toBeTruthy()

  await page.goto('/settings')
  await expect(page.getByTestId('password-section'), 'this device stays signed in').toBeVisible({ timeout: 30000 })
  await new Promise((resolve) => setTimeout(resolve, 4000))
  expect(await emails(email, 'account.password')).toHaveLength(1)
})

test('[edge] five wrong current passwords lock the change for the hour', async () => {
  const email = alias('pw-lock')
  await makeAccount(email)
  const token = (await firebaseSignIn(email, PASSWORD)).idToken
  const client = await api()
  const attempt = (current) =>
    client.post('/auth/password/change', { headers: bearer(token), data: { current_password: current, new_password: NEW_PASSWORD } })
  for (let i = 0; i < 5; i++) expect((await attempt('Not-the-password-1')).status()).toBe(400)
  const locked = await attempt(PASSWORD)
  expect(locked.status()).toBe(429)
  expect((await locked.json()).detail.code).toBe('too_many_attempts')
  expect((await firebaseSignIn(email, PASSWORD)).idToken, 'nothing changed').toBeTruthy()
})
