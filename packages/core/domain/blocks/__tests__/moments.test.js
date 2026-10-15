/**
 * PLAN-009 — the companion's three block moments are read from the log.
 */
import { blockMoments, weekKeyOf } from '../moments'

const block = (id, overrides = {}) => ({
  id,
  title: id,
  source: { type: 'routine', id: null },
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  date: null,
  ...overrides
})
const occ = (b, date, log = null, lengthMin = 20) => ({ blockId: b.id, date, start: '07:00', lengthMin, title: b.title, block: b, log })
const kept = (minutes = 20, record = null) => ({ status: 'kept', minutes, record })
const TODAY = '2026-10-15' // a Thursday

it('keys a week by its Monday', () => {
  expect(weekKeyOf('2026-10-15')).toBe('2026-10-12')
  expect(weekKeyOf('2026-10-12')).toBe('2026-10-12')
  expect(weekKeyOf('2026-10-18')).toBe('2026-10-12')
})

it('a block kept today after two missed scheduled days is a moment; after one it is not', () => {
  const b = block('run')
  const back = [occ(b, '2026-10-13', { status: 'skipped', minutes: 0 }), occ(b, '2026-10-14'), occ(b, TODAY, kept())]
  expect(blockMoments(back, TODAY).map((m) => m.key)).toContain('kept_after_skips:run:2026-10-15')
  const oneMiss = [occ(b, '2026-10-13', kept()), occ(b, '2026-10-14'), occ(b, TODAY, kept())]
  expect(blockMoments(oneMiss, TODAY).some((m) => m.reason === 'kept_after_skips')).toBe(false)
})

it('a one-off block never earns the comeback', () => {
  const once = block('dentist', { daysOfWeek: [], date: TODAY })
  expect(blockMoments([occ(once, TODAY, kept())], TODAY).some((m) => m.reason === 'kept_after_skips')).toBe(false)
})

it('a study block kept under its estimate with cards on its record is a moment', () => {
  const study = block('review', { source: { type: 'study', id: null } })
  const [m] = blockMoments([occ(study, TODAY, kept(14, { studySessionId: 's', cards: 27 }), 20)], TODAY).filter(
    (x) => x.reason === 'under_estimate'
  )
  expect(m.params).toEqual({ title: 'review', minutes: 14, estimate: 20 })
  expect(blockMoments([occ(study, TODAY, kept(20, { cards: 27 }), 20)], TODAY).some((x) => x.reason === 'under_estimate')).toBe(false)
  expect(blockMoments([occ(study, TODAY, kept(14, null), 20)], TODAY).some((x) => x.reason === 'under_estimate')).toBe(false)
})

it('a week with five planned and four in five kept is a moment, keyed by its Monday', () => {
  const b = block('water')
  const week = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((d) => occ(b, d, kept()))
  const c = block('read')
  const more = [occ(c, '2026-10-12', kept()), occ(c, '2026-10-13', { status: 'partial', minutes: 5 })]
  const moments = blockMoments([...week, ...more], TODAY)
  const wk = moments.find((m) => m.reason === 'week_kept')
  expect(wk).toEqual({ reason: 'week_kept', key: 'week_kept:2026-10-12', params: { kept: 5, planned: 6 } })
  expect(blockMoments(week.slice(0, 3), TODAY).some((m) => m.reason === 'week_kept')).toBe(false)
})
