/**
 * Settings, at `/settings` — top level, exactly as the web serves it.
 *
 * Outside the tab group on purpose: it is pushed over the tabs rather than
 * being one, which is both what the web does and what keeps the tab bar at
 * four. Built in MOB-025.
 */
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Screen, Stack, Typography } from '../src/ui'

export default function Settings() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>{t('nav.settings', 'Settings')}</Typography>
        <Typography level='body-sm' color='text.tertiary'>
          Placeholder for MOB-025.
        </Typography>
        <Button size='sm' variant='secondary' onPress={() => router.back()}>
          Back
        </Button>
      </Stack>
    </Screen>
  )
}
