import { dailyReviewParams } from '../dailyReviewParams'

const params = (qs) => dailyReviewParams(new URLSearchParams(qs))

describe('dailyReviewParams (STUDY-002)', () => {
  it('reads Quick 10 as a positive integer cap and ignores junk', () => {
    expect(params('limit=10')).toEqual({ limit: 10 })
    expect(params('limit=0')).toEqual({})
    expect(params('limit=ten')).toEqual({})
  })

  it('reads tags the way the session filter does — comma-joined or repeated — and dedupes them', () => {
    expect(params('tags=verbs,grammar&tags=verbs')).toEqual({ tags: ['verbs', 'grammar'] })
    expect(params('tags=')).toEqual({})
  })

  it('forwards the struggling group and never the mark (ADR-014)', () => {
    expect(params('group=struggling')).toEqual({ group: 'struggling' })
    expect(params('group=marked')).toEqual({})
    expect(params('mode=browse')).toEqual({})
  })
})
