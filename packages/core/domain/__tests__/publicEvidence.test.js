import { SPARSE_THRESHOLD, evidenceFor } from '../publicEvidence'

const item = (metadata = {}, published = new Date().toISOString()) => ({
  public_metadata: metadata,
  published_at: published
})

describe('what a public item may claim (ADR-012)', () => {
  it('shows no metric that is zero', () => {
    const e = evidenceFor(item({ views: 0, likes: 0, forks: 0 }))
    expect([e.showViews, e.showLikes, e.showForks]).toEqual([false, false, false])
  })

  it('shows each metric that is above zero, and only that one', () => {
    const e = evidenceFor(item({ views: 4, likes: 0, forks: 0 }))
    expect([e.showViews, e.showLikes, e.showForks]).toEqual([true, false, false])
    expect(e.views).toBe(4)
  })

  it('treats "Other" as no category at all, in any case', () => {
    expect(evidenceFor(item({ category: 'Other' })).showCategory).toBe(false)
    expect(evidenceFor(item({ category: '  ' })).showCategory).toBe(false)
    expect(evidenceFor(item({ category: 'science' })).showCategory).toBe(true)
  })

  it('calls an unreacted item new only while it is recent', () => {
    expect(evidenceFor(item({}, new Date().toISOString())).isNew).toBe(true)
    const old = new Date(Date.now() - 40 * 86400000).toISOString()
    expect(evidenceFor(item({}, old)).isNew).toBe(false)
  })

  it('never calls an item with evidence new — the chip is a reason to look, not a verdict', () => {
    expect(evidenceFor(item({ likes: 1 })).isNew).toBe(false)
  })

  it('survives an item with no metadata and no dates', () => {
    const e = evidenceFor({})
    expect(e.showViews).toBe(false)
    expect(e.isNew).toBe(false)
  })

  it('keeps the sparse threshold where the web set it', () => {
    expect(SPARSE_THRESHOLD).toBe(3)
  })
})
