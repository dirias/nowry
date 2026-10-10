/**
 * Rest, offered (SR-003, ADR-043).
 *
 * One sheet for the three grains: a card, a tag, a deck. Awake, it offers
 * "until woken" and three lengths; resting, it offers Wake and the same
 * lengths again, so a rest can be extended without waking first. The words
 * are the PRD's: Rest, Rest until…, Wake — the thing is fine and will be back.
 *
 * `onRest(until)` receives a Date, or null for until woken.
 */
import { useTranslation } from 'react-i18next'
import { REST_PRESETS, untilFromPreset } from '@nowry/core/domain/cardRest'
import { ActionSheet } from '../ActionSheet'

export function RestSheet({ visible, onClose, title, resting = false, onRest, onWake, hint = null }) {
  const { t } = useTranslation()

  const presets = REST_PRESETS.map((preset) => ({
    id: preset.key,
    label: t(`cards.rest.${preset.key}`),
    onPress: () => onRest?.(untilFromPreset(preset.key))
  }))

  const actions = resting ? [{ id: 'wake', label: t('cards.rest.wake'), onPress: () => onWake?.() }, ...presets] : presets

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title={title ?? t('cards.rest.sheetTitle')}
      actions={actions}
      accessibilityLabel={hint ?? title}
    />
  )
}

/**
 * "Resting" or "Resting until Nov 2", from a rest read by `restOf`.
 *
 * @param {(key: string, options?: object) => string} t
 * @param {{ resting: boolean, until: Date | null, indefinite: boolean }} rest
 * @param {string} language - for the date
 */
export const restLabel = (t, rest, language) => {
  if (!rest?.resting) return null
  if (rest.indefinite || !rest.until) return t('cards.rest.resting')
  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(rest.until)
  return t('cards.rest.restingUntil', { date })
}

export default RestSheet
