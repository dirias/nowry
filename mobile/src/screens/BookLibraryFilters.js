/**
 * The library's Tags and Sort menus, as one sheet (MOB-058).
 *
 * The web draws them as two menu segments whose labels are their readouts, and
 * a phone has nothing to anchor a menu to — so the label stays a readout and
 * the menu becomes a sheet, which is the same translation the calendar's
 * filters already make.
 *
 * Sort is single-choice and closes on a pick. Tags are not: narrowing to two is
 * two ticks, and a sheet that shuts after each one makes the user reopen it
 * every time.
 */
import { ScrollView, View } from 'react-native'
import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SORTS } from '@nowry/core/domain/books/libraryQuery'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { BottomSheet, Button, Divider, Icon, Stack, Typography } from '../ui'

export function LibraryFilterSheet({ open, onClose, sort, onSort, tags, onTags, available = [] }) {
  const { t } = useTranslation()
  const isTags = open === 'tags'

  return (
    <BottomSheet visible={Boolean(open)} onClose={onClose} title={isTags ? t('books.lib.tags') : t('books.lib.sortAria')}>
      <ScrollView style={{ maxHeight: 360 }}>
        {isTags ? (
          <View>
            {available.map(({ tag, count }) => (
              <Row
                key={tag}
                label={`${tag} · ${count}`}
                chosen={tags.includes(tag)}
                onPress={() => onTags(tags.includes(tag) ? tags.filter((value) => value !== tag) : [...tags, tag])}
                role='checkbox'
              />
            ))}
            {tags.length > 0 ? (
              <>
                <Divider />
                <Row label={t('books.lib.clearTags')} chosen={false} onPress={() => onTags([])} role='button' />
              </>
            ) : null}
          </View>
        ) : (
          <View>
            {SORTS.map((value) => (
              <Row
                key={value}
                label={t(`books.lib.sortBy.${value}`)}
                chosen={sort === value}
                onPress={() => {
                  onSort(value)
                  onClose?.()
                }}
                role='radio'
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Stack style={{ paddingTop: 8 }}>
        <Button variant='tertiary' onPress={onClose}>
          {t('common.close')}
        </Button>
      </Stack>
    </BottomSheet>
  )
}

function Row({ label, chosen, onPress, role }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'button' ? undefined : { checked: chosen, selected: chosen }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: theme.spacing[1],
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? resolveColor(theme, 'background.level2') : 'transparent'
      })}
    >
      <Typography level='body-md' color={chosen ? 'text.primary' : 'text.secondary'} style={{ flex: 1 }}>
        {label}
      </Typography>
      {chosen ? <Icon name='Check' size='sm' color='primary.plainColor' /> : null}
    </Pressable>
  )
}

export default LibraryFilterSheet
