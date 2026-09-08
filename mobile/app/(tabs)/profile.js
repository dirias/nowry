/** Profile. Built in MOB-025, alongside settings. */
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { Button, Screen, Stack, Typography } from '../../src/ui'

export default function Profile() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen>
      <Stack spacing={2}>
        <Typography level='h4'>{t('nav.profile')}</Typography>
        <Typography level='body-md' color='text.secondary'>
          {user?.email ?? user?.username ?? 'signed in'}
        </Typography>
        <Button size='sm' variant='secondary' onPress={() => router.push('/settings')}>
          {t('nav.settings')}
        </Button>
        <Button size='sm' variant='tertiary' onPress={() => logout?.()}>
          Sign out
        </Button>
      </Stack>
    </Screen>
  )
}
