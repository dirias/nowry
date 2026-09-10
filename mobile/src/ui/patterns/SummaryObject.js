/**
 * SummaryObject — one per page (ADR-021 §1, §15.10).
 *
 * A `surface` sheet at `radius.lg`, no border and no shadow. Title and context,
 * one line of readouts under them, the page's one solid action, and progress as
 * its 3px bottom edge.
 *
 * **Read for one column.** The web puts the title on a left rail and the key on
 * a right rail. At 375px those rails would each be about 160px, so the action
 * wraps under instead. The grammar survives the change: still one object, still
 * one key, still the readouts under the title. Only the axis differs.
 *
 * **Empty is the same object.** One sentence and its actions, never hidden and
 * never a centred block — a centred empty state replaces the object the user
 * will use tomorrow with one they will never see again.
 */
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { Sheet } from '../Sheet'
import { Stack } from '../Stack'
import { Typography, resolveColor } from '../Typography'
import { SUMMARY_EDGE_HEIGHT } from './rowSpec'

export function SummaryObject({ title, context, readouts, action, secondary, progress = null, empty = null, style }) {
  const theme = useTheme()
  const showEdge = typeof progress === 'number'

  return (
    <Sheet radius='lg' padding={0} elevation='none' style={[{ overflow: 'hidden' }, style]}>
      <View style={{ padding: theme.spacing[2], gap: theme.spacing[1.5] }}>
        {/* Title and context share a baseline, as the PhoneDashboard artboard
            draws them: "Today · Sat, 6 Sep" is one line of identity, not a
            heading with a subtitle under it. */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[1.5], flexWrap: 'wrap' }}>
          <Typography level='title-lg' color='text.primary'>
            {title}
          </Typography>
          {context ? (
            <Typography level='body-sm' color='text.tertiary'>
              {context}
            </Typography>
          ) : null}
        </View>

        {/* Empty is one sentence in the same object, not a different screen. */}
        {empty ? (
          <Typography level='body-md' color='text.secondary'>
            {empty}
          </Typography>
        ) : readouts ? (
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
            {readouts}
          </Stack>
        ) : null}

        {action || secondary ? (
          <Stack direction='row' spacing={1} alignItems='center'>
            {action}
            {secondary}
          </Stack>
        ) : null}
      </View>

      {/* Progress is the object's bottom edge, not a bar inside it. */}
      {showEdge ? (
        <View style={{ height: SUMMARY_EDGE_HEIGHT, backgroundColor: resolveColor(theme, 'background.level2') }}>
          <View
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              backgroundColor: resolveColor(theme, 'primary.solidBg')
            }}
          />
        </View>
      ) : null}
    </Sheet>
  )
}

export default SummaryObject
