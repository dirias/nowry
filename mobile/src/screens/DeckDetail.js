/**
 * Deck detail and settings (MOB-021).
 *
 * The web splits this across a row menu and a settings modal with four
 * sections. On a phone it is one screen: identity, then study pace, then audio.
 * There is no modal because there is nothing to put it over — the screen IS the
 * deck. Publishing is the one web section left out; it is its own sheet there
 * and is not in the v1 scope here.
 *
 * Everything is the shared `useDeckSettings`, including the debounced
 * per-section saving, so the payload shape the server sees is the payload the
 * web sends. What this file adds is the phone's answers to two things that hook
 * cannot supply: the voice list, which comes from the client (MOB-004), and a
 * destructive confirmation.
 *
 * **Archive confirms with the platform alert.** A destructive action deserves
 * the dialog the OS trains people to read, and `Alert` is accessible, modal and
 * cancel-by-default without any of our own code. Our BottomSheet is for
 * choices; this is a stop.
 *
 * **Leaving the screen flushes.** Every field autosaves on a debounce, so a
 * rename typed and immediately backed out of would otherwise be lost with the
 * timer. `close()` is the hook's flush, and it runs on unmount.
 */
import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import useDeckSettings, { PACE_DEFAULTS } from '@nowry/core/hooks/useDeckSettings'
import { decksService } from '@nowry/core/api/services'
import { subscribeToDeviceVoices } from '../platform/voices'
import { useTheme } from '../theme'
import { Button, Checkbox, Divider, FormField, Input, Readout, Screen, Segmented, Select, Skeleton, Stack, Typography } from '../ui'

const PACE_MODES = Object.keys(PACE_DEFAULTS)

/** The two numbers a pace mode presets, and that either mode or hand can set. */
const LIMITS = [
  { field: 'new_per_day', labelKey: 'deckSettings.study.newPerDay' },
  { field: 'max_reviews_per_day', labelKey: 'deckSettings.study.maxReviews' }
]

export function DeckDetail() {
  const { deckId } = useLocalSearchParams()
  const { t } = useTranslation()
  const router = useRouter()
  const theme = useTheme()
  const [archiving, setArchiving] = useState(false)

  const settings = useDeckSettings({
    open: true,
    deckId: String(deckId),
    subscribeToVoices: subscribeToDeviceVoices
  })

  const {
    loading,
    deck,
    identity,
    identityError,
    setIdentityField,
    config,
    voiceSettings,
    availableVoices,
    audioSide,
    setAudioSide,
    saveConfig,
    saveVoice,
    saveError,
    close
  } = settings

  useEffect(() => close, [close])

  /*
   * Archive, not delete (ADR-023): a deck is put in a state, its history is
   * kept, and it leaves the default list. The confirmation says that, because
   * "Archive" alone reads like a synonym for delete to most people.
   */
  const confirmArchive = () => {
    Alert.alert(t('cards.deck.archive'), t('study.deck.historyKept'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('cards.deck.archive'),
        style: 'destructive',
        onPress: async () => {
          setArchiving(true)
          try {
            await decksService.archive(String(deckId))
            router.replace('/study')
          } catch {
            Alert.alert(t('cards.archived.archiveError'))
          } finally {
            setArchiving(false)
          }
        }
      }
    ])
  }

  if (loading) {
    return (
      <Screen>
        <Stack spacing={2}>
          <Skeleton width='60%' height={28} />
          <Skeleton width='100%' height={44} />
          <Skeleton width='100%' height={44} />
        </Stack>
      </Screen>
    )
  }

  const side = voiceSettings?.[audioSide] || {}
  /* Spread `side` first: rate and pitch are set on the web and must survive a
   * screen that has no control for them. */
  const updateVoice = (patch) => saveVoice({ ...voiceSettings, [audioSide]: { ...side, ...patch } })

  return (
    <Screen>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography level='h4'>{identity?.name || deck?.name || ''}</Typography>
          <Stack direction='row' spacing={2}>
            <Readout leading>{`${deck?.card_count ?? 0} ${t('study.stats.cards')}`}</Readout>
            {deck?.due_count ? <Readout>{t('study.dueCount', { count: deck.due_count })}</Readout> : null}
          </Stack>
        </Stack>

        {/* The deck's one action, and the only solid button on the screen.
            Everything below it is settings; this is what a deck is for. */}
        <Button
          size='lg'
          onPress={() => router.push(`/study/${String(deckId)}`)}
          accessibilityLabel={t('study.deckPill.ariaLabel', { name: identity?.name || deck?.name || '' })}
        >
          {t('study.deck.study')}
        </Button>

        <Button size='md' variant='secondary' onPress={() => router.push(`/study/card/new?deckId=${String(deckId)}`)}>
          {t('cards.deck.addCard')}
        </Button>

        <Divider />

        <Typography level='title-md'>{t('deckSettings.nav.identity')}</Typography>

        {/* `setIdentityField` queues the save itself — there is no Save button
            and no onBlur, because a rename must land whether or not the field
            is ever left. */}
        <FormField labelKey='deckSettings.identity.name' errorKey={identityError}>
          <Input
            value={identity?.name ?? ''}
            onChangeText={(v) => setIdentityField('name', v)}
            accessibilityLabel={t('deckSettings.identity.name')}
            invalid={Boolean(identityError)}
            returnKeyType='done'
          />
        </FormField>

        <FormField labelKey='deckSettings.identity.description'>
          <Input
            value={identity?.description ?? ''}
            onChangeText={(v) => setIdentityField('description', v)}
            accessibilityLabel={t('deckSettings.identity.description')}
            multiline
          />
        </FormField>

        <Divider />

        <Typography level='title-md'>{t('deckSettings.nav.study')}</Typography>

        <FormField labelKey='deckSettings.study.paceMode' helperKey={`deckSettings.pace.${config?.pace_mode ?? 'balanced'}Hint`}>
          <Segmented
            accessibilityLabel={t('deckSettings.study.paceMode')}
            value={config?.pace_mode}
            // A mode is a preset, so choosing one writes the two numbers below
            // it. They stay editable: the mode is a starting point, not a lock.
            onChange={(mode) => saveConfig({ ...config, pace_mode: mode, ...PACE_DEFAULTS[mode] })}
            options={PACE_MODES.map((mode) => ({ value: mode, label: t(`deckSettings.pace.${mode}`) }))}
          />
        </FormField>

        {LIMITS.map(({ field, labelKey }) => (
          <FormField key={field} labelKey={labelKey}>
            <Input
              value={String(config?.[field] ?? '')}
              onChangeText={(raw) => saveConfig({ ...config, [field]: Math.max(0, parseInt(raw, 10) || 0) })}
              accessibilityLabel={t(labelKey)}
              keyboardType='number-pad'
              returnKeyType='done'
            />
          </FormField>
        ))}

        <Divider />

        <Typography level='title-md'>{t('deckSettings.nav.audio')}</Typography>

        {/* Which side the voice settings below apply to. */}
        <Segmented
          accessibilityLabel={t('deckSettings.audio.sideAria')}
          value={audioSide}
          onChange={setAudioSide}
          options={[
            { value: 'front', label: t('deckSettings.audio.front') },
            { value: 'back', label: t('deckSettings.audio.back') }
          ]}
        />

        <Checkbox
          checked={side.auto_play ?? false}
          onPress={() => updateVoice({ auto_play: !(side.auto_play ?? false) })}
          label={t('deckSettings.audio.autoplay')}
        />

        <FormField labelKey='deckSettings.audio.voice'>
          <Select
            accessibilityLabel={t('deckSettings.audio.voice')}
            value={side.voice_name ?? ''}
            onChange={(name) =>
              updateVoice({
                voice_name: name || null,
                voice_lang: availableVoices.find((v) => v.name === name)?.lang || null
              })
            }
            placeholderKey='deckSettings.audio.systemDefault'
            options={[
              { value: '', label: t('deckSettings.audio.systemDefault') },
              // A name chosen on the web must survive being opened here.
              ...(side.voice_name && !availableVoices.some((v) => v.name === side.voice_name)
                ? [{ value: side.voice_name, label: side.voice_name }]
                : []),
              ...availableVoices.map((v) => ({ value: v.name, label: `${v.name} · ${v.lang}` }))
            ]}
          />
        </FormField>

        {saveError ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('deckSettings.saveFailed')}
          </Typography>
        ) : null}

        <View style={{ height: theme.spacing[2] }} />
        <Divider />

        <Button variant='danger' onPress={confirmArchive} loading={archiving} accessibilityLabel={t('cards.deck.archive')}>
          {t('cards.deck.archive')}
        </Button>
      </Stack>
    </Screen>
  )
}

export default DeckDetail
