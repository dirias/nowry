/**
 * QA-010 — the golden path a new user walks on launch day, end to end:
 * sign up → (skip onboarding) → create a deck → add cards → study them →
 * sign in again from a fresh browser and find it all still there → the plans.
 *
 * Every step goes through the real web client and the real API; sign-in is the
 * Firebase Auth emulator (see playwright.config.js). The run that first walked
 * this path found an email sign-up regression the unit suites had passed.
 */
const { test, expect } = require('@playwright/test')

const PASSWORD = 'Str0ng-enough!'
const CARDS = [
  ['Capital of France?', 'Paris'],
  ['Capital of Japan?', 'Tokyo']
]

/** The API refusing anything is a failure of this path, whatever the page shows. */
const failOnApiErrors = (page) => {
  const errors = []
  page.on('response', (response) => {
    if (response.url().includes(':8011/') && response.status() >= 400) {
      errors.push(`${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`)
    }
  })
  return errors
}

test('a new user signs up, makes a deck, studies it, and finds it there next time', async ({ page, browser }) => {
  const apiErrors = failOnApiErrors(page)
  const id = Date.now().toString(36)
  const email = `e2e-${id}@example.com`

  await test.step('sign up', async () => {
    await page.goto('/register')
    await page.locator('input[name="username"]').fill(`e2e_${id}`)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(PASSWORD)
    await page.locator('input[name="passwordConfirmation"]').fill(PASSWORD)
    await page.locator('input[type="checkbox"]').check()
    await page.locator('form button[type="submit"]').click()
    await page.waitForURL((url) => url.pathname === '/onboarding')
    await expect(page.getByText('Welcome to Nowry')).toBeVisible()
  })

  await test.step('skip onboarding', async () => {
    await page.getByRole('button', { name: 'Not Right Now' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'))
  })

  await test.step('create a deck', async () => {
    await page.goto('/study')
    await page.getByRole('button', { name: 'Create deck' }).click()
    await page.getByPlaceholder('E.g., Japanese Vocabulary').fill('E2E Capitals')
    await page.getByRole('dialog').getByRole('button', { name: 'Create deck' }).click()
    await expect(page.getByRole('dialog').getByText('Deck created')).toBeVisible()
  })

  await test.step('add two cards', async () => {
    await page.getByRole('dialog').getByRole('button', { name: 'Add cards' }).click()
    const sheet = page.getByRole('dialog')
    for (const [index, [front, back]] of CARDS.entries()) {
      await sheet.getByPlaceholder('What is the capital of France?').fill(front)
      await sheet.getByPlaceholder('Paris').fill(back)
      const last = index === CARDS.length - 1
      await sheet.getByRole('button', { name: last ? 'Save & close' : 'Save & next' }).click()
      if (!last) await expect(sheet.getByPlaceholder('What is the capital of France?')).toHaveValue('')
    }
    await expect(page.getByText('Flashcards · 2 cards')).toBeVisible()
  })

  await test.step('study both cards', async () => {
    await page.goto('/study')
    await expect(page.getByText('2 today')).toBeVisible()
    await page.getByRole('button', { name: 'Study E2E Capitals' }).click()
    for (const [front] of CARDS) {
      await expect(page.getByText(front).first()).toBeVisible()
      await page.getByText('Click to flip').first().click()
      await page.getByRole('button', { name: 'Good', exact: true }).click()
    }
    await expect(page.getByText('Session complete!')).toBeVisible()
    await expect(page.getByText('cards reviewed')).toBeVisible()
  })

  await test.step('sign in again from a fresh browser and find the deck studied', async () => {
    const fresh = await browser.newContext()
    const again = await fresh.newPage()
    const freshErrors = failOnApiErrors(again)
    await again.goto('/login')
    await again.locator('input[type="email"]').fill(email)
    await again.locator('input[type="password"]').fill(PASSWORD)
    await again.locator('form button[type="submit"]').click()
    await again.waitForURL((url) => url.pathname === '/')
    await again.goto('/study?view=library')
    await expect(again.getByText('E2E Capitals')).toBeVisible()
    await expect(again.getByText('Flashcards · 2 cards')).toBeVisible()
    await again.goto('/study')
    await expect(again.getByText(/2 done/)).toBeVisible()
    expect(freshErrors).toEqual([])
    await fresh.close()
  })

  await test.step('see the plans', async () => {
    await page.goto('/plans')
    for (const plan of ['Free', 'Plus', 'Pro']) {
      await expect(page.getByText(plan, { exact: true }).first()).toBeVisible()
    }
  })

  expect(apiErrors).toEqual([])
})
