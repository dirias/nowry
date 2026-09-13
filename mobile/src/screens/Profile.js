/**
 * Profile (MOB-025, rebuilt to the web's in MOB-092).
 *
 * Reported: "when tap picture profile, that screen looks almost blank". It
 * was — a name, an email, a plan word and two keys, against a web page with a
 * portrait, three counts, a joining date, an editable name and bio, and the
 * account's usage against its limits. None of that is a paid feature and all of
 * it is about the reader, which is what a profile is for.
 *
 * **No edit MODE.** The web has one: a key that turns nine readouts into nine
 * fields, with Cancel and Save. That is a browser pattern, and it exists there
 * because a page of inputs looks unfinished on a wide screen. A phone form is
 * fields with a save key, and every native settings app works that way — so the
 * fields are live and one key appears when something has actually changed.
 * Nothing is committed until it is pressed, which is the part the mode was
 * really protecting.
 *
 * **The plan is a readout, not an offer.** ADR-030 keeps subscription purchase
 * off the phone: the moment a mobile screen advertises a paid tier it becomes a
 * store-billing question. Stating this account's own usage against its own
 * limits is neither an advertisement nor a link to a purchase flow, so the bars
 * are here; the web's Upgrade key is not, and there is none anywhere in this
 * client.
 *
 * **The portrait cannot be changed here yet.** Choosing one needs a native
 * image picker, and adding a native module needs a rebuilt binary — which is
 * not a thing to slip into a screen fix. It is recorded rather than faked: no
 * control offers it.
 *
 * Signing out is the shared `logout`, which clears the React Query cache along
 * with the session, so the next account never reads the last one's data.
 */
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import { useUserProfile } from '@nowry/core/hooks/useUserProfile'
import { userService } from '@nowry/core/api/services'
import { queryClient } from '@nowry/core/api/queryClient'
import { getUsernameValidationError } from '@nowry/core/utils/usernameValidation'
import { membershipDays, planMeters, profileStats } from '@nowry/core/domain/accountProfile'
import { useTheme } from '../theme'
import { unregisterFromPush } from '../platform/push'
import { Avatar, Button, Divider, FormField, Input, Progress, Readout, Screen, Skeleton, Stack, Typography } from '../ui'

/** Large enough to be a portrait rather than a marker beside a name. */
const PORTRAIT = 72

export function Profile() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { user, logout, updateUser } = useAuth()
  const { profile, loading } = useUserProfile()

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState(null)

  /*
   * Seeded from the server once it answers, and only then. Seeding from an
   * empty profile would put a blank in the field and then a save would clear
   * the name the account actually has.
   */
  useEffect(() => {
    if (!profile) return
    setUsername(profile.username ?? '')
    setBio(profile.bio ?? '')
  }, [profile])

  const tier = profile?.subscription?.tier ?? null
  const stats = profileStats(profile)
  const meters = planMeters(profile?.subscription)
  const days = membershipDays(profile?.created_at)

  const trimmed = username.trim()
  const changed = Boolean(profile) && (trimmed !== (profile.username ?? '') || bio !== (profile.bio ?? ''))

  const save = async () => {
    if (saving) return
    // The same validator the web's two username fields use, so a name this
    // client accepts is one the other one would have too.
    const invalid = getUsernameValidationError(trimmed, t)
    if (invalid) return setProblem(invalid)

    setSaving(true)
    setProblem(null)
    try {
      await userService.patchProfile({ username: trimmed, bio })
      // The greeting on Home reads the auth user, and the app bar reads the
      // profile query. Both are now wrong about the name until they are told.
      updateUser?.({ username: trimmed, bio })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch (error) {
      // 409 is the one failure with a specific cause worth naming: the name is
      // taken. Everything else is the write not landing.
      setProblem(error?.response?.status === 409 ? t('settings.account.usernameTaken') : t('agent.settings.interventions.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Stack spacing={3}>
        {/* Who, at a size that reads as a portrait. */}
        <Stack direction='row' spacing={2} style={{ alignItems: 'center' }}>
          {loading ? (
            <Skeleton width={PORTRAIT} height={PORTRAIT} radius='lg' />
          ) : (
            <Avatar uri={profile?.avatar_url || profile?.photo_url || null} name={profile?.username || user?.email || ''} size={PORTRAIT} />
          )}
          <Stack spacing={0.5} style={{ flex: 1, minWidth: 0 }}>
            <Typography level='h4' numberOfLines={1}>
              {profile?.username || t('profile.title')}
            </Typography>
            <Readout>{user?.email ?? ''}</Readout>
            {days === null ? null : <Readout>{t('profile.memberSince', { days })}</Readout>}
          </Stack>
        </Stack>

        {/* What studying has added up to. Three counts on one row, because they
            are the same class of fact and a column of three headings for three
            numbers is the dashboard Home was corrected for being (§15.7). */}
        <Stack direction='row' spacing={2}>
          <Count label={t('profile.stats.totalCards')} value={stats.cards} loading={loading} />
          <Count label={t('profile.stats.booksCreated')} value={stats.books} loading={loading} />
          <Count label={t('profile.stats.studyStreak')} value={stats.streak} loading={loading} />
        </Stack>

        <Divider />

        {/* Live fields and one key, rather than a mode. */}
        <FormField labelKey='profile.username'>
          <Input value={username} onChangeText={setUsername} accessibilityLabel={t('profile.username')} autoCapitalize='none' />
        </FormField>

        <FormField labelKey='profile.bio'>
          <Input
            value={bio}
            onChangeText={setBio}
            placeholder={t('profile.bioPlaceholder')}
            accessibilityLabel={t('profile.bio')}
            multiline
          />
        </FormField>

        {problem ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {problem}
          </Typography>
        ) : null}

        {/* Appears when there is something to save, which is also how the
            screen says a field has been touched. */}
        {changed ? (
          <Button loading={saving} onPress={save}>
            {t('profile.save')}
          </Button>
        ) : null}

        <Divider />

        <Typography level='title-md'>{t('subscription.currentPlan')}</Typography>
        {loading ? (
          <Skeleton width='40%' height={20} />
        ) : (
          <Typography level='body-md'>{tier ? t(`subscription.tier.${tier}`, tier) : t('subscription.tier.free')}</Typography>
        )}

        {/* A fact about this account, never an offer about another one. */}
        {meters.map((meter) => (
          <View key={meter.name} style={{ gap: theme.spacing[0.5] }}>
            <Stack direction='row' spacing={1}>
              <Typography level='body-xs' color='text.tertiary' style={{ flex: 1 }}>
                {t(`subscription.usage.${meter.name}`)}
              </Typography>
              <Typography level='body-xs' color='text.secondary'>
                {meter.unlimited ? `${meter.used} / ∞` : `${meter.used} / ${meter.limit}`}
              </Typography>
            </Stack>
            {/* No bar for a limit there is no end to: a full bar would say
                "you have used everything" and an empty one "you have used
                nothing", and both are wrong about infinity. */}
            {meter.unlimited ? null : <Progress value={meter.percent} accessibilityLabel={t(`subscription.usage.${meter.name}`)} />}
          </View>
        ))}

        <Divider />

        <Button variant='secondary' onPress={() => router.push('/settings')}>
          {t('nav.settings')}
        </Button>

        {/* The token is withdrawn BEFORE the session ends: deregistering is an
            authenticated request, so doing it afterwards is a 401 and a row
            left behind that a later push would deliver to the wrong person. */}
        <Button
          variant='tertiary'
          onPress={async () => {
            await unregisterFromPush()
            await logout?.()
          }}
        >
          {t('common.logout')}
        </Button>
      </Stack>
    </Screen>
  )
}

/** One count, under its name. A zero is a fact and is shown (ADR-012 is about
 *  a metric that does not apply, not about one that is genuinely nought). */
function Count({ label, value, loading }) {
  return (
    <Stack spacing={0.5} style={{ flex: 1, minWidth: 0 }}>
      {loading ? <Skeleton width='60%' height={24} /> : <Typography level='title-lg'>{value ?? 0}</Typography>}
      <Typography level='body-xs' color='text.tertiary'>
        {label}
      </Typography>
    </Stack>
  )
}

export default Profile
