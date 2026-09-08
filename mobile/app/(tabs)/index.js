/**
 * Home. A placeholder until MOB-018 builds it from `useNextSteps`,
 * `useStatistics` and the ADR-021 summary object.
 */
import { useTranslation } from 'react-i18next'
import { Screen, Stack, SummaryObject, Typography, Button, Readout } from '../../src/ui'

export default function Home() {
  const { t } = useTranslation()
  return (
    <Screen>
      <Stack spacing={3}>
        <SummaryObject
          title={t('nav.home', 'Home')}
          context='Placeholder — MOB-018 builds this'
          readouts={<Readout leading>the summary object goes here</Readout>}
          action={<Button size='sm'>Start studying</Button>}
        />
        <Typography level='body-sm' color='text.tertiary'>
          The navigation shell is MOB-015. The screens arrive in MOB-018 onward.
        </Typography>
      </Stack>
    </Screen>
  )
}
