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
 */
import { useRef } from 'react'
import { Animated, Dimensions, Modal, PanResponder, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useTheme, useReduceMotion } from '../theme'
import { Typography, resolveColor } from './Typography'

const DISMISS_FRACTION = 0.33
const DISMISS_VELOCITY = 0.5

export function BottomSheet({ visible, onClose, title, children, accessibilityLabel, style }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const insets = useSafeAreaInsets()
  const drag = useRef(new Animated.Value(0)).current
  const height = Dimensions.get('window').height

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
              paddingBottom: insets.bottom + theme.spacing[2],
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
          <View style={{ paddingHorizontal: theme.spacing[2], paddingTop: theme.spacing[1] }}>{children}</View>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

export default BottomSheet
