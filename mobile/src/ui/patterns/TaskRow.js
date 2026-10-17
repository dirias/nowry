/**
 * One task on Home's Tasks tab (PLAN-020, PRD-items D11): `BlockRow`'s row, so
 * the panel's two tabs are one object (ADR-021 amendment 2026-10-17).
 *
 * When (44pt: "Late" as a word in primary text, nothing for today, a weekday or
 * a short date under Upcoming) · the 20pt tile (the clipboard, or the flag
 * when flagged; never a check, because the tick is one tile away) · the title
 * over its list, or "Task" · the tick, a circle, at the end. The title opens
 * the item sheet; the tick is the row's one action.
 */
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { listNameOf, whenOf, whenText } from '@nowry/core/domain/taskQueue'
import { useTheme } from '../../theme'
import { Typography, resolveColor } from '../Typography'
import { LIST_ROW_HEIGHT } from './rowSpec'
import { SourceTile, TIME_COLUMN_WIDTH, Tick, sourceColor } from './BlockRow'

export function TaskRow({ task, lists = [], now = new Date(), onOpen, onToggle }) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const done = Boolean(task.is_completed)
  const late = !done && whenOf(task, now).kind === 'late'
  const lead = done ? '' : whenText(task, { now, language: i18n?.language ?? 'en', t })
  const meta = [task.is_priority ? t('tasks.row.priority') : null, listNameOf(task, lists) ?? t('tasks.row.task')]
    .filter(Boolean)
    .join(' · ')

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        minHeight: LIST_ROW_HEIGHT,
        paddingHorizontal: theme.spacing[1.5],
        borderRadius: theme.radius.md
      }}
    >
      <Pressable
        onPress={() => onOpen?.(task)}
        accessibilityRole='button'
        accessibilityLabel={t('tasks.row.openAria', { title: task.title })}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: LIST_ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? resolveColor(theme, 'background.level1') : 'transparent'
        })}
      >
        <Typography
          level='body-xs'
          weight={late ? 'lg' : null}
          color={late ? 'text.primary' : 'text.tertiary'}
          style={{ width: TIME_COLUMN_WIDTH, fontVariant: ['tabular-nums'] }}
        >
          {lead}
        </Typography>
        <SourceTile type='task' glyph={task.is_priority ? 'Flag' : null} color={sourceColor('task')} theme={theme} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography level='title-md' color={done ? 'text.tertiary' : 'text.primary'} numberOfLines={1}>
            {task.title}
          </Typography>
          <Typography level='body-xs' color='text.tertiary' numberOfLines={1}>
            {meta}
          </Typography>
        </View>
      </Pressable>

      <Tick
        kept={done}
        partial={false}
        theme={theme}
        accessibilityLabel={t(done ? 'tasks.row.markUndone' : 'tasks.row.markDone', { title: task.title })}
        onPress={() => onToggle?.(task)}
      />
    </View>
  )
}

export default TaskRow
