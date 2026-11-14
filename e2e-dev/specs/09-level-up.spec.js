/**
 * The level-up reveal (EVO-020, ADR-075): an account one review short of a new
 * form studies one card and sees the companion evolve, after the session, with
 * the real level and the new form's name.
 *
 * Stage 2 (Sprite) is reached at level 3, which is 100 XP; a review earns 2.
 * The account is put at 99 XP with the development helper, so the one review is
 * the one that crosses. The portrait reveal stays a manual check: it would
 * spend a paid generation.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount } = require('../lib/api')
const { db } = require('../lib/db')

const JUST_UNDER_SPRITE = 99

test('[happy] one review over a stage threshold shows the evolution, with the real level', async ({ page }) => {
  test.setTimeout(240000)
  const email = alias('levelup')
  const { idToken } = await makeAccount(email)
  const client = await api()

  const deck = await client.post('/decks', { headers: bearer(idToken), data: { name: 'Level-up' } })
  expect(deck.status(), 'the deck is made').toBe(201)
  const deckId = (await deck.json())._id
  const card = await client.post('/study-cards', {
    headers: bearer(idToken),
    data: { deck_id: deckId, title: 'What is two plus two?', content: 'Four' }
  })
  expect(card.ok(), 'the card is made').toBe(true)

  expect((await db('set-xp', email, JUST_UNDER_SPRITE)).changed).toBe(1)

  await signIn(page, email)
  // A new account's first page may still be redirecting when we ask for the deck; ask again once it settles.
  await page.goto(`/study/${deckId}`).catch(async () => {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.goto(`/study/${deckId}`)
  })
  // The card turns over with a click; then the four grades.
  await page.getByText('What is two plus two?').click({ timeout: 60000 })
  await page.getByRole('button', { name: /^Good\b/ }).click({ timeout: 30000 })

  // Banked during the session, shown once the summary is up.
  const reveal = page.locator('[data-evolution-phase]')
  await expect(reveal, 'the evolution opens after the session').toBeVisible({ timeout: 60000 })
  await expect(reveal).toHaveAttribute('data-evolution-kind', 'stage')
  await expect(reveal, 'the sequence plays to its end').toHaveAttribute('data-evolution-phase', 'done', { timeout: 15000 })
  await expect(reveal.getByRole('heading', { level: 2 })).toHaveText('Sprite')
  await expect(reveal.getByText('Wisp became Sprite')).toBeVisible()
  await expect(reveal.getByText('You reached level 3')).toBeVisible()
  await reveal.getByRole('button', { name: 'Meet Sprite' }).click()
  await expect(reveal).toBeHidden()
})
