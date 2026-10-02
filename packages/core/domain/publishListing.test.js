/**
 * The refusal a listing can meet (ADR-037), mapped once for every client.
 */
import { PUBLISH_BLOCK_CODE, hasFileOrigin, publishBlockKey, publishBlockKeyFor, publishBlockReason } from './publishListing'

const refusal = (reason) => ({ response: { status: 409, data: { detail: { code: PUBLISH_BLOCK_CODE, reason } } } })

describe('publishBlockReason', () => {
  it('reads each of the three reasons the server can give', () => {
    expect(publishBlockReason(refusal('imported_deck'))).toBe('imported_deck')
    expect(publishBlockReason(refusal('imported_book'))).toBe('imported_book')
    expect(publishBlockReason(refusal('cards_from_imported_book'))).toBe('cards_from_imported_book')
  })

  it('is null for any other error, and for no error at all', () => {
    expect(publishBlockReason(null)).toBeNull()
    expect(publishBlockReason({ response: { status: 409, data: { detail: { code: 'fork_in_progress' } } } })).toBeNull()
    expect(publishBlockReason({ response: { status: 400, data: { detail: 'Content is already public' } } })).toBeNull()
    expect(publishBlockReason({ response: { status: 422, data: { detail: [{ loc: ['body', 'tags'], msg: 'required' }] } } })).toBeNull()
  })

  it('falls back to the deck reason when the server names one it does not know', () => {
    expect(publishBlockReason(refusal('something_new'))).toBe('imported_deck')
  })
})

describe('publishBlockKey', () => {
  it('names a key under public.publishBlocked for every reason', () => {
    expect(publishBlockKey('imported_book')).toBe('public.publishBlocked.imported_book')
    expect(publishBlockKey('cards_from_imported_book')).toBe('public.publishBlocked.cards_from_imported_book')
    expect(publishBlockKey(undefined)).toBe('public.publishBlocked.imported_deck')
  })
})

describe('publishBlockKeyFor', () => {
  it('replaces the control for imported private content only', () => {
    expect(publishBlockKeyFor('deck', { source: 'imported', is_public: false })).toBe('public.publishBlocked.imported_deck')
    expect(publishBlockKeyFor('book', { source: 'imported' })).toBe('public.publishBlocked.imported_book')
    expect(publishBlockKeyFor('deck', { source: 'created' })).toBeNull()
    expect(publishBlockKeyFor('book', { source: 'written' })).toBeNull()
    expect(publishBlockKeyFor('deck', {})).toBeNull()
    expect(publishBlockKeyFor('deck', { source: 'imported', is_public: true })).toBeNull()
  })

  it('reads a file origin from the one field both models carry', () => {
    expect(hasFileOrigin({ source: 'imported' })).toBe(true)
    expect(hasFileOrigin({ source: 'written' })).toBe(false)
    expect(hasFileOrigin(undefined)).toBe(false)
  })
})
