/**
 * WAIT-002 / WAIT-006 — the Waitlist tab's rules (FR-012, board E): which rows
 * can be ticked, how a selection grows, shrinks and follows the list, the
 * selection bar's and the invite key's wording, a row's source and its phone
 * meta line, and what a refused send says.
 */
import {
  WAITLIST_STATES,
  WAITLIST_STATE_COLOR,
  inviteKeyLabel,
  isSelectable,
  localeCode,
  pruneSelection,
  rowMeta,
  selectAllState,
  selectionLabel,
  sourceKey,
  toggleAll,
  toggleRow
} from '../waitlist'
import { MAX_BATCH, sendRefusal } from '../invitations'

const row = (id, status = 'waiting', extra = {}) => ({ id, email: `${id}@x.com`, status, ...extra })

describe('the states', () => {
  it('reads waiting, invited, joined, left, in the board’s order', () => {
    expect(WAITLIST_STATES).toEqual(['waiting', 'invited', 'joined', 'left'])
  })

  it('colours each tag as the board’s classes do', () => {
    expect(WAITLIST_STATE_COLOR).toEqual({ waiting: 'primary', invited: 'warning', joined: 'success', left: 'neutral' })
  })
})

describe('isSelectable', () => {
  it('lets only a waiting row be ticked', () => {
    expect(isSelectable(row('a'))).toBe(true)
    ;['invited', 'joined', 'left'].forEach((status) => expect(isSelectable(row('a', status))).toBe(false))
    expect(isSelectable(null)).toBe(false)
  })
})

describe('toggleRow', () => {
  it('ticks and unticks a waiting row', () => {
    expect(toggleRow([], row('a'))).toEqual(['a'])
    expect(toggleRow(['a', 'b'], row('a'))).toEqual(['b'])
  })

  it('leaves the selection as it was for a row that cannot be ticked', () => {
    const selected = ['a']
    expect(toggleRow(selected, row('b', 'invited'))).toBe(selected)
  })

  it('stops at one batch', () => {
    const full = Array.from({ length: MAX_BATCH }, (_, index) => `r${index}`)
    expect(toggleRow(full, row('extra'))).toBe(full)
    expect(toggleRow(full, row('r3'))).toHaveLength(MAX_BATCH - 1)
  })
})

describe('select all', () => {
  const rows = [row('a'), row('b', 'invited'), row('c'), row('d', 'left')]

  it('says none, some or all of the tickable rows', () => {
    expect(selectAllState(rows, [])).toBe('none')
    expect(selectAllState(rows, ['a'])).toBe('some')
    expect(selectAllState(rows, ['a', 'c'])).toBe('all')
    expect(selectAllState([row('x', 'joined')], [])).toBe('none')
  })

  it('ticks every waiting row, oldest first, then clears them', () => {
    expect(toggleAll(rows, [])).toEqual(['a', 'c'])
    expect(toggleAll(rows, ['c'])).toEqual(['a', 'c'])
    expect(toggleAll(rows, ['a', 'c'])).toEqual([])
  })

  it('ticks at most one batch, the oldest', () => {
    const many = Array.from({ length: MAX_BATCH + 5 }, (_, index) => row(`r${index}`))
    const ticked = toggleAll(many, [])
    expect(ticked).toHaveLength(MAX_BATCH)
    expect(ticked[0]).toBe('r0')
    expect(selectAllState(many, ticked)).toBe('all')
    expect(toggleAll(many, ticked)).toEqual([])
  })
})

describe('pruneSelection', () => {
  it('keeps only ticked rows still listed and still waiting', () => {
    const rows = [row('a'), row('b', 'invited')]
    expect(pruneSelection(['a', 'b', 'gone'], rows)).toEqual(['a'])
  })

  it('answers the same array when nothing changes', () => {
    const selected = ['a']
    expect(pruneSelection(selected, [row('a')])).toBe(selected)
  })
})

describe('selectionLabel', () => {
  it('names the count, and the language only when one is filtered', () => {
    expect(selectionLabel(3, null)).toEqual({ key: 'admin.wl.bar.selected', values: { count: 3 }, languageKey: null })
    expect(selectionLabel(3, 'es')).toEqual({
      key: 'admin.wl.bar.selected',
      values: { count: 3 },
      languageKey: 'admin.inv.languages.es'
    })
  })
})

describe('inviteKeyLabel', () => {
  it('carries the count and the cohort', () => {
    expect(inviteKeyLabel(3, 'c1-waitlist')).toEqual({ key: 'admin.wl.bar.invite', values: { count: 3, cohort: 'c1-waitlist' } })
  })

  it('names only the cohort when nothing is ticked', () => {
    expect(inviteKeyLabel(0, 'c1-waitlist')).toEqual({ key: 'admin.wl.bar.inviteNone', values: { cohort: 'c1-waitlist' } })
  })
})

describe('sourceKey', () => {
  it.each([
    ['/', 'hero'],
    ['hero', 'hero'],
    ['/register', 'register'],
    ['register', 'register'],
    ['/pricing', 'pricing'],
    ['invitation', 'invitation']
  ])('reads %s as %s', (source, key) => {
    expect(sourceKey(source)).toBe(key)
  })

  it('knows nothing of other sources', () => {
    expect(sourceKey('/blog/post')).toBeNull()
    expect(sourceKey(null)).toBeNull()
  })
})

describe('localeCode', () => {
  it('writes the language as its code, upper case', () => {
    expect(localeCode('es')).toBe('ES')
    expect(localeCode('pt-BR')).toBe('PT')
    expect(localeCode(null)).toBeNull()
    expect(localeCode('')).toBeNull()
  })
})

describe('rowMeta', () => {
  const base = { locale: 'es', source: '/', created_at: 'C', invited_at: 'I', joined_at: 'J' }

  it('dates a waiting or left row by when it joined the list', () => {
    expect(rowMeta({ ...base, status: 'waiting' })).toEqual({ date: 'C', dateKey: null })
    expect(rowMeta({ ...base, status: 'left' })).toEqual({ date: 'C', dateKey: null })
  })

  it('dates an invited or joined row by that step', () => {
    expect(rowMeta({ ...base, status: 'invited' })).toEqual({ date: 'I', dateKey: 'admin.wl.list.meta.invited' })
    expect(rowMeta({ ...base, status: 'joined' })).toEqual({ date: 'J', dateKey: 'admin.wl.list.meta.joined' })
  })

  it('falls back to the list date when the step has none', () => {
    expect(rowMeta({ ...base, status: 'invited', invited_at: null })).toEqual({ date: 'C', dateKey: null })
  })
})

describe('sendRefusal', () => {
  it('reads over budget with what was needed and what is left', () => {
    const error = { response: { status: 409, data: { detail: { code: 'over_budget', needed: 5, left: 2 } } } }
    expect(sendRefusal(error)).toEqual({ kind: 'overBudget', needed: 5, left: 2 })
  })

  it('reads anything else as a failure', () => {
    expect(sendRefusal(new Error('down'))).toEqual({ kind: 'failed' })
  })
})
