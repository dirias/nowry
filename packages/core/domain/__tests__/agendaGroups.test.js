import { addMonths, formatMonthTitle, formatWeekTitle, groupAgenda, pastAgenda, startOfWeek } from '../calendar/agendaGroups'

const ev = (year, month, day, id = `${year}-${month}-${day}`) => ({ id, date: new Date(year, month, day) })

describe('groupAgenda — the month, from today, with Today always first', () => {
  const today = new Date(2026, 8, 5) // Sat 5 Sep 2026

  it('puts an empty Today group first when nothing is due today', () => {
    const groups = groupAgenda([ev(2026, 8, 8), ev(2026, 8, 22)], new Date(2026, 8, 1), today)
    expect(groups.map((g) => g.date.getDate())).toEqual([5, 8, 22])
    expect(groups[0]).toMatchObject({ isToday: true, events: [] })
    expect(groups[1].isToday).toBe(false)
  })

  it('omits days before today in the current month', () => {
    const groups = groupAgenda([ev(2026, 8, 2), ev(2026, 8, 5), ev(2026, 8, 9)], today, today)
    expect(groups.map((g) => g.date.getDate())).toEqual([5, 9])
    expect(groups[0].events).toHaveLength(1)
  })

  it('lists every day with an event in a future month, in order, with no Today group', () => {
    const groups = groupAgenda([ev(2026, 9, 20), ev(2026, 9, 3), ev(2026, 9, 3, 'second')], new Date(2026, 9, 1), today)
    expect(groups.map((g) => g.date.getDate())).toEqual([3, 20])
    expect(groups[0].events.map((e) => e.id)).toEqual(['2026-9-3', 'second'])
    expect(groups.some((g) => g.isToday)).toBe(false)
  })

  it('ignores events outside the cursor month', () => {
    const groups = groupAgenda([ev(2026, 7, 31), ev(2026, 9, 1)], new Date(2026, 9, 15), today)
    expect(groups.map((g) => g.date.getDate())).toEqual([1])
  })

  it('returns no groups for an empty past month', () => {
    expect(groupAgenda([], new Date(2026, 6, 1), today)).toEqual([])
  })
})

describe("the nav object's arithmetic and readout", () => {
  it('addMonths pins to the first so the 31st never skips a month', () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 1))
    expect(addMonths(new Date(2026, 0, 15), -1)).toEqual(new Date(2025, 11, 1))
  })

  it("weeks start on Sunday, as FullCalendar's grid does", () => {
    expect(startOfWeek(new Date(2026, 8, 5)).getDay()).toBe(0)
    expect(startOfWeek(new Date(2026, 8, 5))).toEqual(new Date(2026, 7, 30))
  })

  it("formats the month readout in the user's language", () => {
    expect(formatMonthTitle(new Date(2026, 8, 5), 'en')).toBe('September 2026')
    expect(formatMonthTitle(new Date(2026, 8, 5), 'es')).toMatch(/septiembre/i)
  })

  it('formats the week readout as a range spanning the month boundary', () => {
    const title = formatWeekTitle(new Date(2026, 8, 5), 'en')
    expect(title).toMatch(/Aug 30/)
    expect(title).toMatch(/Sep 5, 2026/)
  })
})

describe('pastAgenda', () => {
  const TODAY = new Date(2026, 8, 13) // Sun 13 Sep 2026
  const at = (day, month = 8, year = 2026) => ({ date: new Date(year, month, day), id: `${year}-${month}-${day}` })

  it('is what the agenda leaves behind, in the current month', () => {
    const groups = pastAgenda([at(3), at(9), at(13), at(20)], TODAY, TODAY)
    expect(groups.map((group) => group.date.getDate())).toEqual([3, 9])
  })

  it('never includes today, which the agenda already leads with', () => {
    expect(pastAgenda([at(13)], TODAY, TODAY)).toEqual([])
  })

  it('together with the agenda it accounts for every event in the month', () => {
    const events = [at(1), at(9), at(13), at(28)]
    const seen = [...pastAgenda(events, TODAY, TODAY), ...groupAgenda(events, TODAY, TODAY)].flatMap((group) => group.events)
    expect(seen).toHaveLength(events.length)
  })

  it('is empty for any month but the current one', () => {
    // "Earlier" only means something relative to now; a past month's agenda
    // already starts at its first day.
    const august = new Date(2026, 7, 15)
    expect(pastAgenda([at(1, 7), at(30, 7)], august, TODAY)).toEqual([])
  })

  it('ignores events from other months entirely', () => {
    expect(pastAgenda([at(30, 7), at(3)], TODAY, TODAY).map((group) => group.date.getDate())).toEqual([3])
  })

  it('never inserts an empty day, unlike the agenda´s today', () => {
    expect(pastAgenda([], TODAY, TODAY)).toEqual([])
  })

  it('reads chronologically, as the agenda does', () => {
    const groups = pastAgenda([at(11), at(2), at(7)], TODAY, TODAY)
    expect(groups.map((group) => group.date.getDate())).toEqual([2, 7, 11])
  })
})
