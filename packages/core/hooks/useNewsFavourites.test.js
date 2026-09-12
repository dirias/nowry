import { favouriteRecord, unfavourited } from './useNewsFavourites'

describe('favouriteRecord', () => {
  it('keeps the whole article, because the feed will not have it tomorrow', () => {
    // An article favourited today is gone from a live feed tomorrow; keeping
    // only its url leaves a list of titles nobody can render (MOB-076).
    expect(favouriteRecord({ url: 'u', title: 't', description: 'd', urlToImage: 'i', category: 'c', extra: 'dropped' })).toEqual({
      url: 'u',
      title: 't',
      description: 'd',
      urlToImage: 'i',
      category: 'c'
    })
  })

  it('fills every field, so a partial article never stores undefined', () => {
    expect(favouriteRecord({ url: 'u' })).toEqual({ url: 'u', title: '', description: '', urlToImage: '', category: '' })
    expect(favouriteRecord(undefined).url).toBe('')
  })
})

describe('unfavourited', () => {
  const articles = [{ url: 'a' }, { url: 'b' }, { url: 'c' }]

  it('leaves an article in one list or the other, never both', () => {
    expect(unfavourited(articles, [{ url: 'b' }]).map((a) => a.url)).toEqual(['a', 'c'])
  })

  it('is the whole feed when nothing is kept', () => {
    expect(unfavourited(articles, []).map((a) => a.url)).toEqual(['a', 'b', 'c'])
    expect(unfavourited(articles, undefined)).toHaveLength(3)
  })

  it('survives an absent feed', () => {
    expect(unfavourited(undefined, [{ url: 'a' }])).toEqual([])
  })
})
