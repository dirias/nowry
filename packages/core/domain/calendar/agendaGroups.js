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
 * One group per day that has events, within the month `cursor` is in.
 *
 * `keep` decides which of that month's days are in scope, which is the only
 * thing that differs between the agenda and the days behind it.
 */
function groupDays(events, cursor, today, keep) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const currentMonth = isSameMonth(cursor, today)
  const byDay = new Map()

  events.forEach((ev) => {
    const date = ev.date
    if (date.getFullYear() !== year || date.getMonth() !== month) return
    if (!keep(date.getDate(), currentMonth)) return
    const day = date.getDate()
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(ev)
  })

  return { byDay, year, month, currentMonth }
}

const toGroups = ({ byDay, year, month, currentMonth }, today) =>
  [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => ({
      date: new Date(year, month, day),
      isToday: currentMonth && day === today.getDate(),
      events: byDay.get(day)
    }))

/**
 * The agenda's groups for the month `cursor` is in.
 *
 * Rules (ADR-016, decision 5):
 *  - Only that month's events are listed, one group per day that has any.
 *  - In the current month the list starts at today; earlier days are
 *    `pastAgenda` below, not scrolled past.
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
  const grouped = groupDays(events, cursor, today, (day, currentMonth) => !currentMonth || day >= today.getDate())
  if (grouped.currentMonth && !grouped.byDay.has(today.getDate())) grouped.byDay.set(today.getDate(), [])
  return toGroups(grouped, today)
}

/**
 * What the current month has already been, and this exists because of where
 * the agenda is (MOB-100).
 *
 * ADR-016 starts the list at today and sends you to the nav object for
 * anything earlier. That is right on the web, which draws a month GRID beside
 * the agenda — every past day is one click away in it. The phone has no grid:
 * the agenda IS the calendar there, so an overdue item from earlier this month
 * was reachable from nowhere at all. Found by falling into it — a task ticked
 * by accident could not be found again.
 *
 * So the rule holds and the days behind it are a separate list the caller may
 * choose to offer. Empty for any month but the current one, because "earlier"
 * only means something relative to now: a past month's agenda already starts
 * at its first day.
 *
 * @returns {Array<{ date: Date, isToday: boolean, events: Array }>} chronological
 */
export function pastAgenda(events, cursor, today = new Date()) {
  if (!isSameMonth(cursor, today)) return []
  return toGroups(
    groupDays(events, cursor, today, (day, currentMonth) => currentMonth && day < today.getDate()),
    today
  )
}
