/**
 * One block on one day as one row (PLAN-003, PRD D11, ADR-021 §15.11).
 *
 * The five parts in the one order, with the time readout leading: `07:30` in
 * a 44pt column · a 16pt tile in the source's colour · the title over a meta
 * line ("20 min · study", and for today's study block "27 due ≈ 20 min") ·
 * the record on the right. The record is the tick — a 22pt circle on a 44pt
 * target — on every row, the one that is now included (PLAN-017): Start is
 * not a row action; it lives in the block's sheet, where the timer is a
 * choice made about one block.
 *
 * Kept is a filled tick. Skipped is the title struck on `text.tertiary` — the
 * strike is the one place a second signal is allowed, because a skipped block
 * has no tick to say so. A past block nobody logged shows the empty circle.
 *
 * It does not use `ListRow`: the strike and the streak are things that row
 * rightly refuses, and the numbers are the same.
 *
 * The title opens the sheet; a long press opens the row's menu; the tick is
 * its own control, as it is on the agenda, so a thumb between them gets one
 * or the other and never both.
 */
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { rowStreak, stateOf } from '@nowry/core/domain/blocks'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { Icon } from '../icons'
import { IdentityTile } from './IdentityTile'
import { MIN_TOUCH_TARGET } from '../buttonSpec'
import { LIST_ROW_HEIGHT } from './rowSpec'

export const TIME_COLUMN_WIDTH = 44
export const TICK_SIZE = 22
/** Streaks under two are not streaks yet. */
export const STREAK_FLOOR = 2

/** The source's colour: identity is the tile, and only the tile (§15.11). */
export const sourceColor = (type, areaColor = null) => {
  if (type === 'goal') return areaColor || 'primary.softBg'
  if (type === 'focus') return 'warning.plainColor'
  if (type === 'task' || type === 'free') return 'neutral.outlinedBorder'
  return 'primary.solidBg'
}

export function BlockRow({
  occurrence,
  clock,
  isToday = false,
  logs = [],
  todayKey,
  areaColor = null,
  due = 0,
  suggestedMinutes = 0,
  onOpen,
  onMenu,
  onToggle
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const block = occurrence.block ?? {}
  // The server's occurrence row may carry no title of its own; the block's is
  // the same string either way.
  const title = occurrence.title || block.title || ''
  const type = block.source?.type ?? 'free'
  const state = stateOf(occurrence, clock)
  const kept = state === 'kept'
  const skipped = state === 'skipped'
  const partial = state === 'partial'

  const streak = todayKey && block.id ? rowStreak(logs, block, todayKey) : 0
  const lead =
    type === 'study' && isToday && due > 0
      ? t('blocks.row.studyDue', { count: due, minutes: suggestedMinutes })
      : t('study.dates.minutes', { count: occurrence.lengthMin })
  const meta = [lead, t(`blocks.source.${type}`), streak >= STREAK_FLOOR ? t('blocks.row.streak', { count: streak }) : null]
    .filter(Boolean)
    .join(' · ')

  const height = LIST_ROW_HEIGHT

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          minHeight: height,
          paddingHorizontal: theme.spacing[1.5],
          borderRadius: theme.radius.md
        }}
      >
        <Pressable
          onPress={() => onOpen?.(occurrence)}
          onLongPress={() => onMenu?.(occurrence)}
          accessibilityRole='button'
          accessibilityLabel={t('blocks.row.openAria', { title })}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: height,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[2],
            borderRadius: theme.radius.md,
            backgroundColor: pressed ? resolveColor(theme, 'background.level1') : 'transparent'
          })}
        >
          <Typography level='body-xs' color='text.tertiary' style={{ width: TIME_COLUMN_WIDTH, fontVariant: ['tabular-nums'] }}>
            {occurrence.start}
          </Typography>
          <IdentityTile color={sourceColor(type, areaColor)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography
              level='title-md'
              color={skipped ? 'text.tertiary' : 'text.primary'}
              numberOfLines={1}
              style={skipped ? { textDecorationLine: 'line-through' } : undefined}
            >
              {title}
            </Typography>
            <Typography level='body-xs' color='text.tertiary' numberOfLines={1}>
              {meta}
            </Typography>
          </View>
        </Pressable>

        <Tick
          kept={kept}
          partial={partial}
          theme={theme}
          accessibilityLabel={t(kept ? 'blocks.row.untickAria' : 'blocks.row.tickAria', { title })}
          onPress={() => onToggle?.(occurrence)}
        />
      </View>
    </View>
  )
}

/**
 * The record, as one control. A circle of 22 on a 44 target; filled when the
 * day was kept, a dash when it was partly kept, empty otherwise. Its role is
 * checkbox so a screen reader says what pressing it does.
 */
function Tick({ kept, partial, theme, accessibilityLabel, onPress }) {
  const filled = kept || partial
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: kept }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1
      })}
    >
      <View
        style={{
          width: TICK_SIZE,
          height: TICK_SIZE,
          borderRadius: TICK_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: filled ? 0 : 1.5,
          borderColor: resolveColor(theme, 'neutral.outlinedBorder'),
          backgroundColor: filled ? resolveColor(theme, 'primary.solidBg') : 'transparent'
        }}
      >
        {filled ? <Icon name={kept ? 'Check' : 'Minus'} size={14} color='primary.solidColor' /> : null}
      </View>
    </Pressable>
  )
}

export default BlockRow
