/**
 * FullSheet — a form that takes the screen (PLAN-012, ADR-046 §4).
 *
 * A bottom sheet is for a decision of up to three fields; a form of more than
 * that, rising to ninety percent of the screen with dead space under it, is
 * neither a sheet nor a screen. This is the screen: a header that says what
 * is being made and offers the way out, a body that scrolls, and the keys
 * pinned above the home indicator — above the keyboard when it is up, so the
 * primary is never behind it (the bottom sheet's own lesson, MOB-052/073).
 *
 * The same three ways out as the bottom sheet, minus the drag: the close key,
 * the back gesture through `onRequestClose`, and nothing else — a full-screen
 * form has no scrim to tap. `accessibilityViewIsModal` traps the screen reader
 * inside it. Under reduced motion it appears rather than slides (MOTION.md §4).
 */
import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useTheme, useReduceMotion } from '../theme'
import { Typography, resolveColor } from './Typography'
import { IconButton } from './IconButton'
import { Icon } from './icons'
import { InSheet } from './BottomSheet'
import { useKeyboardHeight } from './useKeyboardHeight'

export function FullSheet({ visible, onClose, title, readout = null, footer = null, children, accessibilityLabel }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const insets = useSafeAreaInsets()
  const keyboard = useKeyboardHeight()

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <View
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel ?? title}
        style={{ flex: 1, backgroundColor: resolveColor(theme, 'background.body'), paddingTop: insets.top }}
      >
        {/* The header: what you are making, and the way out. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingHorizontal: theme.spacing[2],
            paddingTop: theme.spacing[1],
            paddingBottom: theme.spacing[1.5],
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: resolveColor(theme, 'divider')
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography level='h4' accessibilityRole='header'>
              {title}
            </Typography>
            {readout ? (
              <Typography level='body-sm' color='text.tertiary' accessibilityLiveRegion='polite' numberOfLines={2}>
                {readout}
              </Typography>
            ) : null}
          </View>
          <IconButton
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            style={{ marginTop: -theme.spacing[0.5], marginRight: -theme.spacing[1] }}
          >
            <Icon name='X' size='md' color='text.secondary' />
          </IconButton>
        </View>

        {/* The body scrolls; the keys do not. */}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{ paddingHorizontal: theme.spacing[2], paddingVertical: theme.spacing[2] }}
        >
          <InSheet value={true}>{children}</InSheet>
        </ScrollView>

        {footer ? (
          <View
            style={{
              paddingHorizontal: theme.spacing[2],
              paddingTop: theme.spacing[1.5],
              // The keyboard's height replaces the safe-area inset while it is up.
              paddingBottom: keyboard > 0 ? keyboard + theme.spacing[1] : insets.bottom + theme.spacing[2],
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: resolveColor(theme, 'divider'),
              backgroundColor: resolveColor(theme, 'background.body')
            }}
          >
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

export default FullSheet
