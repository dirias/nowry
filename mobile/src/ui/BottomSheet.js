/**
 * BottomSheet — the mobile answer to the web's Modal and ModalDialog.
 *
 * A phone has no room for a centred dialog and no mouse to dismiss one with, so
 * the same job is done by a sheet that rises from the bottom edge and is thrown
 * back down. Three ways out, because a sheet with one is a trap:
 *
 *   - **Drag it down.** Past a third of its height, or fast enough, it goes.
 *     Short of that it springs back, so a hesitant drag is not a decision.
 *   - **The back gesture**, through `onRequestClose`, which Android's hardware
 *     back also triggers.
 *   - **Tap the scrim.**
 *
 * `accessibilityViewIsModal` is what traps a screen reader inside it. Without
 * that, VoiceOver walks straight out of the sheet into the page underneath and
 * reads content the user cannot see.
 *
 * Under reduced motion it appears rather than slides: presence motion is
 * removed, not slowed (MOTION.md §4).
 *
 * **It gets out of the keyboard's way itself.** A sheet sits on the bottom
 * edge, which is exactly where the keyboard opens, and the calendar's event
 * form shipped with every field hidden behind it — the user typed a title they
 * could not see. Android's own resize mode does not reach inside a transparent
 * modal under edge-to-edge, and `KeyboardAvoidingView` is unreliable there, so
 * the sheet measures the keyboard and pads by it. Doing it in JavaScript also
 * means no `softwareKeyboardLayoutMode` in the app config, which would have
 * cost a new native build.
 *
 * **And it scrolls.** The content was a plain view under a 90% cap: anything
 * taller than that was clipped with no way to reach it, which the event form
 * hit the moment a picker and a description were both on screen.
 */
import { createContext, useContext, useRef, useState } from 'react'
import { Animated, Dimensions, Modal, PanResponder, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useTheme, useReduceMotion } from '../theme'
import { Typography, resolveColor } from './Typography'
import { useKeyboardHeight } from './useKeyboardHeight'

/**
 * Whether the thing rendering is already inside a sheet.
 *
 * A `Modal` opened from inside a `Modal` does not layer predictably on Android:
 * the `Select` in the calendar's event form opened its option list as a second
 * modal, and it came up squeezed against the bottom edge, half behind the sheet
 * it belonged to. Controls that would open their own overlay read this and
 * expand in place instead.
 */
const SheetContext = createContext(false)

export const useInSheet = () => useContext(SheetContext)

const DISMISS_FRACTION = 0.33
const DISMISS_VELOCITY = 0.5

export function BottomSheet({ visible, onClose, title, children, accessibilityLabel, style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const insets = useSafeAreaInsets()
  const drag = useRef(new Animated.Value(0)).current
  const height = Dimensions.get('window').height
  // Measured rather than avoided; see `useKeyboardHeight`, which the chat
  // screen needs for the same reason.
  const keyboard = useKeyboardHeight()

  const settle = () =>
    Animated.timing(drag, {
      toValue: 0,
      duration: reduceMotion ? 0 : theme.motion.duration.base,
      useNativeDriver: true
    }).start()

  const responder = useRef(
    PanResponder.create({
      // Only a downward drag is ours; a list inside the sheet keeps its scroll.
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) drag.setValue(g.dy)
      },
      onPanResponderRelease: (_e, g) => {
        const farEnough = g.dy > height * DISMISS_FRACTION
        const fastEnough = g.vy > DISMISS_VELOCITY
        if (farEnough || fastEnough) {
          drag.setValue(0)
          onClose?.()
        } else {
          // A hesitant drag is not a decision.
          settle()
        }
      }
    })
  ).current

  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
        accessibilityLabel={t('common.close')}
        accessibilityRole='button'
      >
        <Animated.View
          // Traps the screen reader inside the sheet. Without it VoiceOver walks
          // out into the page underneath and reads what the user cannot see.
          accessibilityViewIsModal
          accessibilityRole='none'
          accessibilityLabel={accessibilityLabel ?? title}
          onStartShouldSetResponder={() => true}
          style={[
            {
              backgroundColor: resolveColor(theme, 'background.popup'),
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              // The keyboard's height replaces the safe-area inset while it is
              // up: the system bar it insets for is behind the keyboard.
              paddingBottom: keyboard > 0 ? keyboard : insets.bottom + theme.spacing[2],
              maxHeight: '90%',
              transform: [{ translateY: drag }],
              ...theme.elevation.lg
            },
            style
          ]}
        >
          <View {...responder.panHandlers} style={{ paddingTop: theme.spacing[1], alignItems: 'center' }}>
            {/* The grabber says "this is draggable" before anyone tries. */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: resolveColor(theme, 'background.level3') }} />
            {title ? (
              <Typography level='title-md' color='text.primary' style={{ marginTop: theme.spacing[1] }}>
                {title}
              </Typography>
            ) : null}
          </View>
          {/* `handled` so a tap on a control inside the sheet reaches it on the
              first press rather than being eaten by the keyboard's dismissal. */}
          {/*
           * `flexShrink` is what makes the sheet SCROLLABLE rather than merely
           * tall. Without it a ScrollView inside a `maxHeight` box sizes itself
           * to its content and never scrolls, so when the keyboard came up the
           * event form's action row sat half behind it with no way to reach it
           * — the field was fixed in MOB-052 and the buttons were not
           * (MOB-073). With it the list takes the space that is left and the
           * rest scrolls, whatever height the keyboard turns out to be.
           *
           * The bottom pad is the second half: a row flush against the sheet's
           * edge reads as cut off even when it is whole.
           */}
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{
              paddingHorizontal: theme.spacing[2],
              paddingTop: theme.spacing[1],
              paddingBottom: theme.spacing[2]
            }}
          >
            <SheetContext.Provider value={true}>{children}</SheetContext.Provider>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

export default BottomSheet
