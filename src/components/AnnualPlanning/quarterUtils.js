/**
 * quarterUtils — pure quarter date math for Annual Planning.
 *
 * Deliberately client-side: a quarter boundary is a *calendar* boundary, so it
 * must be evaluated in the viewer's own timezone. Computing "days until the
 * quarter closes" on the server would report the wrong day for anyone whose
 * local date differs from the server's (UTC-5 on Dec 31 22:00 local is already
 * Jan 1 in UTC — the user would be told the quarter closed yesterday).
 *
 * Every function here is pure and side-effect free so it can be unit-tested and
 * shared between the header alert (AnnualPlanningLayout) and the Reports empty
 * state (ReportsTabView) without either owning the rules.
 */

/** Calendar quarter (1-4) containing `date`, in local time. */
export const getQuarterFromDate = (date = new Date()) => Math.floor(date.getMonth() / 3) + 1

/**
 * Local midnight of the last calendar day of `quarter` in `year`.
 * Day 0 of month `quarter * 3` is the last day of the preceding month, which is
 * the quarter's final month (Q1 -> month 3 day 0 -> Mar 31).
 */
export const getQuarterEndDate = (year, quarter) => new Date(year, quarter * 3, 0)

/**
 * Whole days from `now` until the quarter's local end date.
 * 0 on the final day, negative once the quarter has passed.
 */
export const getDaysUntilQuarterEnd = (year, quarter, now = new Date()) => {
  const days = Math.ceil((getQuarterEndDate(year, quarter).getTime() - now.getTime()) / (1000 * 3600 * 24))
  // Math.ceil of a small negative fraction yields -0, which interpolates into copy
  // as "-0 days". Normalise it away at the source.
  return days === 0 ? 0 : days
}

/** True when a quarter_report already exists for this quarter/year pair. */
export const isQuarterClosed = (quarterReports, quarter, year) =>
  (quarterReports || []).some((r) => r.quarter === Number(quarter) && r.year === Number(year))

/**
 * Single source of truth for "can the user close a quarter right now, and which one".
 *
 * A quarter is closable when either:
 *   - the backend flagged an overdue quarter on the plan (`plan.overdue_quarter`), or
 *   - the current quarter ends within 10 days and has no report yet.
 *
 * @returns {{
 *   currentQuarter: number, currentYear: number, daysLeft: number,
 *   overdueQuarter: number|null, overdueYear: number|null, overdueEndDate: Date|null,
 *   closingSoon: boolean, closable: boolean, closableQuarter: number, closableYear: number
 * }}
 */
export const getQuarterCloseState = ({ plan = null, quarterReports = [], now = new Date() } = {}) => {
  const currentYear = now.getFullYear()
  const currentQuarter = getQuarterFromDate(now)
  const daysLeft = getDaysUntilQuarterEnd(currentYear, currentQuarter, now)

  const planYear = plan?.year ?? currentYear
  const overdueQuarter = plan?.overdue_quarter?.quarter || null
  const overdueYear = plan?.overdue_quarter?.year || null

  const closingSoon = daysLeft <= 10 && daysLeft >= 0 && !isQuarterClosed(quarterReports, currentQuarter, planYear)

  return {
    currentQuarter,
    currentYear,
    daysLeft,
    overdueQuarter,
    overdueYear,
    overdueEndDate: overdueQuarter ? getQuarterEndDate(overdueYear || currentYear, overdueQuarter) : null,
    closingSoon,
    closable: Boolean(overdueQuarter) || closingSoon,
    closableQuarter: overdueQuarter || currentQuarter,
    closableYear: overdueYear || currentYear
  }
}

export default {
  getQuarterFromDate,
  getQuarterEndDate,
  getDaysUntilQuarterEnd,
  isQuarterClosed,
  getQuarterCloseState
}
