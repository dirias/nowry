import React from 'react'
import { Alert, Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { focusRing } from '../Common/Form/formStyles'

/**
 * The parts every admin list shares (FR-011, boards D, E, L): the filter chip,
 * and the loading, empty and error states each tab draws besides its rows.
 */

/**
 * A house filter chip: the engaged one on the level2 ground, said with
 * `aria-pressed`. `ariaLabel` names a chip whose text is short for something
 * ("ES" is Spanish); Joy's own `aria-labelledby` would read the short text.
 */
export const FilterChip = ({ on, label, ariaLabel, onClick, children }) => (
  <Chip
    size='sm'
    variant='soft'
    color='neutral'
    onClick={onClick}
    slotProps={{
      action: {
        'aria-pressed': on,
        'aria-label': ariaLabel ?? label,
        ...(ariaLabel ? { 'aria-labelledby': undefined } : {}),
        sx: focusRing
      }
    }}
    sx={{
      bgcolor: on ? 'background.level2' : 'background.level1',
      color: on ? 'text.primary' : 'text.secondary',
      fontWeight: on ? 'lg' : 'md',
      fontVariantNumeric: 'tabular-nums'
    }}
  >
    {children ?? label}
  </Chip>
)

/** Skeleton rows while the list loads (board L). */
export const LoadingRows = ({ label, testId }) => (
  <Stack aria-busy='true' aria-label={label} data-testid={testId}>
    {[70, 100, 85, 60].map((width) => (
      <Box key={width} sx={{ py: 1.5, px: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Skeleton variant='text' level='body-md' sx={{ width: `${width}%` }} />
      </Box>
    ))}
  </Stack>
)

/** Nothing to list: a title, and a hint when there is something to do about it. */
export const EmptyRows = ({ title, body }) => (
  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
    <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
      {title}
    </Typography>
    {body && (
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
        {body}
      </Typography>
    )}
  </Box>
)

/** The list could not be read: a danger alert and Try again. */
export const LoadError = ({ message, onRetry }) => {
  const { t } = useTranslation()
  return (
    <Stack gap={1.5} alignItems='flex-start'>
      <Alert variant='soft' color='danger' sx={{ alignSelf: 'stretch' }}>
        {message}
      </Alert>
      <Button size='sm' variant='soft' color='neutral' onClick={onRetry}>
        {t('admin.tryAgain')}
      </Button>
    </Stack>
  )
}
