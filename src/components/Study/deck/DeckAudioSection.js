import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { FormControl, FormLabel, Option, Radio, RadioGroup, Select, Skeleton, Slider, Stack, Switch, Typography } from '@mui/joy'

import { focusRing, formLabel, touchTarget } from '../../Common/Form/formStyles'

/**
 * Voice settings, per card side (DECKS.md §3.4).
 *
 * The front/back switch used to be two `<Box role='button' aria-pressed>` with
 * no `tabIndex` and no `onKeyDown`: it announced itself to assistive technology
 * as a toggle and could be neither reached nor operated by keyboard, which is
 * worse than an unlabelled div because a screen-reader user is told a control
 * exists and then cannot use it. It is a Joy `RadioGroup` now — focus, Enter,
 * Space and a real accessible name all come free, and none of it is
 * hand-rolled.
 *
 * The sliders carry `aria-valuetext` with the translated unit. Their values
 * used to render only as adjacent `Typography`, which is not announced with
 * the slider, so a screen-reader user heard "1.4" with no idea of what.
 */
const SIDES = ['front', 'back']

const DeckAudioSection = ({ loading, side, onSideChange, voiceSettings, voices, onChange }) => {
  const { t } = useTranslation()
  const autoplayLabelId = `deck-autoplay-${useId()}`
  const current = voiceSettings[side] || {}

  const update = (patch) => onChange({ ...voiceSettings, [side]: { ...current, ...patch } })

  return (
    <Stack gap={2.5}>
      <RadioGroup
        orientation='horizontal'
        value={side}
        onChange={(event) => onSideChange(event.target.value)}
        aria-label={t('deckSettings.audio.sideAria')}
        sx={{ gap: 1, alignSelf: 'flex-start' }}
      >
        {SIDES.map((option) => (
          <Radio
            key={option}
            value={option}
            label={t(`deckSettings.audio.${option}`)}
            size='sm'
            variant={side === option ? 'soft' : 'plain'}
            color={side === option ? 'primary' : 'neutral'}
            disableIcon
            sx={{
              px: 1.5,
              borderRadius: 'sm',
              border: '1px solid',
              borderColor: side === option ? 'primary.outlinedBorder' : 'transparent',
              ...touchTarget,
              ...focusRing
            }}
          />
        ))}
      </RadioGroup>

      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Typography level='body-sm' sx={formLabel} id={autoplayLabelId}>
          {t('deckSettings.audio.autoplay')}
        </Typography>
        {loading ? (
          <Skeleton variant='rectangular' width={32} height={18} sx={{ borderRadius: 'sm' }} />
        ) : (
          <Switch
            size='sm'
            checked={current.auto_play ?? false}
            onChange={(event) => update({ auto_play: event.target.checked })}
            slotProps={{ input: { 'aria-labelledby': autoplayLabelId } }}
            sx={focusRing}
          />
        )}
      </Stack>

      <FormControl>
        <FormLabel sx={formLabel}>{t('deckSettings.audio.voice')}</FormLabel>
        {loading ? (
          <Skeleton variant='rectangular' height={32} sx={{ borderRadius: 'sm' }} />
        ) : (
          <Select
            size='sm'
            value={current.voice_name || ''}
            placeholder={t('deckSettings.audio.systemDefault')}
            onChange={(_, value) =>
              update({ voice_name: value || null, voice_lang: voices.find((voice) => voice.name === value)?.lang || null })
            }
            sx={{ ...touchTarget, ...focusRing }}
          >
            {/* Always present, so a user can get back to no choice at all. */}
            <Option value=''>{t('deckSettings.audio.systemDefault')}</Option>
            {voices.map((voice) => (
              <Option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </Option>
            ))}
          </Select>
        )}
      </FormControl>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        {[
          { field: 'rate', labelKey: 'deckSettings.audio.rate', ariaKey: 'deckSettings.audio.rateAria', min: 0.5 },
          { field: 'pitch', labelKey: 'deckSettings.audio.pitch', ariaKey: 'deckSettings.audio.pitchAria', min: 0 }
        ].map(({ field, labelKey, ariaKey, min }) => {
          const value = current[field] ?? 1.0
          return (
            <FormControl key={field} sx={{ flex: 1 }}>
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 0.5 }}>
                <FormLabel sx={{ ...formLabel, mb: 0 }}>{t(labelKey)}</FormLabel>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  {value}x
                </Typography>
              </Stack>
              {loading ? (
                <Skeleton variant='rectangular' height={20} sx={{ borderRadius: 'sm' }} />
              ) : (
                <Slider
                  size='sm'
                  min={min}
                  max={2}
                  step={0.1}
                  value={value}
                  aria-label={t(labelKey)}
                  aria-valuetext={t(ariaKey, { value })}
                  onChange={(_, next) => update({ [field]: next })}
                  // Joy already reserves 42px for the thumb's touch area; 44 at `xs` per §4.7.
                  sx={{ '--Slider-size': { xs: '44px', sm: '42px' }, ...focusRing }}
                />
              )}
            </FormControl>
          )
        })}
      </Stack>
    </Stack>
  )
}

export default DeckAudioSection
