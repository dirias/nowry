import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, List, ListItem, Stack, Typography } from '@mui/joy'

import FormSheet from '../Common/Form/FormSheet'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The question a drop leaves behind when some of its files were already in the
 * library (ADR-066, IMPORT-020).
 *
 * Importing the same file twice used to make two identical documents without a
 * word. A copy is sometimes wanted — a second pass at the same notes — so the
 * files are neither dropped nor imported silently: they are listed beside the
 * documents they would duplicate, and the reader says which it is.
 */
const actionSx = { width: { xs: '100%', sm: 'auto' }, minHeight: 44, ...focusRing }

export default function DuplicateImportsDialog({ duplicates = [], onSkip, onImportCopies, loading = false }) {
  const { t } = useTranslation()
  const count = duplicates.length
  const handleClose = () => {
    if (!loading) onSkip()
  }

  return (
    <FormSheet
      open={count > 0}
      onClose={handleClose}
      titleKey='books.import.duplicatesTitle'
      titleValues={{ count }}
      width='simple'
      footer={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='space-between'>
          <Button variant='plain' color='neutral' onClick={handleClose} disabled={loading} sx={actionSx}>
            {t('books.import.duplicatesSkip')}
          </Button>
          <Button variant='solid' loading={loading} onClick={onImportCopies} sx={actionSx}>
            {t('books.import.duplicatesImport', { count })}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Typography level='body-md' sx={{ color: 'text.primary' }}>
          {t('books.import.duplicatesBody', { count })}
        </Typography>
        <List size='sm' sx={{ '--ListItem-paddingX': 0 }} data-testid='import-duplicates'>
          {duplicates.map(({ file, existing }, index) => (
            <ListItem key={`${file.name}-${index}`}>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('books.import.duplicateRow', { name: file.name, title: existing?.title || t('books.untitled') })}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </FormSheet>
  )
}
