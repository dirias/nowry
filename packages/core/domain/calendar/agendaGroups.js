/**
 * Date arithmetic and the agenda's grouping rule, kept pure so the page and
 * its tests share one calendar.
 *
 * Weeks start on Sunday, matching FullCalendar's default `firstDay`, so the
 * readout's week range and the day-grid week always describe the same seven
 * days.
 */

export const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

export const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** The first of the month `months` away — pinned to day 1 so Jan 31 + 1 is Feb, not March. */
export const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1)

export const startOfWeek = (date) => {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return addDays(midnight, -midnight.getDay())
}

export const formatMonthTitle = (date, language) => new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(date)

/** "Aug 30 – Sep 5, 2026" in the user's language; the range formatter falls back to two dates. */
export const formatWeekTitle = (date, language) => {
  const start = startOfWeek(date)
  const end = addDays(start, 6)
  const formatter = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', year: 'numeric' })
  if (typeof formatter.formatRange === 'function') return formatter.formatRange(start, end)
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

/** "Tue 8" */
export const formatDayLabel = (date, language) => new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric' }).format(date)

/** The lighter text beside a group label: "Sep", or "Sat 5 Sep" when the label itself says Today. */
export const formatDaySide = (date, language, isToday) =>
  new Intl.DateTimeFormat(language, isToday ? { weekday: 'short', day: 'numeric', month: 'short' } : { month: 'short' }).format(date)

/**
 * The agenda's groups for the month `cursor` is in.
 *
 * Rules (ADR-016, decision 5):
 *  - Only that month's events are listed, one group per day that has any.
 *  - In the current month the list starts at today; earlier days are reached
 *    with the nav object, not by scrolling past what is already done.
 *  - Today is ALWAYS the first group of the current month, even with no
 *    events, so the page always has a "now" — FullCalendar's list view could
 *    not do this, which is why the agenda is Nowry's own.
 *
 * @param {Array<{ date: Date }>} events - already filtered
 * @param {Date} cursor - any date in the month to list
 * @param {Date} [today]
 * @returns {Array<{ date: Date, isToday: boolean, events: Array }>}
 */
export function groupAgenda(events, cursor, today = new Date()) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const currentMonth = isSameMonth(cursor, today)
  const byDay = new Map()

  events.forEach((ev) => {
    const date = ev.date
    if (date.getFullYear() !== year || date.getMonth() !== month) return
    if (currentMonth && date.getDate() < today.getDate()) return
    const day = date.getDate()
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(ev)
  })

  if (currentMonth && !byDay.has(today.getDate())) byDay.set(today.getDate(), [])

  return [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => ({
      date: new Date(year, month, day),
      isToday: currentMonth && day === today.getDate(),
      events: byDay.get(day)
    }))
}
