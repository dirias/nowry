import { editedAgo, firstNoteName, metaLine } from '../boardMeta'
import { outlineViewBox } from '../BoardOutline'

const t = (key, options) =>
  options?.count !== undefined
    ? `${key}:${options.count}`
    : options?.date
      ? `${key}:${options.date}`
      : options?.name
        ? `${key}:${options.name}`
        : key
const NOW = new Date('2026-10-17T12:00:00Z').getTime()

describe('editedAgo', () => {
  it.each([
    [NOW - 20 * 1000, 'boards.tile.edited.justNow'],
    [NOW - 5 * 60 * 1000, 'boards.tile.edited.minutes:5'],
    [NOW - 3 * 3600 * 1000, 'boards.tile.edited.hours:3'],
    [NOW - 30 * 3600 * 1000, 'boards.tile.edited.yesterday']
  ])('%s → %s', (at, expected) => {
    expect(editedAgo(t, new Date(at).toISOString(), { now: NOW })).toBe(expected)
  })

  it('an older edit names its day', () => {
    expect(editedAgo(t, '2026-10-04T10:00:00Z', { now: NOW, locale: 'en' })).toBe('boards.tile.edited.on:Oct 4')
  })

  it('no date, no phrase', () => {
    expect(editedAgo(t, null)).toBeNull()
  })
})

describe('metaLine', () => {
  const base = { updatedAt: null, isOwner: true, ownerName: '', collaborators: [], counts: { notes: 9, links: 0, items: 2, cards: 0 } }

  it('says what the board holds and what it made, leaving out nothing-counts', () => {
    expect(metaLine(t, base)).toBe('boards.tile.notes:9 · boards.tile.items:2')
  })

  it('says who it is shared with, or who shared it', () => {
    expect(metaLine(t, { ...base, collaborators: ['a'] })).toContain('boards.tile.sharedWith:1')
    expect(metaLine(t, { ...base, isOwner: false, ownerName: 'Ana' })).toContain('boards.tile.sharedBy:Ana')
  })
})

describe('firstNoteName', () => {
  it('is the first line of the first note', () => {
    expect(
      firstNoteName([
        { kind: 'text', text: 'Heading' },
        { kind: 'note', text: '  Photosynthesis \nbody' }
      ])
    ).toBe('Photosynthesis')
    expect(firstNoteName([{ kind: 'text', text: 'Heading' }])).toBeNull()
  })
})

describe('outlineViewBox', () => {
  it('frames every rectangle with room around it', () => {
    const box = outlineViewBox([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 200, y: 100, w: 100, h: 50 }
    ])
    const [x, y, w, h] = box.split(' ').map(Number)
    expect(x).toBeLessThan(0)
    expect(y).toBeLessThan(0)
    expect(x + w).toBeGreaterThan(300)
    expect(y + h).toBeGreaterThan(150)
    expect(outlineViewBox([])).toBeNull()
  })
})
