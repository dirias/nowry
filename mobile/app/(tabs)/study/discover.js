/**
 * Discover — the public catalogue, pushed from the Library (MOB-120).
 *
 * It was the Study Center's third segment, "Browse", drawn in the Library's
 * grammar, so "Decks 0" beside "Decks 4" read as a duplicate tab that had lost
 * the learner's decks. Other people's shelf is now a place reached from your
 * own: the foot of the Library's decks and its Add sheet. The app bar carries
 * the way back, as it does for every pushed study screen.
 */
import { useTranslation } from 'react-i18next'
import { Screen, Typography } from '../../../src/ui'
import { Browse } from '../../../src/screens/Browse'

export default function Discover() {
  const { t } = useTranslation()
  return (
    <Screen scroll={false} padding={0}>
      <Browse header={<Typography level='h4'>{t('public.discover')}</Typography>} />
    </Screen>
  )
}
