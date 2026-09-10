/**
 * The Plan tab: the calendar and the plan it is a view of (MOB-046).
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
 * into this tab's second segment, so both of the web's URLs still open the
 * thing they name.
 */
import { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, Segmented, Stack } from '../../src/ui'
import { Calendar } from '../../src/screens/Calendar'
import { AnnualPlanning } from '../../src/screens/AnnualPlanning'

const VIEWS = { calendar: 'calendar', overview: 'overview' }

export default function PlanCenter() {
  const { t } = useTranslation()
  const router = useRouter()
  // A link can name the view — `/annual-planning` redirects here asking for the
  // overview. It is a one-shot instruction, not state: the param is cleared as
  // soon as it is obeyed, so following the same link twice works the second
  // time. Without that, a tab already mounted would ignore it.
  const { view: asked } = useLocalSearchParams()
  const [view, setView] = useState(asked === VIEWS.overview ? VIEWS.overview : VIEWS.calendar)

  useEffect(() => {
    if (asked !== VIEWS.overview) return
    setView(VIEWS.overview)
    router.setParams({ view: undefined })
  }, [asked, router])

  const segment = (
    <Segmented
      accessibilityLabel={t('annualPlanning.title')}
      value={view}
      onChange={setView}
      options={[
        { value: VIEWS.calendar, label: t('calendarPage.title') },
        { value: VIEWS.overview, label: t('annualPlanning.tabs.overview') }
      ]}
    />
  )

  /*
   * Two shapes, so two surfaces. The calendar holds its own scrolling list
   * under a fixed pair of toolbars; the plan is a plain scroll of sections.
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
        <Calendar />
      </Stack>
    </Screen>
  )
}
