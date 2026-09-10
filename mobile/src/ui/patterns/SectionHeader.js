/**
 * A section's name, its count, and at most one key (PhoneDashboard board).
 *
 * 28px tall with the name and the count on one baseline, and the key pushed to
 * the right. Every list on the dashboard sits under one of these, which is what
 * makes "Due now" and "Up to date" read as two answers to the same question
 * rather than as two different components.
 */
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { Typography } from '../Typography'

export const SECTION_HEADER_HEIGHT = 28

export function SectionHeader({ title, count = null, action = null, style }) {
  const theme = useTheme()

  return (
    <View
      // The count belongs to the heading, so it is read as part of it.
      accessibilityRole='header'
      style={[
        {
          minHeight: SECTION_HEADER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing[1]
        },
        style
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[1.5], flex: 1, minWidth: 0 }}>
        <Typography level='title-md' color='text.primary'>
          {title}
        </Typography>
        {count != null ? (
          <Typography level='body-sm' color='text.tertiary'>
            {count}
          </Typography>
        ) : null}
      </View>
      {action}
    </View>
  )
}

export default SectionHeader
