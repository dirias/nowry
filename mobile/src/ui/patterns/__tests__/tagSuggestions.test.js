/**
 * Existing tags offered under the phone's tag line (MOB-106).
 */
const { committedTags, pendingToken, suggestTags, withPickedTag, MAX_SUGGESTIONS } = require('../tagSuggestions')

describe('the token being typed', () => {
  it('is the text after the last comma', () => {
    expect(pendingToken('japan, gra')).toBe('gra')
    expect(pendingToken('japan,')).toBe('')
    expect(pendingToken('')).toBe('')
    expect(pendingToken('solo')).toBe('solo')
  })

  it('leaves the settled tags alone', () => {
    expect(committedTags('japan, verbs, gra')).toEqual(['japan', 'verbs'])
    expect(committedTags('japan')).toEqual([])
  })
})

describe('what is offered', () => {
  const pool = ['japan', 'grammar', 'verbs', 'Kanji', 'n5']

  it('hides what the line already holds, ignoring case', () => {
    expect(suggestTags(pool, 'Japan, ')).toEqual(['grammar', 'verbs', 'Kanji', 'n5'])
  })

  it('narrows by the token being typed, ignoring case', () => {
    expect(suggestTags(pool, 'japan, KA')).toEqual(['Kanji'])
    expect(suggestTags(pool, 'gr')).toEqual(['grammar'])
  })

  it('still offers the tag equal to the token, so a tap settles it', () => {
    expect(suggestTags(pool, 'verbs')).toEqual(['verbs'])
  })

  it('offers everything with nothing typed, capped', () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${i}`)
    expect(suggestTags(many, '')).toHaveLength(MAX_SUGGESTIONS)
  })

  it('drops duplicates, blanks and non-strings from the pool', () => {
    expect(suggestTags(['a', 'A', ' ', null, 'b'], '')).toEqual(['a', 'b'])
    expect(suggestTags(undefined, '')).toEqual([])
  })
})

describe('picking one', () => {
  it('replaces the token and opens the next slot', () => {
    expect(withPickedTag('japan, gra', 'grammar')).toBe('japan, grammar, ')
  })

  it('appends when nothing is being typed', () => {
    expect(withPickedTag('japan, ', 'verbs')).toBe('japan, verbs, ')
    expect(withPickedTag('', 'verbs')).toBe('verbs, ')
  })
})
