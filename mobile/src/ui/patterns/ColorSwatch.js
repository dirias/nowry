/**
 * One colour choice (moved out of Settings for MOB-102).
 *
 * Not a `Chip`: a chip paints its own ground, which is the one thing a swatch
 * must not do. And selection is a mark on the colour, never the colour alone —
 * a ring of hue around a square of hue is invisible to a viewer who cannot
 * distinguish the two, so the chosen one carries a tick in whichever of black
 * or white is legible on it.
 *
 * It lived inside `Settings` as the accent picker. A document's cover is the
 * second colour choice this client offers, and two private copies of one
 * control is how a tick ends up legible on one and not the other.
 */
import { Pressable, View } from 'react-native'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { Icon } from '../icons'
import { MIN_TOUCH_TARGET } from '../buttonSpec'

/** The colour's own diameter; the target around it is the platform minimum. */
const SWATCH = 32

export function ColorSwatch({ hex, selected = false, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: SWATCH,
          height: SWATCH,
          borderRadius: SWATCH / 2,
          backgroundColor: hex,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {selected ? <Icon name='Check' size='sm' literalColor={readableTextOn(hex)} /> : null}
      </View>
    </Pressable>
  )
}

export default ColorSwatch
