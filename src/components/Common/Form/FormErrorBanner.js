import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Typography } from '@mui/joy'

import { focusRing } from './formStyles'
import { scrollIntoViewSafely } from './formUtils'

/**
 * FormErrorBanner — the one save-failure surface.
 *
 * Inline rather than a Snackbar, deliberately: a Snackbar behind a modal scrim
 * is the wrong surface for an error the user has to act on *inside* that modal,
 * and it auto-hides after four seconds while the failed form is still open.
 *
 * `detailText` arrives already flattened by describeApiError, which turns
 * FastAPI's array-shaped 422 and its string-shaped HTTPException into one
 * readable line — so the user sees which field was rejected instead of a bare
 * "AxiosError". Five of the seven surfaces have no error flattening at all
 * today, and the visual card catches its save failure and only console.errors
 * it, so the save fails completely silently.
 *
 * `action` unifies the 403 subscription-limit case that two card modals
 * hand-roll and three do not handle at all.
 *
 * Announced via role='alert' and scrolled into view on appearance, because on a
 * long form the user can press Save and otherwise see nothing move. Focus stays
 * on the primary action so retry is one keypress (§8.6).
 */
const FormErrorBanner = React.forwardRef(({ detailText, titleKey = 'form.saveErrorTitle', action = null }, ref) => {
  const { t } = useTranslation()
  const localRef = React.useRef(null)

  useEffect(() => {
    // 'nearest' so a banner already on screen is not re-scrolled under an open
    // keyboard. The ref is forwarded, so honour whichever one is attached.
    scrollIntoViewSafely(localRef.current)
  }, [])

  return (
    <Box
      ref={(node) => {
        localRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
    >
      <Alert
        variant='soft'
        color='danger'
        role='alert'
        sx={{ alignItems: 'flex-start', gap: 1.5 }}
        endDecorator={
          action && (
            <Button
              size='sm'
              variant='soft'
              color='danger'
              onClick={action.onClick}
              sx={{ flexShrink: 0, minHeight: { xs: 44, sm: 32 }, ...focusRing }}
            >
              {t(action.labelKey)}
            </Button>
          )
        }
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography level='title-sm' sx={{ color: 'danger.plainColor' }}>
            {t(titleKey)}
          </Typography>
          {detailText && (
            <Typography level='body-xs' sx={{ color: 'text.secondary', mt: 0.5, wordBreak: 'break-word' }}>
              {detailText}
            </Typography>
          )}
        </Box>
      </Alert>
    </Box>
  )
})

FormErrorBanner.displayName = 'FormErrorBanner'

export default FormErrorBanner
