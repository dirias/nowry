/**
 * The dark theme (ADR-082, DARK-001..008): a member's dark is their own
 * near-black ladder, a guest's stays the brand's Ink Teal, and the theme
 * control's choice survives a reload.
 *
 * The member's ground is read from what the app itself stored for the account's
 * accent (`nowry-ground-dark`, which the first paint also reads), so the check
 * holds for any accent; the guest's is the brand's own, one value.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { makeAccount } = require('../lib/api')

const INK_TEAL = 'rgb(2, 49, 53)' // #023135, the guest's dark ground (ADR-074)

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
const ground = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const settled = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(500)
}

test.describe('in a dark system theme', () => {
  test.use({ colorScheme: 'dark' })

  test('[happy] a signed-in member stands on their own near-black ground, not Ink Teal', async ({ page }) => {
    const email = alias('dark-member')
    await makeAccount(email)
    await signIn(page, email)
    await page.goto('/study')
    await settled(page)
    const stored = await page.evaluate(() => window.localStorage.getItem('nowry-ground-dark'))
    expect(stored).toMatch(/^#[0-9a-f]{6}$/i)
    await expect.poll(() => ground(page)).toBe(hexToRgb(stored))
    expect(await ground(page)).not.toBe(INK_TEAL)
  })

  for (const path of ['/', '/login', '/register', '/pricing']) {
    test(`[happy] a guest on ${path} stays on Ink Teal`, async ({ page }) => {
      await page.goto(path)
      await settled(page)
      await expect.poll(() => ground(page)).toBe(INK_TEAL)
    })
  }
})

test.describe('the theme control', () => {
  test.use({ colorScheme: 'light' })

  test('[happy] Dark, chosen in Settings, survives a reload; Light comes back the same way', async ({ page }) => {
    const email = alias('dark-control')
    await makeAccount(email)
    await signIn(page, email)
    await page.goto('/settings')
    const control = page.getByRole('group', { name: 'Theme' })
    const light = await ground(page)

    await control.getByRole('button', { name: 'Dark' }).click()
    await expect.poll(() => ground(page)).not.toBe(light)
    const dark = await ground(page)
    await page.reload()
    await settled(page)
    await expect.poll(() => ground(page)).toBe(dark)

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light' }).click()
    await expect.poll(() => ground(page)).toBe(light)
    await page.reload()
    await settled(page)
    await expect.poll(() => ground(page)).toBe(light)
  })
})

/**
 * Measured, not looked at: at each phone width the ground is the right one and
 * nothing reaches past the screen's edge (no sideways scroll), signed in and out.
 */
const WIDTHS = [320, 360, 390, 412]
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('in dark, at phone widths', () => {
  test.use({ colorScheme: 'dark' })

  test("[edge] a member's pages keep their ground and their width at 320, 360, 390 and 412", async ({ page }) => {
    test.setTimeout(240000)
    const email = alias('dark-widths')
    await makeAccount(email)
    await signIn(page, email)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/', '/study', '/settings']) {
        await page.goto(path)
        await settled(page)
        const stored = await page.evaluate(() => window.localStorage.getItem('nowry-ground-dark'))
        await expect.poll(() => ground(page), `${path} at ${width}`).toBe(hexToRgb(stored))
        expect(await overflow(page), `${path} at ${width} scrolls sideways`).toBeLessThanOrEqual(0)
      }
    }
  })

  test("[edge] a guest's pages keep Ink Teal and their width at 320, 360, 390 and 412", async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/', '/login', '/register']) {
        await page.goto(path)
        await settled(page)
        await expect.poll(() => ground(page), `${path} at ${width}`).toBe(INK_TEAL)
        expect(await overflow(page), `${path} at ${width} scrolls sideways`).toBeLessThanOrEqual(0)
      }
    }
  })
})
