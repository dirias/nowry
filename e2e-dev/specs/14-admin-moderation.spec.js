/**
 * Moderation (prd-admin.md FR-002, FR-004..006, FR-011 "Moderation", dev test
 * steps · batch 3; ADR-087). A reported public deck is unpublished from the
 * Moderation tab: its public copy goes with it, a private copy stays, each
 * verified owner gets one `content.removed` email, the removal is logged, and
 * publishing it again is refused.
 */
const { test, expect } = require('../lib/fixtures')
const { alias } = require('../lib/run')
const { signIn } = require('../lib/ui')
const { api, bearer, makeAccount, firebaseSignIn } = require('../lib/api')
const { waitForEmails, emails } = require('../lib/outbox')
const { db } = require('../lib/db')

const existing = (error) => {
  if (!String(error.message).includes('EMAIL_EXISTS')) throw error
}
const tokenOf = async (email) => (await firebaseSignIn(email)).idToken

async function account(name) {
  const email = alias(name)
  await makeAccount(email).catch(existing)
  return { email, token: await tokenOf(email) }
}

async function publishDeck(owner, name) {
  const client = await api()
  const created = await client.post('/decks', { headers: bearer(owner.token), data: { name } })
  expect(created.status(), 'deck created').toBe(201)
  const deck = await created.json()
  const id = deck._id ?? deck.id
  const published = await client.post(`/public/decks/${id}/publish`, {
    headers: bearer(owner.token),
    data: { language: 'en', description: 'A suite deck', is_original_content: true }
  })
  expect(published.status(), `publish ${name}`).toBe(200)
  return id
}

async function fork(who, deckId) {
  const client = await api()
  const response = await client.post(`/public/decks/${deckId}/fork`, { headers: bearer(who.token) })
  expect([200, 201]).toContain(response.status())
  const body = await response.json()
  return body.forked_deck._id ?? body.forked_deck.id
}

let admin

test.beforeAll(async () => {
  admin = await account('mod-admin')
  await db('make-admin', admin.email)
})

test('[happy] unpublish from the Moderation tab: the public copy goes, the private copy stays, owners are told, republishing is refused', async ({
  page
}) => {
  const owner = await account('mod-owner')
  const copier = await account('mod-copier')
  const keeper = await account('mod-keeper')
  const reporter = await account('mod-reporter')
  const title = `Suite deck ${Date.now().toString(36)}`
  const original = await publishDeck(owner, title)
  const publicCopy = await fork(copier, original)
  const client = await api()
  expect(
    (await client.post(`/public/decks/${publicCopy}/publish`, { headers: bearer(copier.token), data: { language: 'en' } })).status()
  ).toBe(200)
  const privateCopy = await fork(keeper, original)
  const reported = await client.post(`/moderation/report/deck/${original}`, {
    headers: bearer(reporter.token),
    data: { reason: 'copyright', description: 'Copied word for word from my paid deck.' }
  })
  expect(reported.status(), 'reported').toBe(200)
  await db('mark-verified', owner.email)
  await db('mark-verified', copier.email)

  await signIn(page, admin.email)
  await page.goto('/admin/moderation')
  await page.getByText(title).first().click({ timeout: 30000 })
  await expect(page.getByText('Copied word for word from my paid deck.')).toBeVisible()
  const started = new Date(Date.now() - 5000)
  await page.getByRole('button', { name: /^Unpublish…/ }).click()
  await expect(page.getByText(`Unpublish “${title}”?`)).toBeVisible()
  await page.getByRole('button', { name: 'Unpublish 2 items' }).click()
  await expect(page.getByText(/Unpublished 2 items/)).toBeVisible({ timeout: 30000 })

  expect((await client.get(`/public/decks/${original}`)).status(), 'the original is no longer public').toBe(404)
  expect((await client.get(`/public/decks/${publicCopy}`)).status(), 'the public copy went with it').toBe(404)
  const kept = await client.get(`/decks/${privateCopy}`, { headers: bearer(keeper.token) })
  expect(kept.status(), 'the private copy stays').toBe(200)

  const [toOwner] = await waitForEmails(owner.email, 'content.removed', { since: started })
  expect(toOwner.text).toContain(title)
  const [toCopier] = await waitForEmails(copier.email, 'content.removed', { since: started })
  expect(toCopier.text).toContain('copy')
  expect(await emails(keeper.email, 'content.removed')).toHaveLength(0)

  const again = await client.post(`/public/decks/${original}/publish`, { headers: bearer(owner.token), data: { language: 'en' } })
  expect(again.status()).toBe(409)
  expect(JSON.stringify(await again.json())).toContain('removed_by_moderation')
})

test('[edge] Keep public closes the reports and the item stays public; a malformed id is 400, not 500', async ({ page }) => {
  const owner = await account('mod-owner-k')
  const reporter = await account('mod-reporter-k')
  const title = `Kept deck ${Date.now().toString(36)}`
  const deckId = await publishDeck(owner, title)
  const client = await api()
  await client.post(`/moderation/report/deck/${deckId}`, {
    headers: bearer(reporter.token),
    data: { reason: 'spam', description: 'Looks like spam.' }
  })

  await signIn(page, admin.email)
  await page.goto('/admin/moderation')
  await page.getByText(title).first().click({ timeout: 30000 })
  await page.getByRole('button', { name: 'Keep public' }).click()
  await expect(page.getByText(/Kept public/)).toBeVisible({ timeout: 30000 })
  expect((await client.get(`/public/decks/${deckId}`)).status()).toBe(200)

  const headers = bearer(await tokenOf(admin.email))
  expect((await client.get('/moderation/admin/reports', { headers })).status()).toBe(200)
  expect((await client.post('/moderation/admin/queue/deck/not-an-id/keep', { headers })).status()).toBe(400)
})
