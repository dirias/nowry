/**
 * The companion, in Settings (MOB-089).
 *
 * This is what MOB-050's panel on Home actually held: the name, the level, the
 * bar and the XP to the next one. None of it is on the web's Home either — the
 * web keeps all four on its agent settings page and puts nothing but a floating
 * portrait in front of the reader. So it moved here, which is the same page by
 * another name, and Home got the column back.
 *
 * **Naming, and only naming** (ADR-030). The web also picks a species, and its
 * own description says why: species guides the AI PORTRAIT it generates.
 * Portraits are a paid tier and no screen here may advertise one, so offering
 * the picker whose only purpose is that feature would be advertising it
 * sideways. A name is useful to everyone and gated for nobody.
 */
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePetState } from '@nowry/core/hooks/usePetState'
import { useAppearance, useTheme } from '../theme'
import { BottomSheet, Button, FormField, Input, PetOrb, Progress, Readout, Skeleton, Stack, Typography } from '../ui'

export function CompanionSettings() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { accent } = useAppearance()
  const pet = usePetState()
  const [naming, setNaming] = useState(false)

  // A companion the account has never revealed is not drawn at all: the reveal
  // is a moment the web owns, and pre-empting it here would spend it.
  if (!pet.loading && !pet.revealed) return null

  const name = pet.name || t('agent.defaultName')

  return (
    <Stack spacing={2}>
      <Typography level='title-md'>{t('agent.tabs.companion')}</Typography>

      <Stack direction='row' spacing={2} style={{ alignItems: 'center' }}>
        {pet.loading ? (
          <Skeleton width={64} height={64} radius='lg' />
        ) : (
          <PetOrb
            stage={pet.stage}
            accent={accent}
            avatarUrl={pet.avatarUrl}
            isDefaultCompanion={pet.isDefaultCompanion}
            species={pet.species}
            mood={pet.mood}
          />
        )}

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

        <Button size='sm' variant='secondary' onPress={() => setNaming(true)}>
          {t('common.edit')}
        </Button>
      </Stack>

      <NameSheet open={naming} current={pet.name} onClose={() => setNaming(false)} onSave={pet.save} />
    </Stack>
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

export default CompanionSettings
