/**
 * The companion's settings, at `/settings/companion` (MOB-091).
 *
 * The web serves this at `/settings/agent` as three tabs — Personality,
 * Companion, Interventions — and this client had one control from one of them:
 * the rename. Everything else was readable-and-uneditable, which for the five
 * intervention switches was worse than absent: MOB-088 taught the phone to
 * HONOUR them a day before this, so a learner could be governed by settings
 * their phone gave them no way to see, let alone change.
 *
 * **A page, not tabs.** Three tabs inside a pushed settings screen is a web
 * habit: on a browser the tabs keep a long page from scrolling, and on a phone
 * scrolling is free while a tab bar inside a pushed screen competes with the
 * one at the foot of the app. So this is one column with three headings, which
 * is what both platforms' own settings apps are made of.
 *
 * **Switches, not checkboxes.** A checkbox says "one of several you are
 * selecting, and you will confirm"; a switch says "on or off, and it takes
 * effect now". Every boolean here is the second, so `Switch` is the platform's
 * own control and the whole row is its target — a 51pt switch at the right edge
 * is a small thing a long way from where the eye is reading.
 *
 * **Every write is one field.** `PUT /users/preferences/general` is a partial
 * update driven by `model_fields_set`, so twelve independent controls can each
 * send themselves and two saved a second apart cannot overwrite each other.
 * The keys are `agentPrefs` in the shared package rather than spelled out at
 * each control, because twelve literal key names is twelve chances to misspell
 * one and no way to find out except by changing a setting and watching it not
 * stick.
 *
 * **What is absent, and why** (ADR-030): the custom personality, the AI
 * portrait and the animation are paid features and no screen here may name one.
 * Roaming is a pointer's affordance with nothing to drag on a phone. The quiz
 * question count belongs to a quiz this client does not have.
 */
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePetState } from '@nowry/core/hooks/usePetState'
import { useGeneralPreferences } from '@nowry/core/hooks/useGeneralPreferences'
import {
  AGENT_PREFS,
  CONCISENESS,
  FREQUENCY,
  INTERVENTION_TYPES,
  TONE,
  agentPref,
  interventionEnabled,
  interventionKey,
  knowledgeAccessPatch
} from '@nowry/core/domain/agentPrefs'
import { SPECIES_MOTION } from '@nowry/core/domain/petMotion'
import { useAppearance, useTheme } from '../theme'
import {
  BottomSheet,
  Button,
  Chip,
  Divider,
  FormField,
  Input,
  PetOrb,
  Progress,
  Radio,
  Readout,
  Screen,
  SettingRow,
  Skeleton,
  Stack,
  Switch,
  Typography
} from '../ui'

/** camelCase, because that is how the strings are keyed. */
const stringKey = (type) => type.replace(/_(.)/g, (_, letter) => letter.toUpperCase())

export function CompanionSettings() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { accent } = useAppearance()
  const pet = usePetState()
  const { preferences, loading, save } = useGeneralPreferences()
  const [naming, setNaming] = useState(false)
  const [failed, setFailed] = useState(false)

  /*
   * One line for every failed write, rather than one per control. A failure
   * here is the same failure whichever switch caused it — the write did not
   * reach the server — and the control has already snapped back to say so.
   */
  const write = async (patch) => setFailed(!(await save(patch)))

  const name = pet.name || t('agent.defaultName')
  const knowledge = agentPref(preferences, 'knowledgeAccess')

  return (
    <Screen>
      <Stack spacing={3}>
        <Typography level='h4'>{t('agent.tabs.companion')}</Typography>

        {/* Who it is: the portrait, the name and how far it has come. The web
            draws the same three at the head of its Companion tab. */}
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

        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('agent.settings.interventions.saveError')}
          </Typography>
        ) : null}

        {/*
         * Species, which this client refused to offer until now — MOB-050 cut
         * it because the web's own description says species guides the AI
         * PORTRAIT, and offering the picker for a paid feature's sake would be
         * advertising it sideways (ADR-030). MOB-090 gave species a second job
         * that costs nothing: it is the GAIT, so every account can see what it
         * chose. The description says that rather than the other thing.
         */}
        <Stack spacing={1}>
          <Typography level='title-md'>{t('agent.companion.speciesTitle')}</Typography>
          <Typography level='body-sm' color='text.secondary'>
            {t('agent.companion.speciesMovement')}
          </Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap'>
            {Object.keys(SPECIES_MOTION).map((species) => (
              <Chip
                key={species}
                selected={pet.species === species}
                onPress={() => pet.save({ pet_species: species }).catch(() => setFailed(true))}
              >
                {t(`agent.companion.species.${species}`)}
              </Chip>
            ))}
          </Stack>
        </Stack>

        <Divider />

        <Typography level='title-md'>{t('agent.tabs.personality')}</Typography>

        {/* The one switch that is not a preference: it lives on the pet rather
            than on the account, so it writes where the pet does. */}
        <SettingRow
          label={t('agent.settings.activation.label')}
          description={t('agent.settings.activation.description')}
          value={pet.active}
          onPress={() => pet.save({ pet_active: !pet.active }).catch(() => setFailed(true))}
        >
          <Switch value={pet.active} />
        </SettingRow>

        <OptionList
          title={t('agent.settings.personality.replyLength.title')}
          description={t('agent.settings.personality.replyLength.desc')}
          options={CONCISENESS.map((value) => ({
            value,
            label: t(`agent.settings.personality.conciseness.${value}.label`),
            description: t(`agent.settings.personality.conciseness.${value}.description`)
          }))}
          value={agentPref(preferences, 'conciseness')}
          loading={loading}
          onChange={(value) => write({ [AGENT_PREFS.conciseness.key]: value })}
        />

        <OptionList
          title={t('agent.settings.personality.tone.title')}
          description={t('agent.settings.personality.tone.desc')}
          options={TONE.map((value) => ({
            value,
            label: t(`agent.settings.personality.toneOptions.${value}.label`),
            description: t(`agent.settings.personality.toneOptions.${value}.description`)
          }))}
          value={agentPref(preferences, 'tone')}
          loading={loading}
          onChange={(value) => write({ [AGENT_PREFS.tone.key]: value })}
        />

        <Typography level='title-sm'>{t('agent.settings.personality.knowledge.title')}</Typography>

        <SettingRow
          label={t('agent.settings.personality.knowledge.libraryToggleLabel')}
          description={t('agent.settings.personality.knowledge.libraryToggleDesc')}
          value={knowledge}
          onPress={() => write(knowledgeAccessPatch(!knowledge))}
        >
          <Switch value={knowledge} />
        </SettingRow>

        {/* The nudge is the companion noticing something in your library and
            saying so, so it cannot be on while the thing it notices is
            unreadable. Disabled rather than hidden, so the dependency is
            visible instead of being a control that comes and goes. */}
        <SettingRow
          label={t('agent.settings.personality.knowledge.nudgesLabel')}
          description={
            knowledge
              ? t('agent.settings.personality.knowledge.nudgesDesc')
              : t('agent.settings.personality.knowledge.nudgesRequires').trim()
          }
          value={agentPref(preferences, 'proactiveNudging')}
          disabled={!knowledge}
          onPress={() => write({ [AGENT_PREFS.proactiveNudging.key]: !agentPref(preferences, 'proactiveNudging') })}
        >
          <Switch value={agentPref(preferences, 'proactiveNudging')} disabled={!knowledge} />
        </SettingRow>

        <Divider />

        <Typography level='title-md'>{t('agent.tabs.interventions')}</Typography>

        <OptionList
          title={t('agent.settings.interventions.frequency.sectionTitle')}
          description={t('agent.settings.interventions.frequency.sectionDesc')}
          options={FREQUENCY.map((value) => ({
            value,
            label: t(`agent.settings.interventions.frequency.${value}`),
            description: t(`agent.settings.interventions.frequency.${value}Desc`)
          }))}
          value={agentPref(preferences, 'interventionFrequency')}
          loading={loading}
          onChange={(value) => write({ [AGENT_PREFS.interventionFrequency.key]: value })}
        />

        <SettingRow
          label={t('agent.settings.interventions.focusMode.label')}
          description={t('agent.settings.interventions.focusMode.desc')}
          value={agentPref(preferences, 'focusMode')}
          onPress={() => write({ [AGENT_PREFS.focusMode.key]: !agentPref(preferences, 'focusMode') })}
        >
          <Switch value={agentPref(preferences, 'focusMode')} />
        </SettingRow>

        <Stack spacing={1}>
          <Typography level='title-sm'>{t('agent.settings.interventions.types.sectionTitle')}</Typography>
          <Typography level='body-sm' color='text.secondary'>
            {t('agent.settings.interventions.types.sectionDesc')}
          </Typography>

          {INTERVENTION_TYPES.map((type) => {
            const on = interventionEnabled(preferences, type)
            return (
              <SettingRow
                key={type}
                label={t(`agent.settings.interventions.types.${stringKey(type)}`)}
                description={t(`agent.settings.interventions.types.${stringKey(type)}Desc`)}
                value={on}
                onPress={() => write({ [interventionKey(type)]: !on })}
              >
                <Switch value={on} />
              </SettingRow>
            )
          })}
        </Stack>

        <NameSheet open={naming} current={pet.name} onClose={() => setNaming(false)} onSave={pet.save} />
      </Stack>
    </Screen>
  )
}

/**
 * One of several, each with a sentence saying what it does.
 *
 * Radio rows rather than a segmented control or a select, because every one of
 * these options needs its description: "Conservative" and "Balanced" are not
 * self-explanatory, and the web gives each a paragraph. A segmented control has
 * room for a word, and a select hides the descriptions behind a tap.
 */
function OptionList({ title, description, options, value, loading, onChange }) {
  return (
    <Stack spacing={1}>
      <Typography level='title-sm'>{title}</Typography>
      <Typography level='body-sm' color='text.secondary'>
        {description}
      </Typography>

      {options.map((option) => (
        <Radio
          key={option.value}
          round
          checked={value === option.value}
          disabled={loading}
          onPress={() => onChange(option.value)}
          label={
            <Stack spacing={0.5} style={{ flex: 1, minWidth: 0 }}>
              <Typography level='body-md'>{option.label}</Typography>
              <Typography level='body-xs' color='text.tertiary'>
                {option.description}
              </Typography>
            </Stack>
          }
          accessibilityLabel={option.label}
        />
      ))}
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
