/**
 * The Study Center (MOB-033, PhoneDashboard artboard).
 *
 * Title, then one segment: Dashboard, Library or Browse. The first two were the
 * board's; Browse joined them in V2 (MOB-049) because "find more decks" is the
 * same question as "which of my decks", asked of a bigger shelf. The web keeps
 * its catalogue at `/browse` in the header, which a phone has no room for, and
 * a fifth tab is not the answer either.
 *
 * The three views are genuinely different shapes, which is why they are three
 * components rather than one with a branch: Dashboard is a short scroll of
 * sections, Library and Browse are lists that own their own scrolling.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen, Segmented, Stack, Typography } from '../../../src/ui'
import { StudyDashboard } from '../../../src/screens/StudyDashboard'
import { StudyLibrary } from '../../../src/screens/StudyLibrary'
import { Browse } from '../../../src/screens/Browse'

const VIEWS = { dashboard: 'dashboard', library: 'library', browse: 'browse' }

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
          { value: VIEWS.library, label: t('study.views.library') },
          { value: VIEWS.browse, label: t('public.browse') }
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

  if (view === VIEWS.browse) {
    return (
      <Screen scroll={false} padding={0}>
        <Browse header={header} />
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
