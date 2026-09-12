/**
 * Select — a value chosen from a list.
 *
 * **Not `@react-native-picker/picker`, deliberately.** That is a native module,
 * so adding it means another EAS build for a control the design system is very
 * likely to replace with a bottom sheet in MOB-013 anyway. It also renders
 * Android's dated spinner. This is a Pressable that opens React Native's own
 * `Modal` — no native module, no rebuild, and the same interaction the rest of
 * the app will use.
 *
 * Recorded rather than assumed: if the design system later wants the platform
 * picker specifically, this is the file to change and the dependency to add.
 *
 * **Inside a sheet it expands in place instead.** A modal opened from inside a
 * modal does not layer predictably on Android: in the calendar's event form
 * this list came up squeezed against the bottom edge, half behind the sheet it
 * belonged to, and the goal it was asking for could not be read. `useInSheet`
 * is how it knows, so the same control serves both places without the caller
 * choosing.
 */
import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme'
import { Typography, resolveColor } from './Typography'
import { Divider } from './Divider'
import { useInSheet } from './BottomSheet'
import { MIN_TOUCH_TARGET } from './buttonSpec'

export function Select({ value, options, onChange, placeholderKey = null, invalid = false, accessibilityLabel, style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const inSheet = useInSheet()
  const [open, setOpen] = useState(false)

  if (__DEV__ && !accessibilityLabel) {
    throw new Error('Select: accessibilityLabel is required — the trigger shows a value, not what it is for.')
  }

  const selected = options.find((o) => o.value === value)

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: selected?.label }}
        accessibilityState={{ expanded: open }}
        style={[
          {
            minHeight: MIN_TOUCH_TARGET,
            paddingHorizontal: theme.spacing[1.5],
            justifyContent: 'center',
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: resolveColor(theme, invalid ? 'danger.plainColor' : 'neutral.outlinedBorder'),
            backgroundColor: resolveColor(theme, 'background.surface')
          },
          style
        ]}
      >
        <Typography level='body-md' color={selected ? 'text.primary' : 'text.tertiary'} numberOfLines={1}>
          {selected ? selected.label : placeholderKey ? t(placeholderKey) : ''}
        </Typography>
      </Pressable>

      {/* In a sheet: the list is part of the field, under the trigger. */}
      {inSheet && open ? (
        <View
          style={{
            marginTop: 6,
            maxHeight: 220,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: resolveColor(theme, 'neutral.outlinedBorder'),
            backgroundColor: resolveColor(theme, 'background.surface'),
            overflow: 'hidden'
          }}
        >
          <Options options={options} value={value} onChange={onChange} close={() => setOpen(false)} theme={theme} />
        </View>
      ) : null}

      <Modal visible={open && !inSheet} transparent animationType='fade' onRequestClose={() => setOpen(false)}>
        {/* Tapping the scrim dismisses, which is what a back gesture does too. */}
        <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: resolveColor(theme, 'background.popup'),
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              paddingVertical: theme.spacing[1],
              maxHeight: '70%'
            }}
          >
            <Options options={options} value={value} onChange={onChange} close={() => setOpen(false)} theme={theme} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

/** The options themselves, drawn the same way in a sheet and in a modal. */
function Options({ options, value, onChange, close, theme }) {
  return (
    <ScrollView keyboardShouldPersistTaps='handled'>
      {options.map((option, i) => (
        <View key={option.value}>
          {i > 0 ? <Divider /> : null}
          <Pressable
            onPress={() => {
              onChange?.(option.value)
              close()
            }}
            accessibilityRole='menuitem'
            accessibilityState={{ selected: option.value === value }}
            style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: theme.spacing[2], justifyContent: 'center' }}
          >
            <Typography level='body-md' color={option.value === value ? 'primary.plainColor' : 'text.primary'}>
              {option.label}
            </Typography>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}

export default Select
