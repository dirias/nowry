import { idleTagRows, poolTagRows, sessionTagRows } from '../sessionTags'

describe('sessionTags (TAG-002)', () => {
  it('reads the pool rows as filter rows, waiting = new + due, by tag', () => {
    expect(
      poolTagRows([
        { tag: 'verbs', new: 0, due: 3 },
        { tag: 'kanji-n3', new: 10, due: 0 },
        { tag: 'done', new: 0, due: 0 }
      ])
    ).toEqual([
      { tag: 'kanji-n3', count: 10, fresh: 10, due: 0 },
      { tag: 'verbs', count: 3, fresh: 0, due: 3 }
    ])
  })

  it('drops a blank tag and tolerates missing counts and no list at all', () => {
    expect(poolTagRows([{ tag: ' ', due: 1 }, { tag: 'a', due: 2 }, { new: 1 }])).toEqual([{ tag: 'a', count: 2, fresh: 0, due: 2 }])
    expect(poolTagRows(null)).toEqual([])
    expect(poolTagRows(undefined)).toEqual([])
  })

  it('lists the pool under Due and the served cards under All', () => {
    const cards = [{ tags: ['x', 'y'] }, { tags: ['x'] }]
    expect(sessionTagRows('due', [{ tag: 'z', new: 1 }], cards)).toEqual([{ tag: 'z', count: 1, fresh: 1, due: 0 }])
    expect(sessionTagRows('all', [{ tag: 'z', new: 1 }], cards)).toEqual([
      { tag: 'x', count: 2 },
      { tag: 'y', count: 1 }
    ])
  })
})

describe('idleTagRows (MOB-118, ADR-048)', () => {
  it('names the pool tags with nothing waiting, sorted, and only those', () => {
    const pool = [
      { tag: 'verbs', new: 0, due: 3 },
      { tag: 'test', new: 0, due: 0 },
      { tag: 'grammar', new: 0, due: 0 },
      { tag: 'kanji', new: 2 }
    ]
    expect(idleTagRows(pool)).toEqual(['grammar', 'test'])
    expect(poolTagRows(pool).map((row) => row.tag)).toEqual(['kanji', 'verbs'])
  })

  it('treats missing counts as idle, drops blanks, and tolerates no list', () => {
    expect(idleTagRows([{ tag: 'a' }, { tag: '  ' }, { new: 0 }])).toEqual(['a'])
    expect(idleTagRows(null)).toEqual([])
  })
})
