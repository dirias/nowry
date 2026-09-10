/**
 * One finished session as one row (PhoneDashboard board, "Recent").
 *
 * The same anatomy as every other row, with two differences the board draws: the
 * tile is a 28px glyph well rather than a 16px colour chip, because a session
 * has no identity colour of its own, and the readout is a score — a short
 * measure and a percentage, banded so a glance is enough.
 *
 * The band is three states, not a gradient: strong, mixed, weak. A percentage
 * with no band is a number the reader has to interpret; a band with no
 * percentage is a judgement with no evidence. Both are here.
 */
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { ListRow } from './ListRow'

const WELL = 28
const MEASURE_WIDTH = 36
const MEASURE_HEIGHT = 3

/** Where a score sits. The thresholds are the board's own colours. */
export const scoreColor = (score) => {
  if (score >= 85) return 'success.plainColor'
  if (score >= 60) return 'warning.plainColor'
  return 'danger.plainColor'
}

export function SessionRow({ title, meta, when, score = null, onPress }) {
  const theme = useTheme()
  const color = score == null ? 'text.tertiary' : scoreColor(score)

  return (
    <ListRow
      tile={
        <View
          style={{
            width: WELL,
            height: WELL,
            borderRadius: theme.radius.sm,
            backgroundColor: resolveColor(theme, 'background.level1'),
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name='Clock' size='sm' color='text.tertiary' />
        </View>
      }
      name={title}
      meta={meta}
      readout={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}>
          <Typography level='body-xs' color='text.tertiary'>
            {when}
          </Typography>
          {score == null ? null : (
            <>
              {/* Decorative: the percentage beside it carries the meaning. */}
              <View
                style={{
                  width: MEASURE_WIDTH,
                  height: MEASURE_HEIGHT,
                  borderRadius: MEASURE_HEIGHT,
                  overflow: 'hidden',
                  backgroundColor: resolveColor(theme, 'background.level2')
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, Math.max(0, score))}%`,
                    height: '100%',
                    backgroundColor: resolveColor(theme, color)
                  }}
                />
              </View>
              <Typography level='title-sm' color={color}>
                {`${score}%`}
              </Typography>
            </>
          )}
        </View>
      }
      onPress={onPress}
    />
  )
}

export default SessionRow
