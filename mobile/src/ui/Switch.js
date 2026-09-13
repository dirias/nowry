/**
 * A switch, and it is the platform's own (MOB-091).
 *
 * The web uses Joy's, which is a styled `<input type="checkbox">`; this client
 * has drawn booleans as `Choice`'s checkbox because that is what it had. Neither
 * is right for a settings screen on a phone. A checkbox says "this is one of
 * several things you are selecting, and you will confirm"; a switch says "this
 * is on or off, and it takes effect now", which is exactly what every control on
 * that screen does. Both platforms' own guidance says the same, and both draw
 * the switch differently — so this is React Native's, which is each platform's,
 * rather than a drawing of one.
 *
 * **The colour is the account's accent**, as every other selected state here is,
 * and the track under it is the neutral outline so an off switch reads as an
 * empty channel rather than as a disabled control.
 *
 * `Choice` is still right for a list you are choosing from. This is for a
 * setting you are setting.
 */
import { Switch as NativeSwitch } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'

export function Switch({ value = false, onValueChange, disabled = false, accessibilityLabel, ...rest }) {
  const theme = useTheme()

  return (
    <NativeSwitch
      value={value}
      onValueChange={disabled ? undefined : onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{
        false: resolveColor(theme, 'neutral.outlinedBorder'),
        true: resolveColor(theme, 'primary.solidBg')
      }}
      thumbColor={resolveColor(theme, 'background.surface')}
      {...rest}
    />
  )
}

export default Switch
