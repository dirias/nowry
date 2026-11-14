/** What a person does in the browser, written once. */
const { expect } = require('@playwright/test')
const { CODE, PASSWORD } = require('./env')
const { waitForEmails, linkIn } = require('./outbox')

async function signUp(page, email, { code = CODE, invited = false } = {}) {
  if (!invited) await page.goto('/register')
  if (!invited) {
    // The code field appears once the page has asked the API whether a code is needed.
    const codeField = page.locator('input[name="inviteCode"]')
    await codeField.waitFor({ state: 'visible', timeout: 20000 })
    await codeField.fill(code)
  }
  await page.locator('input[name="username"]').fill(`e2e_${Date.now().toString(36)}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await page.locator('input[name="passwordConfirmation"]').fill(PASSWORD)
  await page.locator('input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: 'Create account' }).click()
}

async function skipOnboarding(page) {
  await page.waitForURL((url) => url.pathname === '/onboarding', { timeout: 60000 })
  await page.getByRole('button', { name: 'Not Right Now' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'))
}

/** Open the newest verification link sent to `email` (after `since`) and see it confirmed. */
async function verifyEmail(page, email, since) {
  const [message] = await waitForEmails(email, 'account.verify', { since })
  await page.goto(linkIn(message, '/auth/action'))
  await expect(page.getByText('Your email is confirmed')).toBeVisible({ timeout: 30000 })
}

async function signIn(page, email, password = PASSWORD) {
  await page.goto('/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
  // The sign-in page lands by reloading the app; let that reload finish before the next navigation.
  await page.waitForLoadState('load')
  await page.waitForLoadState('networkidle').catch(() => {})
}

/** The token the page itself holds (not a secret of the suite), for calls from the test process. */
const pageToken = (page) => page.evaluate(() => window.localStorage.getItem('firebase_token'))

module.exports = { signUp, skipOnboarding, verifyEmail, signIn, pageToken }
