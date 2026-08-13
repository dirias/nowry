import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'

import { ACTION_PHASE } from '../../hooks/useProgressivePreferences'
import { focusRing, touchTarget } from '../Common/Form/formStyles'

/**
 * OnboardingFieldSaveState — "is this actually saved?", said in one voice.
 *
 * This is ONB-009's `FieldSaveState` lifted into a module so Personalization
 * (ONB-010) reuses the vocabulary instead of inventing a second one. Two screens
 * disagreeing about what "Saved" looks like is exactly the drift FR-040 cannot
 * survive: the honesty signal only works if it is the same signal everywhere.
 *
 * The rule it exists to enforce: **nothing derives persistence from the visible
 * value.** `preferences.values` is what the user chose; `fields[f]` is what the
 * server has acknowledged, and only `justSaved` may print "Saved". A failure
 * keeps the choice on screen, names the field as unsaved and offers the retry
 * (FR-039) — it never rolls the selection back.
 *
 * Always mounted, so its later changes are actually announced, and polite rather
 * than assertive: a background write failing does not interrupt what the user is
 * doing. The banner that stops an action the user explicitly asked for is the
 * one that gets `role='alert'`. Every state pairs an icon with text, so none of
 * them is carried by colour alone (NFR-004).
 *
 * The key path is `onboarding.welcome.save.*`, inherited from ONB-009 rather
 * than duplicated into a second namespace with identical strings. It reads
 * oddly on this screen; the rename belongs with the pass that also switches
 * `WelcomeScreen` over to this module, which was off-limits here.
 *
 * @param {object}   props
 * @param {string}   [props.id]      Optional id, for callers that reference it from `aria-describedby`.
 * @param {object}   props.state     One entry of `preferences.fields`.
 * @param {Function} props.onRetry   Re-queues the visible draft for this field.
 * @param {object}   [props.sx]      Extra layout for the caller's own rhythm.
 */
const OnboardingFieldSaveState = ({ id, state, onRetry, sx }) => {
  const { t } = useTranslation()
  const isError = state?.phase === ACTION_PHASE.ERROR

  return (
    <Box id={id} role='status' aria-live='polite' sx={{ minWidth: 0, ...sx }}>
      {state?.isSaving && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          {t('onboarding.welcome.save.saving')}
        </Typography>
      )}

      {isError && (
        <Stack direction='row' spacing={0.75} alignItems='flex-start' sx={{ flexWrap: 'wrap' }}>
          <ErrorOutlineRounded sx={{ fontSize: 16, mt: '2px', color: 'danger.plainColor', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography level='body-xs' sx={{ color: 'danger.plainColor', fontWeight: 600 }}>
              {t('onboarding.welcome.save.unsaved')}
            </Typography>
            <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
              {t(failureKey(state?.error))}
            </Typography>
          </Box>
          {state?.canRetry && (
            <Button size='sm' variant='plain' color='danger' onClick={onRetry} sx={{ ...touchTarget, ...focusRing, flexShrink: 0 }}>
              {t('onboarding.welcome.save.retry')}
            </Button>
          )}
        </Stack>
      )}

      {!state?.isSaving && !isError && state?.justSaved && (
        <Stack direction='row' spacing={0.5} alignItems='center'>
          <CheckCircleRounded sx={{ fontSize: 16, color: 'success.plainColor', flexShrink: 0 }} />
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {t('onboarding.welcome.save.saved')}
          </Typography>
        </Stack>
      )}
    </Box>
  )
}

/**
 * Machine code → sentence. The hooks publish codes and no copy at all (ONB-005,
 * ONB-006), precisely so a server code nobody has translated yet cannot reach
 * the screen as raw English.
 */
const FAILURE_KEYS = {
  network_error: 'onboarding.failure.network',
  validation_error: 'onboarding.failure.rejected'
}

/**
 * @param   {{code?: string}|null} error Classified error from either hook.
 * @returns {string}                     A translation key that always resolves.
 */
export const failureKey = (error) => FAILURE_KEYS[error?.code] ?? 'onboarding.failure.unknown'

/** A field the hook has not reported on yet. Saved, because nothing changed. */
export const IDLE_FIELD = {
  phase: ACTION_PHASE.IDLE,
  error: null,
  isSaving: false,
  isConfirmed: true,
  justSaved: false,
  canRetry: false
}

export default OnboardingFieldSaveState
