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
 *
 * **The keys share one row, and the edge has no caption** (MOB-114, the Today
 * object canvas of 2026-10-15). Measured, the Study Center's object was 318pt
 * on a 390pt phone — 68% of the content area on a 4.7-inch screen, with the
 * key as its sixth row and one deck row visible under it. One axis had taken
 * everything the web spreads over a second rail and stacked it, and two of the
 * rows said in words what another row already said: the caption restated the
 * readout ("0 reviewed" and "0 of 27 done today"), and 27 was written three
 * times. The web dropped its caption in SITE-015 for the same reason. The keys
 * were stacked for target size (MOB-096), but that argument assumed two equal
 * halves; beside the key at its own width the secondary is the smaller target
 * and the solid is more than twice as wide, which is what the thumb finds
 * first. The `progressLabel` is still the edge's accessible name.
 */
import { Children, Fragment, isValidElement } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../theme'
import { Sheet } from '../Sheet'
import { Stack } from '../Stack'
import { Typography, resolveColor } from '../Typography'
import { SUMMARY_EDGE_HEIGHT } from './rowSpec'

/** The least width the key shares a row at; narrower, it takes its own line. */
const KEY_MIN_WIDTH = 160

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
         * One row: the secondary at its own width, the solid takes the rest
         * (MOB-114; §15.10 says "at most one secondary BESIDE it").
         *
         * MOB-096 stacked them so the shorter label would not be the easier
         * target. That holds only when the two share the width equally. Here
         * the secondary is as wide as its label and the key takes the rest,
         * so the key is the larger target by a wide margin and sits where it
         * did — last, nearest the thumb. A secondary on its own (the day is
         * done, the key is Browse) takes the whole row, as the web's does.
         *
         * The row wraps. A secondary can carry a long label (the library's
         * "Make cards · 3 sections", longer in German), and the key must never
         * be squeezed under its own name to make room: below 160pt for the key
         * it drops to a line of its own at full width, which is the stacked
         * shape this replaces, kept as the fallback rather than the rule.
         */}
        {action || secondary ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[1] }}>
            {secondary ? <View style={{ flexGrow: action ? 0 : 1 }}>{secondary}</View> : null}
            {action ? <View style={{ flexGrow: 1, flexBasis: KEY_MIN_WIDTH }}>{action}</View> : null}
          </View>
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

        {/* No caption under the edge. The readout line above already says what
            is done and what is asked, so a "0 of 27 done today" under the line
            was the same two numbers a third time, on a row of their own. The
            sentence is the edge's accessible name instead (MOB-114; the web
            made the same cut in SITE-015). */}
      </View>
    </Sheet>
  )
}

export default SummaryObject
