/**
 * Settings (MOB-025).
 *
 * Three sections, in the order a phone's settings screens usually read:
 * appearance, notifications, then the part that ends the account.
 *
 * **Nothing here sells anything.** ADR-030 keeps subscription purchase off the
 * phone entirely, and the moment a mobile screen advertises a paid tier it
 * becomes a store-billing question. The plan is stated on the profile screen as
 * a fact and nowhere is there a link to buy.
 *
 * **Notification preferences are the OS's, not ours.** A phone already owns the
 * switch, and a second one in the app would be a setting that silently loses to
 * the first. This says what the OS currently allows and opens the page that
 * changes it.
 *
 * Language and accent colour are account preferences and go through
 * `useProgressivePreferences`, which is the same optimistic-with-honest-status
 * writer the web uses: the value on screen is what you chose, and it says so
 * when the server has not acknowledged it.
 */
import { useState } from 'react'
import { Alert, Linking, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@nowry/core/context/AuthContext'
import useProgressivePreferences, { PREFERENCE_FIELD } from '@nowry/core/hooks/useProgressivePreferences'
import { userService } from '@nowry/core/api/services'
import { requestNotificationPermission } from '../platform/alerts'
import { useAppearance, MODES } from '../theme/AppearanceProvider'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { Button, Divider, FormField, Icon, Input, Screen, Segmented, Select, Stack, Typography } from '../ui'
import { CompanionSettings } from './CompanionSettings'

/** The five bundles that ship. Each label is in its own language, on purpose. */
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' }
]

/**
 * Accent presets. The web offers a full colour input; a phone has no equivalent
 * without a picker dependency, and a grid of choices is the better control on a
 * touch screen anyway. A colour set on the web that is not one of these is
 * still shown, still selected and still preserved — see `swatches`.
 */
const PRESET_ACCENTS = ['#2a6971', '#3b5bdb', '#7048e8', '#c2255c', '#e8590c', '#2b8a3e']

const SWATCH = 32
const MIN_TOUCH = 44

/**
 * One accent choice.
 *
 * Not a `Chip`: a chip paints its own ground, which is the one thing a swatch
 * must not do. And selection is a mark on the colour, never the colour alone —
 * a ring of hue around a square of hue is invisible to a viewer who cannot
 * distinguish the two, so the chosen one carries a tick in whichever of black
 * or white is legible on it.
 */
function Swatch({ hex, selected, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: SWATCH,
          height: SWATCH,
          borderRadius: SWATCH / 2,
          backgroundColor: hex,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {selected ? <Icon name='Check' size='sm' literalColor={readableTextOn(hex)} /> : null}
      </View>
    </Pressable>
  )
}

export function Settings() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { user, logout } = useAuth()
  const appearance = useAppearance()
  const prefs = useProgressivePreferences()

  const [deleting, setDeleting] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [permission, setPermission] = useState(null)

  const language = prefs.values[PREFERENCE_FIELD.LANGUAGE] || i18n.language
  const accent = appearance.accent

  const chooseLanguage = (code) => {
    // The bundle switches now; the account catches up. A language change that
    // waited on the network would leave the user reading the wrong language
    // until it landed.
    i18n.changeLanguage(code)
    prefs.setLanguage(code)
  }

  const chooseAccent = (hex) => {
    appearance.setAccent(hex)
    prefs.setAccentColor(hex)
  }

  const swatches = PRESET_ACCENTS.includes(accent) ? PRESET_ACCENTS : [accent, ...PRESET_ACCENTS]

  /**
   * Two confirmations, as the store guidelines require and as the consequence
   * deserves: the typed email, then the platform alert. Neither alone is a
   * decision — one is a form and one is a reflex.
   */
  const confirmDelete = () => {
    setDeleteError(null)
    if (!confirmEmail.trim()) {
      setEmailError('settings.deleteAccount.emailRequired')
      return
    }
    if (confirmEmail.trim().toLowerCase() !== String(user?.email ?? '').toLowerCase()) {
      setEmailError('settings.deleteAccount.emailMismatch')
      return
    }
    setEmailError(null)

    Alert.alert(t('settings.deleteAccount.title'), t('settings.deleteAccount.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccount.confirmEnabled'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await userService.deleteAccount()
            await logout?.()
            router.replace('/')
          } catch {
            setDeleteError('settings.errors.networkError')
          } finally {
            setDeleting(false)
          }
        }
      }
    ])
  }

  return (
    <Screen>
      <Stack spacing={3}>
        <Typography level='h4'>{t('settings.title')}</Typography>

        <Typography level='title-md'>{t('settings.appearance.title')}</Typography>

        <FormField labelKey='settings.appearance.mode' helperKey='settings.appearance.modeDesc'>
          <Segmented
            accessibilityLabel={t('settings.appearance.mode')}
            value={appearance.mode}
            onChange={appearance.setMode}
            options={MODES.map((value) => ({ value, label: t(`settings.appearance.modes.${value}`) }))}
          />
        </FormField>

        <FormField labelKey='settings.appearance.language'>
          <Select
            accessibilityLabel={t('settings.appearance.language')}
            value={language}
            onChange={chooseLanguage}
            options={LANGUAGES.map(({ code, label }) => ({ value: code, label }))}
          />
        </FormField>

        <FormField labelKey='settings.appearance.accentColor' helperKey='settings.appearance.accentColorDesc'>
          <Stack direction='row' spacing={1}>
            {swatches.map((hex) => (
              <Swatch
                key={hex}
                hex={hex}
                selected={hex === accent}
                onPress={() => chooseAccent(hex)}
                label={`${t('settings.appearance.accentColor')} ${hex}`}
              />
            ))}
          </Stack>
        </FormField>

        {prefs.hasUnsavedChanges ? (
          <Typography level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite'>
            {t('onboarding.save.unsaved')}
          </Typography>
        ) : null}

        <Divider />

        {/* The companion's readouts and its name, where the web keeps them
            (MOB-089). They were a panel on Home; the web's Home has none. */}
        <CompanionSettings />

        <Divider />

        <Typography level='title-md'>{t('settings.notifications.title')}</Typography>
        <Typography level='body-sm' color='text.secondary'>
          {t(permission === 'granted' ? 'settings.notifications.allowed' : 'settings.notifications.blocked')}
        </Typography>
        {/* Two peers at one weight. A boxed key beside a bare text link says
            one of them is the real action and the other is an aside, and here
            the "aside" is the only thing that can actually change a denied
            permission (MOB-065). */}
        <Stack direction='row' spacing={1}>
          <Button size='sm' variant='secondary' onPress={async () => setPermission(await requestNotificationPermission())}>
            {t('settings.notifications.check')}
          </Button>
          <Button size='sm' variant='secondary' onPress={() => Linking.openSettings()}>
            {t('settings.notifications.openSystem')}
          </Button>
        </Stack>

        <Divider />

        <Typography level='title-md' color='danger.plainColor'>
          {t('settings.dangerZone.title')}
        </Typography>
        <Typography level='body-sm' color='text.secondary'>
          {t('settings.dangerZone.description')}
        </Typography>
        <Typography level='body-xs' color='text.tertiary'>
          {t('settings.deleteAccount.recoveryNotice')}
        </Typography>

        <FormField labelKey='settings.deleteAccount.emailLabel' errorKey={emailError}>
          <Input
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder={t('settings.deleteAccount.emailPlaceholder')}
            accessibilityLabel={t('settings.deleteAccount.emailLabel')}
            invalid={Boolean(emailError)}
            keyboardType='email-address'
            autoCapitalize='none'
          />
        </FormField>

        {deleteError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t(deleteError)}
          </Typography>
        ) : null}

        <Button variant='danger' onPress={confirmDelete} loading={deleting}>
          {t('settings.dangerZone.deleteButton')}
        </Button>
      </Stack>
    </Screen>
  )
}

export default Settings
