/** The public pages in five languages, and the footer's links. */
const fs = require('fs')
const path = require('path')
const { test, expect } = require('../lib/fixtures')
const { WEB_ROOT } = require('../lib/secrets')

const LOCALES = ['en', 'es', 'fr', 'de', 'ja']
const words = (locale) => JSON.parse(fs.readFileSync(path.join(WEB_ROOT, 'packages/core/locales', locale, 'translation.json'), 'utf8'))

for (const locale of LOCALES) {
  test(`[happy] the delete-account page in ${locale} names the fresh sign-in and the notice email`, async ({ page }) => {
    const w = words(locale)
    await page.addInitScript((lng) => window.localStorage.setItem('i18nextLng', lng), locale)
    await page.goto('/delete-account')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(w.legal.deleteAccount.title)
    await expect(page.getByText(w.legal.deleteAccount.now[1])).toBeVisible()
    await expect(page.getByText(w.legal.deleteAccount.web[2].split('{{')[0].trim().slice(0, 12), { exact: false }).first()).toBeVisible()
  })

  test(`[happy] the privacy policy in ${locale}`, async ({ page }) => {
    const w = words(locale)
    await page.addInitScript((lng) => window.localStorage.setItem('i18nextLng', lng), locale)
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(w.legal.privacy.title)
  })
}

test('[happy] the footer links open their pages', async ({ page }) => {
  const w = words('en').footer.links
  for (const [name, pathname] of [
    [w.privacy, '/privacy'],
    [w.terms, '/terms'],
    [w.deleteAccount, '/delete-account'],
    [w.copyright, '/copyright']
  ]) {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click()
    await page.waitForURL((url) => url.pathname === pathname)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
})
