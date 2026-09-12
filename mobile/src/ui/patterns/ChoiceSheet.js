/**
 * ChoiceRow and ChoiceSheet — the phone's answer to a menu of choices.
 *
 * The web narrows a list with dropdown menus whose labels are their readouts:
 * "Type", "Tags · 2". A phone has nothing to anchor a dropdown to, so the label
 * stays a readout on a chip and the menu becomes a bottom sheet. The calendar,
 * Browse and the book library each made that translation separately and each
 * wrote its own row — three components with the same shape and three different
 * answers to the same accessibility question (MOB-064).
 *
 * **The role decides the state, and the state is not optional.** A tick is a
 * sighted-only signal. `radio` announces `selected`, `checkbox` announces
 * `checked`, and a row that is an action rather than a state — "Clear",
 * "Show all" — announces neither, because "unchecked" is a lie about a button.
 *
 * **A single choice closes the sheet; a multiple choice does not.** Narrowing
 * to two tags is two ticks, and a sheet that shuts after each one makes the
 * user reopen it every time. That rule is the web's own, recorded on its
 * calendar menu, and it is why `ActionSheet` is the wrong component here:
 * that one lists actions and closes on every press.
 */
import { Pressable, ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme'
import { BottomSheet } from '../BottomSheet'
import { Button } from '../Button'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

/** How tall a sheet's list may grow before it scrolls inside itself. */
export const CHOICE_LIST_MAX_HEIGHT = 400

/**
 * One option.
 *
 * @param {'radio'|'checkbox'|'button'} role - what this row IS, which decides
 *   what a screen reader hears. `button` is for a row that acts rather than a
 *   row that holds a state.
 * @param {string} [swatch] - a resolved colour, for an option that has one
 *   (a focus area). Decorative; the label carries the identity.
 */
export function ChoiceRow({ label, chosen = false, onPress, role = 'checkbox', swatch = null, count = null }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'radio' ? { selected: chosen } : role === 'checkbox' ? { checked: chosen } : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: theme.spacing[1],
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? resolveColor(theme, 'background.level2') : 'transparent'
      })}
    >
      {swatch ? (
        <View
          importantForAccessibility='no'
          style={{ width: 10, height: 10, borderRadius: theme.radius.xs, backgroundColor: swatch, flexShrink: 0 }}
        />
      ) : null}
      <Typography level='body-md' color={chosen ? 'text.primary' : 'text.secondary'} style={{ flex: 1 }}>
        {label}
      </Typography>
      {/* A count is a readout beside the option, never part of its name: the
          accessible label is what the option IS. */}
      {count !== null ? (
        <Typography level='body-xs' color='text.tertiary' style={{ fontVariant: ['tabular-nums'] }}>
          {String(count)}
        </Typography>
      ) : null}
      {chosen ? <Icon name='Check' size='sm' color='primary.plainColor' /> : null}
    </Pressable>
  )
}

/**
 * A list of options in a sheet.
 *
 * `options` are `{ value, label, count?, swatch? }`. With `multiple`, `value`
 * is an array and `onChange` receives the next array; without it, `value` is
 * one value, `onChange` receives it, and the sheet closes.
 *
 * `extra` renders under the list — the "Clear", "Show all" and hint rows each
 * sheet needs and none of them needs the same ones.
 */
export function ChoiceSheet({ visible, onClose, title, options = [], value, onChange, multiple = false, extra = null, children = null }) {
  const { t } = useTranslation()

  const chosen = (optionValue) => (multiple ? (value ?? []).includes(optionValue) : value === optionValue)

  const pick = (optionValue) => {
    if (!multiple) {
      onChange?.(optionValue)
      onClose?.()
      return
    }
    const current = value ?? []
    onChange?.(current.includes(optionValue) ? current.filter((item) => item !== optionValue) : [...current, optionValue])
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: CHOICE_LIST_MAX_HEIGHT }}>
        {children}
        {options.map((option) => (
          <ChoiceRow
            key={String(option.value)}
            label={option.label}
            count={option.count ?? null}
            swatch={option.swatch ?? null}
            chosen={chosen(option.value)}
            role={multiple ? 'checkbox' : 'radio'}
            onPress={() => pick(option.value)}
          />
        ))}
        {extra}
      </ScrollView>

      <Button variant='secondary' onPress={onClose} style={{ marginTop: 16 }}>
        {t('common.close')}
      </Button>
    </BottomSheet>
  )
}

export default ChoiceSheet
