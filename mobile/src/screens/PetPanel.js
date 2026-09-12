/**
 * The companion, on Home (MOB-050).
 *
 * The web's pet is a floating orb over every page, dragged where you like, with
 * a chat panel behind it. A phone has no room for a thing that floats over the
 * app and no pointer to drag it with, so the companion has a place instead: one
 * object on Home, showing what studying has made of it.
 *
 * **It lives on Home rather than in the Study Center.** The Study Center is
 * built to an approved artboard and this is not on that board; Home's own
 * redesign is recorded as NOT APPROVED (PEND-004), so it is the surface with
 * room to answer a question the boards have not been asked yet.
 *
 * **Naming, and only naming.** The web also picks a species, and its own
 * description says why: species guides the AI PORTRAIT it generates. Portraits
 * are a paid tier, and no mobile screen may advertise one (ADR-030), so
 * offering the picker whose only purpose is that feature would be advertising
 * it sideways. A name is useful to everyone and gated for nobody.
 *
 * **Nothing here is a chat.** The companion's conversation, its quiz mode and
 * its celebrations are the largest single thing in the web client; they are not
 * this task and they are not implied by drawing the pet.
 */
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { usePetState } from '@nowry/core/hooks/usePetState'
import { useAppearance, useTheme } from '../theme'
import { BottomSheet, Button, FormField, Input, PetOrb, Progress, Readout, Sheet, Skeleton, Stack, Typography } from '../ui'

export function PetPanel() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  // The account's colour, already resolved for the whole app — the companion is
  // the colour of the app it lives in, and deriving it a second time here would
  // be a second answer to which colour that is.
  const { accent } = useAppearance()
  const pet = usePetState()
  const [naming, setNaming] = useState(false)

  // A companion the account has never revealed is not drawn at all: the reveal
  // is a moment the web owns, and pre-empting it here would spend it.
  if (!pet.loading && !pet.revealed) return null

  const name = pet.name || t('agent.defaultName')

  return (
    <Sheet padding={2}>
      <Stack direction='row' spacing={2} style={{ alignItems: 'center' }}>
        {pet.loading ? <Skeleton width={64} height={64} radius='lg' /> : <PetOrb stage={pet.stage} accent={accent} />}

        <Stack spacing={1} style={{ flex: 1, minWidth: 0 }}>
          <Typography level='title-md' numberOfLines={1}>
            {name}
          </Typography>
          <Readout>{t('agent.settings.levelLabel', { level: pet.level })}</Readout>

          {/* The bar is the level's progress, which the server computes — the
              phone does not do its own XP arithmetic and cannot disagree. */}
          {pet.levelProgress !== null ? (
            <View>
              <Progress
                value={Math.round(pet.levelProgress * 100)}
                accessibilityLabel={t('agent.settings.levelLabel', { level: pet.level })}
              />
              {pet.xpForNextLevel ? (
                <Typography level='body-xs' color='text.tertiary' style={{ paddingTop: theme.spacing[1] }}>
                  {t('agent.settings.xpToNextLevel', { count: pet.xpForNextLevel })}
                </Typography>
              ) : null}
            </View>
          ) : null}
        </Stack>

        {/*
         * Two controls, two weights. The companion answers now (MOB-085), and
         * that is what it is FOR — so Ask is the object's action and the rename
         * stays the quiet one beside it. Two tertiary links would have said
         * they were peers, which they are not.
         */}
        <Stack spacing={1} style={{ alignItems: 'stretch' }}>
          <Button size='sm' variant='secondary' onPress={() => router.push('/agent')} accessibilityLabel={t('agent.aria.openBuddy')}>
            {t('agent.chat.ask')}
          </Button>
          <Button size='sm' variant='tertiary' onPress={() => setNaming(true)}>
            {t('common.edit')}
          </Button>
        </Stack>
      </Stack>

      <NameSheet open={naming} current={pet.name} onClose={() => setNaming(false)} onSave={pet.save} />
    </Sheet>
  )
}

/** One field, because a name is the only thing this client changes about it. */
function NameSheet({ open, current, onClose, onSave }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    setValue(current ?? '')
    setFailed(false)
  }, [open, current])

  const save = async () => {
    if (saving) return
    setSaving(true)
    setFailed(false)
    try {
      // An emptied field clears the name rather than saving whitespace; the
      // panel falls back to the default, which is what it did before a name.
      await onSave({ pet_name: value.trim() || null })
      onClose?.()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={open} onClose={saving ? () => {} : onClose} title={t('agent.companion.nameTitle')}>
      <Stack spacing={2}>
        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('agent.errors.settingsLoadFailed')}
          </Typography>
        ) : null}

        <Typography level='body-sm' color='text.secondary'>
          {t('agent.companion.nameDescription')}
        </Typography>

        <FormField labelKey='agent.companion.nameLabel'>
          <Input
            value={value}
            onChangeText={setValue}
            accessibilityLabel={t('agent.companion.nameAriaLabel')}
            placeholder={t('agent.companion.namePlaceholder')}
          />
        </FormField>

        <Stack direction='row' spacing={1}>
          <Button variant='tertiary' style={{ flex: 1 }} onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button style={{ flex: 1 }} loading={saving} onPress={save}>
            {t('common.save')}
          </Button>
        </Stack>
      </Stack>
    </BottomSheet>
  )
}

export default PetPanel
