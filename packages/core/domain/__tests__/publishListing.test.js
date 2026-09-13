import {
  CONTENT_LANGUAGES,
  DIFFICULTY_LEVELS,
  LICENSES,
  PUBLISH_CATEGORIES,
  emptyListing,
  isPublished,
  listingErrors,
  listingPayload
} from '../publishListing'

describe('publishListing', () => {
  it('offers the options the web modal offered', () => {
    expect(PUBLISH_CATEGORIES).toHaveLength(10)
    expect(DIFFICULTY_LEVELS).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(LICENSES).toEqual(['all_rights', 'cc_by', 'cc_by_sa', 'cc0'])
    expect(CONTENT_LANGUAGES.map((l) => l.code)).toContain('ja')
  })

  it('starts a listing in the app language when it is on offer', () => {
    expect(emptyListing('es').language).toBe('es')
    expect(emptyListing('pt-BR').language).toBe('pt')
    expect(emptyListing('ko').language).toBe('en')
    expect(emptyListing(undefined)).toEqual({
      category: '',
      tags: [],
      language: 'en',
      difficulty: '',
      license: 'all_rights',
      original: true
    })
  })

  it('requires a category and one real tag', () => {
    expect(listingErrors(emptyListing())).toEqual({
      category: 'public.publishModal.categoryRequired',
      tags: 'public.publishModal.tagsRequired'
    })
    expect(listingErrors({ ...emptyListing(), category: 'art', tags: ['  '] })).toEqual({ tags: 'public.publishModal.tagsRequired' })
    expect(listingErrors({ ...emptyListing(), category: 'art', tags: ['colour'] })).toEqual({})
  })

  it('sends no difficulty rather than an empty one, which the API refuses', () => {
    const body = listingPayload({ ...emptyListing(), category: 'art', tags: ['colour'] })
    expect(body.difficulty_level).toBeNull()
    expect(listingPayload({ ...emptyListing(), difficulty: 'advanced' }).difficulty_level).toBe('advanced')
  })

  it('trims and de-duplicates tags and keeps the licence and authorship', () => {
    expect(listingPayload({ ...emptyListing(), category: 'math', tags: [' a', 'a', 'b', ''], license: 'cc0', original: false })).toEqual({
      category: 'math',
      tags: ['a', 'b'],
      language: 'en',
      difficulty_level: null,
      license_type: 'cc0',
      is_original_content: false
    })
  })

  it('reads whether content is public', () => {
    expect(isPublished({ is_public: true })).toBe(true)
    expect(isPublished({})).toBe(false)
    expect(isPublished(null)).toBe(false)
  })
})
