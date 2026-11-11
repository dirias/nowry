/**
 * BRAND-016 — the public site on a phone, where most visitors first see it.
 *
 * Every public page, at four phone widths, in both colour schemes, is held to
 * the three rules of `layoutRules.js`: no sideways scroll, nothing crossing
 * the side of its box, one left edge. The widths are the ones phones have:
 * 320 (the narrowest still in use), 360 (the most common Android width), 390
 * and 412.
 *
 * It exists because an alignment fix was once reported done without being
 * measured, and was not done. A page that fails here says which element and
 * by how many pixels.
 */
const { test, expect } = require('@playwright/test')
const { measureLayout } = require('./layoutRules')

const PAGES = ['/', '/pricing', '/contact', '/browse', '/login', '/register', '/resetPassword', '/privacy', '/terms', '/copyright']
const WIDTHS = [320, 360, 390, 412]

for (const width of WIDTHS) {
  test.describe(`public pages at ${width}px`, () => {
    test.use({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true })

    for (const route of PAGES) {
      test(`${route} keeps one edge, holds its boxes and does not scroll sideways`, async ({ page }) => {
        for (const colorScheme of ['light', 'dark']) {
          await page.emulateMedia({ colorScheme })
          await page.goto(route)
          await page.waitForLoadState('networkidle').catch(() => {})
          // The header, not a heading: the library page has no heading when it is empty.
          await expect(page.locator('header').first()).toBeVisible()
          await page.waitForTimeout(400)
          const { violations } = await page.evaluate(measureLayout)
          expect(violations, `${route} at ${width}px, ${colorScheme}`).toEqual([])
        }
      })
    }
  })
}

test('"Early access" in the menu lands on the section, and /pricing is a page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('link', { name: 'Early access' }).first().click()
  await expect(page).toHaveURL(/\/#pricing$/)
  const section = page.locator('section#pricing')
  await expect(section).toBeInViewport()
  await expect(section.getByRole('link', { name: 'Claim your spot' })).toHaveAttribute('href', '/register')

  await page.goto('/pricing')
  await expect(page.getByRole('heading', { level: 1, name: 'Early access' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Claim your spot' })).toHaveAttribute('href', '/register')
})
