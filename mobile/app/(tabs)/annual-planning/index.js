/**
 * `/annual-planning` — the web's own path, kept as a link target rather than as
 * a screen. The plan lives in the Plan tab beside the calendar (MOB-046), so
 * this redirects into that tab's second segment: Home's next-steps row and the
 * web's URL both land on the plan, with the tab bar still under them.
 *
 * Its sibling `daily-routine.js` IS a screen, at the address the web gives the
 * routine editor. That is why this is a directory now (MOB-080).
 */
import { Redirect } from 'expo-router'

export default function AnnualPlanningRoute() {
  return <Redirect href='/calendar?view=overview' />
}
