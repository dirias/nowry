/**
 * The Plan tab: the day, the agenda, and the plan they are views of (MOB-046,
 * PLAN-003).
 *
 * They shipped apart — a Calendar tab, and the plan behind a key on it — and
 * the user asked the right question: why does the Focus timer get a tab of its
 * own when planning does not? The answer was in this product's own web app.
 * Pomodoro has no route there at all; it is a widget and a chip rendered over
 * whatever page you are on. Annual Planning has four routes. The phone had
 * inverted that, giving a permanent tab to the thing the web treats as a
 * floating control and none to the thing the web treats as a section.
 *
 * So the two views of the plan share one tab, exactly as the Study Center's
 * Dashboard and Library do — one segment, two shapes. Five tabs still, and the
 * bar keeps its ceiling.
 *
 * The route keeps the web's `/calendar` path, and `/annual-planning` redirects
 * into this tab's overview segment, so both of the web's URLs still open the
 * thing they name.
 *
 * Day leads and is the default (PRD FR-005): the timeline is what a learner
 * opens the tab for each morning; the agenda is the month's deadlines behind
 * it; the overview is the year. The routine editor's old route lands on Day
 * too, since the routine is now the recurring blocks on it (ADR-045).
 */
import { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, Segmented, Stack } from '../../../src/ui'
import { Calendar } from '../../../src/screens/Calendar'
import { AnnualPlanning } from '../../../src/screens/AnnualPlanning'
import { PlanDay } from '../../../src/screens/PlanDay'

const VIEWS = { day: 'day', agenda: 'agenda', overview: 'overview' }
const isView = (value) => Object.values(VIEWS).includes(value)

export default function PlanCenter() {
  const { t } = useTranslation()
  const router = useRouter()
  // A link can name the view — `/annual-planning` redirects here asking for the
  // overview, the plan's routine row asks for the day. It is a one-shot
  // instruction, not state: the param is cleared as soon as it is obeyed, so
  // following the same link twice works the second time. Without that, a tab
  // already mounted would ignore it.
  const { view: asked } = useLocalSearchParams()
  const [view, setView] = useState(isView(asked) ? asked : VIEWS.day)

  useEffect(() => {
    if (!isView(asked)) return
    setView(asked)
    router.setParams({ view: undefined })
  }, [asked, router])

  const segment = (
    <Segmented
      accessibilityLabel={t('annualPlanning.title')}
      value={view}
      onChange={setView}
      options={[
        { value: VIEWS.day, label: t('blocks.day') },
        { value: VIEWS.agenda, label: t('calendarPage.views.agenda') },
        { value: VIEWS.overview, label: t('annualPlanning.tabs.overview') }
      ]}
    />
  )

  /*
   * Two shapes, so two surfaces. The day and the calendar each hold their own
   * scrolling list under fixed chrome; the plan is a plain scroll of sections.
   */
  if (view === VIEWS.overview) {
    return (
      <Screen>
        <Stack spacing={2}>
          {segment}
          <AnnualPlanning />
        </Stack>
      </Screen>
    )
  }

  return (
    <Screen scroll={false}>
      <Stack spacing={2} style={{ flex: 1 }}>
        {segment}
        {view === VIEWS.agenda ? <Calendar /> : <PlanDay />}
      </Stack>
    </Screen>
  )
}
