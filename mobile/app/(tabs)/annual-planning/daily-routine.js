/**
 * `/annual-planning/daily-routine` — the web's own path for the routine
 * editor, kept as a link target. The routine is now the recurring blocks on
 * the Plan tab's Day (ADR-045, PLAN-003), so the address lands there; the
 * editor itself stays in place until PLAN-008 removes its Home entry points.
 */
import { Redirect } from 'expo-router'

export default function DailyRoutineRoute() {
  return <Redirect href='/calendar?view=day' />
}
