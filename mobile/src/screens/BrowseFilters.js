/**
 * The catalogue's two filters, as one sheet (MOB-049).
 *
 * Category and sort are single-choice, unlike the calendar's, so this one does
 * close on a pick — a sheet that stayed open after the only choice it takes
 * would be asking the user to dismiss it for no reason. `ChoiceSheet` is where
 * that rule lives now; this file is the catalogue's own two lists (MOB-064).
 *
 * The seventeen categories are the web's own list and the four sorts are its
 * own values. The API takes `most_liked`; the label key spells it `mostLiked`.
 * Both are written here rather than derived from each other, because guessing
 * one from the other is how a filter silently stops filtering.
 */
import { useTranslation } from 'react-i18next'
import { ChoiceRow, ChoiceSheet, Divider } from '../ui'

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

  return isCategory ? (
    <ChoiceSheet
      visible={Boolean(open)}
      onClose={onClose}
      title={t('public.category')}
      value={category}
      onChange={onCategory}
      options={CATEGORIES.map((key) => ({ value: key, label: t(`public.categories.${key}`) }))}
    >
      {/* "All" is the absence of a category, not one of them, so it leads the
          list rather than sitting inside it. */}
      <ChoiceRow
        label={t('public.all')}
        chosen={!category}
        role='radio'
        onPress={() => {
          onCategory('')
          onClose?.()
        }}
      />
      <Divider />
    </ChoiceSheet>
  ) : (
    <ChoiceSheet
      visible={Boolean(open)}
      onClose={onClose}
      title={t('public.sortBy')}
      value={sort}
      onChange={onSort}
      options={SORTS.map((value) => ({ value, label: t(SORT_LABELS[value]) }))}
    />
  )
}

export default BrowseFilterSheet
