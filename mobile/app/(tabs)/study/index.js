/**
 * The Study Center (MOB-033, PhoneDashboard artboard).
 *
 * Title, then one segment: Dashboard or Library. That level was missing — the
 * first build opened straight onto the library's Decks/Cards/Tags tabs, so the
 * dashboard the canvas designed had nowhere to be.
 *
 * The two views are genuinely different shapes, which is why they are two
 * components rather than one with a branch: Dashboard is a short scroll of
 * sections, Library is a virtualised list of up to five hundred rows.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen, Segmented, Stack, Typography } from '../../../src/ui'
import { StudyDashboard } from '../../../src/screens/StudyDashboard'
import { StudyLibrary } from '../../../src/screens/StudyLibrary'

const VIEWS = { dashboard: 'dashboard', library: 'library' }

export default function StudyCenter() {
  const { t } = useTranslation()
  const [view, setView] = useState(VIEWS.dashboard)

  const header = (
    <Stack spacing={2}>
      <Typography level='h4'>{t('study.title')}</Typography>
      <Segmented
        accessibilityLabel={t('study.title')}
        value={view}
        onChange={setView}
        options={[
          { value: VIEWS.dashboard, label: t('study.views.dashboard') },
          { value: VIEWS.library, label: t('study.views.library') }
        ]}
      />
    </Stack>
  )

  /*
   * The library owns its own scroll because it is virtualised, and the header
   * rides along as the list's header. The dashboard is a plain scroll.
   */
  if (view === VIEWS.library) {
    return (
      <Screen scroll={false} padding={0}>
        <StudyLibrary header={header} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack spacing={2}>
        {header}
        <StudyDashboard />
      </Stack>
    </Screen>
  )
}
