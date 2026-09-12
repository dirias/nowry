/**
 * `/annual-planning/daily-routine` — the web's own path for this screen, so one
 * link opens the same editor on both clients.
 */
import { DailyRoutineEditor } from '../../../src/screens/DailyRoutineEditor'

export default function DailyRoutineRoute() {
  return <DailyRoutineEditor />
}
