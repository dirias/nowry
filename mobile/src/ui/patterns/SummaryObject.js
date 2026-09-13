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
 *
 * **The readouts are ONE line, joined by middots** (MOB-095). They were set at
 * a 16pt gap with no separator, which made three facts standing near each other
 * — and wrapped after two, so the study streak sat on a line of its own under
 * the counts it belongs with. The web has always drawn this as a sentence:
 * "21 due · 0 reviewed · start your streak today", at half the gap with a
 * tertiary dot between. Same words, one line instead of three, which is the
 * whole of what "more minimalistic on the web" meant.
 */
import { Children, Fragment, isValidElement } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { Sheet } from '../Sheet'
import { Stack } from '../Stack'
import { Typography, resolveColor } from '../Typography'
import { SUMMARY_EDGE_HEIGHT } from './rowSpec'

/**
 * The readouts as a flat list, whatever shape the caller wrote them in.
 *
 * Every call site passes a fragment, because that is how you write four
 * conditional siblings in JSX — and `Children.toArray` sees a fragment as ONE
 * child, so a separator between "them" would have nothing to separate. Opened
 * one level, then flattened, which also drops the nulls a conditional readout
 * leaves behind: `·` beside a missing number is how a separator gives away
 * that it was written as decoration.
 */
const flatten = (readouts) => {
  const top = Children.toArray(readouts)
  if (top.length === 1 && isValidElement(top[0]) && top[0].type === Fragment) {
    return Children.toArray(top[0].props.children)
  }
  return top
}

export function SummaryObject({
  title,
  context,
  readouts,
  caption = null,
  aside = null,
  action,
  secondary,
  progress = null,
  progressLabel = null,
  empty = null,
  style
}) {
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

        {/* A line under the identity: the web's motivational caption sits
            here, beneath the greeting and above the numbers (MOB-075). */}
        {caption ? (
          <Typography level='body-sm' color='text.secondary'>
            {caption}
          </Typography>
        ) : null}

        {/* Empty is one sentence in the same object, not a different screen. */}
        {empty ? (
          <Typography level='body-md' color='text.secondary'>
            {empty}
          </Typography>
        ) : readouts ? (
          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
            {/*
             * The dots are SIBLINGS of the readouts, not wrappers around them,
             * which is how the web writes this row and it matters at 390pt.
             * Bound to the item that follows, a dot wraps with it and a line
             * begins with "·"; left flat, it stays at the end of the line it
             * fits on, where a trailing separator reads as "continues".
             */}
            {flatten(readouts).flatMap((readout, index) =>
              index === 0
                ? [readout]
                : [
                    <Typography key={`dot-${index}`} level='body-sm' color='text.tertiary' importantForAccessibility='no'>
                      ·
                    </Typography>,
                    readout
                  ]
            )}
          </Stack>
        ) : null}

        {/* The object's own figure, above its actions. The web draws it on a
            right rail beside the title; at 390pt that rail is gone and the
            figure takes the row the rail would have been. It is part of the
            object either way — the study strip spent a release floating below
            the card as if it belonged to the page (MOB-062). */}
        {aside}

        {action || secondary ? (
          <Stack direction='row' spacing={1} alignItems='center'>
            {action}
            {secondary}
          </Stack>
        ) : null}

        {/* What the edge below means. A 3px line says a proportion and never
            says of what. */}
        {showEdge && progressLabel ? (
          <Typography level='body-xs' color='text.tertiary' style={{ fontVariant: ['tabular-nums'] }}>
            {progressLabel}
          </Typography>
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
