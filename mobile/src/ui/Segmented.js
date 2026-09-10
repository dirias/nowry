/**
 * The segmented control (BUTTONS.md §5, ADR-021 §15.2).
 *
 * Two or more controls of one class over one list are ONE object: a group with
 * radius `md` on `level1`, hairline dividers between segments, and an engaged
 * segment that sits on `level2` and carries a 2px accent underline.
 *
 * That underline is the key's edge turned inward. The ground is what says
 * "engaged"; the underline is the signature. State is a ground, never a hue —
 * an engaged segment does not turn the accent colour (§15.5).
 *
 * The group clips its corners, so a focus ring would be cropped; the web solves
 * that with an inset ring, and on a phone the pressed ground does the same job.
 * Segments are 44 tall here rather than 36: the web's 36 is its desktop size and
 * its own rule is 44 at `xs`, which a phone always is.
 */
import { StyleSheet, View } from 'react-native'
import { Pressable } from 'react-native'
import { useTheme } from '../theme'
import { Typography, resolveColor } from './Typography'
import { SEGMENT_HEIGHT, SEGMENT_UNDERLINE as UNDERLINE } from './buttonSpec'

export function Segmented({ options, value, onChange, accessibilityLabel, style }) {
  const theme = useTheme()

  if (__DEV__ && !accessibilityLabel) {
    throw new Error('Segmented: accessibilityLabel is required — the group needs a name, not just its options.')
  }

  return (
    <View
      accessibilityRole='tablist'
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: theme.radius.md,
          backgroundColor: resolveColor(theme, 'background.level1'),
          overflow: 'hidden'
        },
        style
      ]}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange?.(option.value)}
            accessibilityRole='tab'
            accessibilityState={{ selected: active }}
            // The count is part of what the tab is, so it is read with it.
            accessibilityLabel={option.count == null ? option.label : `${option.label} ${option.count}`}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: SEGMENT_HEIGHT,
              paddingHorizontal: theme.spacing[1.5],
              alignItems: 'center',
              justifyContent: 'center',
              // A hairline between segments, never before the first.
              borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderLeftColor: resolveColor(theme, 'divider'),
              backgroundColor: active || pressed ? resolveColor(theme, 'background.level2') : 'transparent'
            })}
          >
            <View style={{ alignItems: 'center' }}>
              {/* A count beside the label, not under it (PhoneTags board):
                  "Cards 312" is one tab, and a stacked number would make the
                  segment two lines tall on a phone. */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Typography level='title-sm' color={active ? 'text.primary' : 'text.secondary'} numberOfLines={1}>
                  {option.label}
                </Typography>
                {option.count == null ? null : (
                  <Typography level='body-sm' color='text.tertiary'>
                    {option.count}
                  </Typography>
                )}
              </View>
              {/* The key's edge, turned inward. */}
              <View
                style={{
                  height: UNDERLINE,
                  alignSelf: 'stretch',
                  marginTop: 2,
                  borderRadius: UNDERLINE,
                  backgroundColor: active ? resolveColor(theme, 'primary.solidBg') : 'transparent'
                }}
              />
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

export default Segmented
