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
 * every time. Both rules are `ChoiceSheet`'s now; this file is the library's
 * own two lists (MOB-064).
 */
import { useTranslation } from 'react-i18next'
import { SORTS } from '@nowry/core/domain/books/libraryQuery'
import { ChoiceRow, ChoiceSheet, Divider } from '../ui'

export function LibraryFilterSheet({ open, onClose, sort, onSort, tags, onTags, available = [] }) {
  const { t } = useTranslation()

  return open === 'tags' ? (
    <ChoiceSheet
      visible
      multiple
      onClose={onClose}
      title={t('books.lib.tags')}
      value={tags}
      onChange={onTags}
      options={available.map(({ tag, count }) => ({ value: tag, label: tag, count }))}
      extra={
        tags.length > 0 ? (
          <>
            <Divider />
            <ChoiceRow label={t('books.lib.clearTags')} role='button' onPress={() => onTags([])} />
          </>
        ) : null
      }
    />
  ) : (
    <ChoiceSheet
      visible={Boolean(open)}
      onClose={onClose}
      title={t('books.lib.sortAria')}
      value={sort}
      onChange={onSort}
      options={SORTS.map((value) => ({ value, label: t(`books.lib.sortBy.${value}`) }))}
    />
  )
}

export default LibraryFilterSheet
