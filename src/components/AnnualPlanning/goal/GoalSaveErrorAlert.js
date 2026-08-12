import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Typography } from '@mui/joy'

/**
 * The goal form's save failure.
 *
 * Inline rather than a Snackbar on purpose. §13.5's decision table routes async
 * API errors to Snackbar, but a Snackbar behind a modal scrim is the wrong
 * surface for an error the user has to act on inside that modal, and it
 * auto-hides after four seconds while the failed form is still open.
 *
 * `detail` is already flattened by describeApiError, which turns FastAPI's
 * array-shaped 422 and its string-shaped HTTPException into one readable line
 * so the user sees which field was rejected instead of a bare "AxiosError".
 */
const GoalSaveErrorAlert = React.forwardRef(({ detail }, ref) => {
  const { t } = useTranslation()

  return (
    <Box ref={ref} sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 2 }}>
      <Alert variant='soft' color='danger' role='alert' sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography level='title-sm' sx={{ color: 'danger.plainColor' }}>
            {t('annualPlanning.goal.saveError')}
          </Typography>
          {detail && (
            <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.5, wordBreak: 'break-word' }}>
              {detail}
            </Typography>
          )}
        </Box>
      </Alert>
    </Box>
  )
})

GoalSaveErrorAlert.displayName = 'GoalSaveErrorAlert'

export default GoalSaveErrorAlert
