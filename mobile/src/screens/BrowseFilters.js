/**
 * The catalogue's two filters, as one sheet (MOB-049).
 *
 * Category and sort are single-choice, unlike the calendar's, so this one does
 * close on a pick — a sheet that stayed open after the only choice it takes
 * would be asking the user to dismiss it for no reason.
 *
 * The seventeen categories are the web's own list and the four sorts are its
 * own values. The API takes `most_liked`; the label key spells it `mostLiked`.
 * Both are written here rather than derived from each other, because guessing
 * one from the other is how a filter silently stops filtering.
 */
import { ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { BottomSheet, Button, Divider, Icon, Stack, Typography } from '../ui'

/** The web's own seventeen. */
export const CATEGORIES = [
  'science',
  'math',
  'languages',
  'history',
  'literature',
  'technology',
  'art',
  'music',
  'business',
  'health',
  'design',
  'programming',
  'technical',
  'documentation',
  'planning',
  'features',
  'deployment'
]

/** The API's values, in the web's order; the first is the default. */
export const SORTS = ['recent', 'popular', 'most_liked', 'most_forked']

/** The API value spells it with an underscore; the label key does not. */
export const SORT_LABELS = {
  recent: 'public.sortOptions.recent',
  popular: 'public.sortOptions.popular',
  most_liked: 'public.sortOptions.mostLiked',
  most_forked: 'public.sortOptions.mostForked'
}

export function BrowseFilterSheet({ open, onClose, category, onCategory, sort, onSort }) {
  const { t } = useTranslation()
  const isCategory = open === 'category'

  return (
    <BottomSheet visible={Boolean(open)} onClose={onClose} title={isCategory ? t('public.category') : t('public.sortBy')}>
      <ScrollView style={{ maxHeight: 420 }}>
        {isCategory ? (
          <View>
            <ChoiceRow
              label={t('public.all')}
              chosen={!category}
              onPress={() => {
                onCategory('')
                onClose?.()
              }}
            />
            <Divider />
            {CATEGORIES.map((key) => (
              <ChoiceRow
                key={key}
                label={t(`public.categories.${key}`)}
                chosen={category === key}
                onPress={() => {
                  onCategory(key)
                  onClose?.()
                }}
              />
            ))}
          </View>
        ) : (
          <View>
            {SORTS.map((value) => (
              <ChoiceRow
                key={value}
                label={t(SORT_LABELS[value])}
                chosen={sort === value}
                onPress={() => {
                  onSort(value)
                  onClose?.()
                }}
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

/** One option. `radio`, because exactly one of these is true at a time. */
function ChoiceRow({ label, chosen, onPress }) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='radio'
      accessibilityLabel={label}
      accessibilityState={{ selected: chosen }}
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

export default BrowseFilterSheet
