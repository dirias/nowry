/**
 * Profile (MOB-025).
 *
 * Who you are, what plan you are on, and the two ways out: settings, and
 * signing out.
 *
 * **The plan is a readout, not an offer.** ADR-030 keeps subscription purchase
 * off the phone, so this states the tier and stops. There is no Upgrade button
 * anywhere in the mobile client, and that is a compliance position rather than
 * an omission — the moment a mobile screen advertises a paid tier it becomes a
 * store-billing question.
 *
 * Signing out is the shared `logout`, which clears the React Query cache along
 * with the session, so the next account never reads the last one's data.
 */
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useUserProfile } from '@nowry/core/hooks/useUserProfile'
import { Button, Divider, Readout, Screen, Skeleton, Stack, Typography } from '../ui'

export function Profile() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { profile, loading } = useUserProfile()

  const tier = profile?.subscription?.tier ?? null

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography level='h4'>{profile?.full_name || profile?.username || t('profile.title')}</Typography>
          <Readout>{user?.email ?? ''}</Readout>
        </Stack>

        <Divider />

        <Typography level='title-md'>{t('subscription.currentPlan')}</Typography>
        {/* The mobile Skeleton is a placeholder, not a wrapper: it stands in
            for the line rather than gating it. */}
        {loading ? (
          <Skeleton width='40%' height={20} />
        ) : (
          <Typography level='body-md'>{tier ? t(`subscription.tier.${tier}`, tier) : t('subscription.tier.free')}</Typography>
        )}

        <Divider />

        <Button variant='secondary' onPress={() => router.push('/settings')}>
          {t('nav.settings')}
        </Button>

        <Button variant='tertiary' onPress={() => logout?.()}>
          {t('common.logout')}
        </Button>
      </Stack>
    </Screen>
  )
}

export default Profile
