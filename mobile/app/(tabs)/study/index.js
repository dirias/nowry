/** The Study Center. Built in MOB-019 and MOB-020. */
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, ListRow, IdentityTile, Measure, Readout, Screen, Stack, Typography } from '../../../src/ui'

export default function StudyCenter() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>{t('nav.study')}</Typography>
        <Typography level='body-sm' color='text.tertiary'>
          Placeholder. MOB-019 builds Today, MOB-020 the library.
        </Typography>
        <ListRow
          tile={<IdentityTile color='primary.solidBg' />}
          name='Spanish verbs'
          meta='42 cards'
          measure={<Measure value={62} accessibilityLabel='62 percent' />}
          readout={<Readout leading>3 due</Readout>}
          onPress={() => router.push('/study/demo-deck')}
        />
        <Button size='sm' variant='secondary' onPress={() => router.push('/study/deck/demo-deck')}>
          Open deck detail
        </Button>
      </Stack>
    </Screen>
  )
}
