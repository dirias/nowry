import React from 'react'
import { Alert, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { publishBlockKey, REMOVED_BY_MODERATION } from '@nowry/core/domain/publishListing'

/**
 * Publishing refused for good (ADMIN-003, FR-005, board M): an admin removed
 * this from Browse. The sentence is the danger alert; the caption under it says
 * what still works. Every web publish surface draws this one.
 */
export default function PublishRemovedNotice() {
  const { t } = useTranslation()
  return (
    <Stack gap={1} sx={{ width: '100%' }}>
      <Alert variant='soft' color='danger' role='alert'>
        {t(publishBlockKey(REMOVED_BY_MODERATION))}
      </Alert>
      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        {t('public.publishRemovedNote')}
      </Typography>
    </Stack>
  )
}
