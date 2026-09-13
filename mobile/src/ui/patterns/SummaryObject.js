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

        {/*
         * Stacked and full width, with the SOLID one last (MOB-096).
         *
         * The web's own breakpoint: `direction={{xs: 'column', sm: 'row'}}`
         * with `width: {xs: '100%'}`, and the secondary written first so the
         * primary ends up at the bottom. Both halves matter on a phone. Side by
         * side, each key gets less than half the width and the shorter label
         * makes the smaller target, so the quick session is easier to hit than
         * the session; stacked, they are the same target and the one a thumb
         * reaches first is the one the object is for.
         */}
        {action || secondary ? (
          <Stack spacing={1}>
            {secondary}
            {action}
          </Stack>
        ) : null}

        {/*
         * Progress, under the control row and spanning EXACTLY the content
         * width (§15.4, MOB-096). It used to run full bleed to the card's
         * edges, outside the padded column — which made it the card's border
         * rather than the content's rule, and the standard draws the
         * distinction in those words: "full width is wrong for a floating bar
         * and right for a rule", the rule being the content's. It also does
         * the job of the divider that would otherwise sit there.
         */}
        {showEdge ? (
          <View
            accessibilityRole='progressbar'
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
            accessibilityLabel={progressLabel ?? undefined}
            style={{
              height: SUMMARY_EDGE_HEIGHT,
              borderRadius: theme.radius.full,
              overflow: 'hidden',
              backgroundColor: resolveColor(theme, 'background.level2')
            }}
          >
            <View
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                borderRadius: theme.radius.full,
                backgroundColor: resolveColor(theme, 'primary.solidBg')
              }}
            />
          </View>
        ) : null}

        {/* What the edge above means. A 3px line says a proportion and never
            says of what — and it says it UNDER the line, as the web does,
            because a caption belongs to the thing before it. */}
        {showEdge && progressLabel ? (
          <Typography level='body-xs' color='text.tertiary' style={{ fontVariant: ['tabular-nums'] }}>
            {progressLabel}
          </Typography>
        ) : null}
      </View>
    </Sheet>
  )
}

export default SummaryObject
