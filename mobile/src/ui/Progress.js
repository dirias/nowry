/**
 * Progress — a determinate bar, and the measure ADR-021 defines.
 *
 * `Measure` is the row's version: 64 × 3 on the progress radius, `level2`
 * ground, filled with the accent, and **empty for an item with nothing learned**
 * rather than showing a full grey bar. A grey bar under a deck with no progress
 * reads as a broken control, which is exactly what §15.11 set out to stop.
 */
import { View } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from './Typography'

const clamp = (pct) => Math.min(100, Math.max(0, Number(pct) || 0))

export function Progress({ value = 0, width = '100%', height = 3, accessibilityLabel, style }) {
  const theme = useTheme()
  const pct = clamp(value)

  return (
    <View
      accessibilityRole='progressbar'
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[
        { width, height, borderRadius: height, backgroundColor: resolveColor(theme, 'background.level2'), overflow: 'hidden' },
        style
      ]}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height, backgroundColor: resolveColor(theme, 'primary.solidBg') }} />
    </View>
  )
}

/** ADR-021 §4 — 64 × 3, and empty when nothing has been learned. */
export function Measure({ value = 0, accessibilityLabel, style }) {
  return <Progress value={value} width={64} height={3} accessibilityLabel={accessibilityLabel} style={style} />
}

export default Progress
