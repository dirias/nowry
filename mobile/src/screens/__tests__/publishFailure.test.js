/**
 * ADMIN-003 (FR-005, board M): the phone's publish step says why the library
 * refused, in the reader's language — now including an item an admin removed
 * from Browse, which can't be published again.
 */
const fs = require('fs')
const path = require('path')
import { publishFailureText } from '../publishFailure'

const LOCALES = ['en', 'es', 'fr', 'de', 'ja']
const bundle = (locale) =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../../packages/core/locales/${locale}/translation.json`), 'utf8'))
const tFor = (locale) => {
  const words = bundle(locale)
  return (key) => key.split('.').reduce((node, part) => node?.[part], words) ?? key
}
const refusal = (reason) => ({ response: { status: 409, data: { detail: { code: 'source_not_publishable', reason } } } })

it('says the removal sentence in all five languages', () => {
  const sentences = LOCALES.map((locale) => publishFailureText(tFor(locale), refusal('removed_by_moderation')))
  expect(sentences[0]).toBe(
    "This was removed from public Browse by Nowry and can't be published again. The email we sent explains why."
  )
  sentences.forEach((sentence) => expect(sentence).not.toMatch(/^public\./))
  expect(new Set(sentences).size).toBe(5)
})

it('still says the file-origin refusal, offline, and a failure with its detail', () => {
  const t = tFor('en')
  expect(publishFailureText(t, refusal('imported_book'))).toBe(bundle('en').public.publishBlocked.imported_book)
  expect(publishFailureText(t, { code: 'ERR_NETWORK', request: {} })).toBe(bundle('en').errors.offline)
  expect(publishFailureText(t, { response: { status: 500, data: { detail: 'Boom' } } })).toBe(`${bundle('en').books.publishFailed} · Boom`)
  expect(publishFailureText(t, { response: { status: 500, data: {} } })).toMatch(new RegExp(`^${bundle('en').books.publishFailed}`))
})
