import React, { useId } from 'react'
import { Box, Button, Stack, Typography } from '@mui/joy'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useTranslation } from 'react-i18next'

import { TOPICS, MAX_TOPICS, derivePrimaryTopic } from '../../constants/learningTaxonomy'
import { optionBase, selectedOption, unselectedOption, blockedOption, visuallyHidden } from './taxonomySelectorStyles'

/**
 * TopicSelector — the one ordered topic picker, shared by the onboarding
 * Personalization screen (ONB-010) and Account Settings (ONB-013).
 *
 * Controlled and presentational: ordered values in, ordered values out. It does
 * not fetch, persist, or lay out a screen — that is deliberately the caller's
 * job, because the two consumers save on very different schedules.
 *
 * Order is the product feature, not an implementation detail. `value[0]` is the
 * primary topic (FR-018) and there is no separate primary control (FR-019), so
 * every mutation below is written to keep the array's meaning intact:
 *
 *   • removing an entry preserves the relative order of the rest, which is what
 *     promotes `value[1]` to primary;
 *   • re-selecting an entry appends it to the end rather than restoring its old
 *     slot — the user's most recent intent is the newest, not the oldest.
 *
 * The taxonomy itself is read-only from `constants/learningTaxonomy`. A second
 * copy of these fourteen values is precisely the bug Phase 1 removed.
 *
 * @param {object}                     props
 * @param {string[]}                   props.value          Ordered selected topic values; `value[0]` is primary.
 * @param {(next: string[]) => void}   props.onChange       Receives the full next ordered array.
 * @param {number}                     [props.maxTopics]    Selection cap; defaults to the canonical `MAX_TOPICS`.
 * @param {boolean}                    [props.disabled]     Disables the whole group (e.g. while a save is in flight).
 * @param {string}                     [props.label]        Group label; defaults to the shared localized string.
 * @param {string}                     [props.hint]         Guidance under the label; defaults to the shared localized string.
 * @param {(value: string) => void}    [props.onLimitReached] Called when a blocked option is activated at the cap.
 */
const EMPTY = []

const TopicSelector = ({
  value = EMPTY,
  onChange,
  maxTopics = MAX_TOPICS,
  disabled = false,
  label,
  hint,
  onLimitReached
}) => {
  const { t } = useTranslation()
  const baseId = useId()
  const labelId = `${baseId}-label`
  const hintId = `${baseId}-hint`
  const limitId = `${baseId}-limit`

  const selected = Array.isArray(value) ? value : EMPTY
  const atMax = selected.length >= maxTopics
  const primaryValue = derivePrimaryTopic(selected)
  const primaryTopic = TOPICS.find((topic) => topic.value === primaryValue)

  const toggle = (topicValue) => {
    if (disabled) return
    if (selected.includes(topicValue)) {
      // Removal keeps the survivors in their existing order, so the next entry
      // inherits the primary slot without any extra bookkeeping.
      onChange(selected.filter((entry) => entry !== topicValue))
      return
    }
    if (atMax) {
      // FR-017: a refused tap must say why. The reason is already on screen and
      // wired to this control through `aria-describedby`; the callback exists so
      // a caller can add its own emphasis without this component owning a toast.
      onLimitReached?.(topicValue)
      return
    }
    onChange([...selected, topicValue])
  }

  return (
    <Box>
      <Typography id={labelId} level='title-sm'>
        {label ?? t('taxonomy.selector.topics.label')}
      </Typography>
      <Typography id={hintId} level='body-sm' sx={{ mt: 0.5, color: 'text.tertiary' }}>
        {hint ?? t('taxonomy.selector.topics.hint', { max: maxTopics })}
      </Typography>

      <Box
        role='group'
        aria-labelledby={labelId}
        aria-describedby={hintId}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}
      >
        {TOPICS.map((topic) => {
          const position = selected.indexOf(topic.value) + 1
          const isSelected = position > 0
          const isPrimary = position === 1
          const isBlocked = !isSelected && atMax

          return (
            <Button
              key={topic.value}
              type='button'
              variant='outlined'
              color='neutral'
              disabled={disabled}
              aria-pressed={isSelected}
              aria-disabled={isBlocked || undefined}
              aria-describedby={isBlocked ? limitId : undefined}
              onClick={() => toggle(topic.value)}
              startDecorator={
                isSelected
                  ? <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'text.primary' }} />
                  : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />
              }
              endDecorator={isSelected ? <OrdinalBadge position={position} isPrimary={isPrimary} /> : null}
              sx={(theme) => ({
                ...optionBase,
                ...(isSelected ? selectedOption(theme) : isBlocked ? blockedOption : unselectedOption)
              })}
            >
              {t(topic.i18nKey)}
              <Box component='span' sx={visuallyHidden}>
                {isSelected
                  ? t(isPrimary ? 'taxonomy.selector.topics.srPrimary' : 'taxonomy.selector.topics.srSelected', {
                    position,
                    total: selected.length
                  })
                  : isBlocked
                    ? t('taxonomy.selector.topics.srBlocked', { max: maxTopics })
                    : ''}
              </Box>
            </Button>
          )
        })}
      </Box>

      {/*
        One polite region, not three. The counter, the current primary and the
        limit all change on the same keystroke, so separate live regions would
        queue three announcements for one action (NFR-005).
      */}
      <Stack role='status' aria-live='polite' spacing={0.5} sx={{ mt: 1.5 }}>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('taxonomy.selector.topics.counter', { selected: selected.length, max: maxTopics })}
        </Typography>

        {/* Position is the only primary-topic control there is, so it is stated
            in words as well as by the filled "1" badge. */}
        {!!primaryTopic && (
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('taxonomy.selector.topics.primaryStatus', { topic: t(primaryTopic.i18nKey) })}
          </Typography>
        )}

        {atMax && (
          <Stack id={limitId} direction='row' spacing={0.75} alignItems='flex-start'>
            <InfoOutlinedIcon sx={{ fontSize: 16, mt: '2px', color: 'text.primary', flexShrink: 0 }} />
            <Typography level='body-sm' sx={{ color: 'text.primary' }}>
              {t('taxonomy.selector.topics.limitReached', { max: maxTopics })}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

/**
 * The selection-order marker. The numeral carries the position; filling the
 * badge marks position 1 as primary. Both are shape and luminance rather than
 * hue, so they survive grayscale, dark mode and any accent preset.
 *
 * `aria-hidden` because the same facts reach assistive technology through the
 * button's own accessible name — announcing them twice is worse than once.
 */
const OrdinalBadge = ({ position, isPrimary }) => (
  <Box
    aria-hidden='true'
    sx={{
      minWidth: 20,
      height: 20,
      px: 0.5,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      border: '1px solid',
      borderColor: 'text.primary',
      bgcolor: isPrimary ? 'text.primary' : 'transparent'
    }}
  >
    <Typography
      level='body-xs'
      sx={{ fontWeight: 600, lineHeight: 1, color: isPrimary ? 'background.surface' : 'text.primary' }}
    >
      {position}
    </Typography>
  </Box>
)

export default TopicSelector
