import React from 'react'
import { Box, LinearProgress, Stack, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

/**
 * GEN-002 — the waiting state for an AI generation, everywhere.
 *
 * Reads a `useGenerationProgress` result and renders it. Three lines, of which
 * the bar is deliberately the least important: what actually makes a long wait
 * legible is being told what is happening (`stage`) and, where the surface has
 * it, seeing real output arrive. The bar is the frame around those.
 *
 * Accessibility (PRD A6): stage changes are announced through one polite live
 * region; the elapsed counter is not, because it would speak once a second.
 */
export default function GenerationProgress({ progress, label, detail, showElapsed = true, sx }) {
  const { t } = useTranslation()

  if (!progress?.visible) return null

  const { value, stage, elapsedSeconds } = progress
  const stageText = stage?.msgKey ? t(stage.msgKey) : null

  return (
    <Box sx={{ width: '100%', ...sx }}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline', mb: 0.75 }}>
        <Typography level='body-sm' sx={{ color: 'text.secondary', minWidth: 0 }}>
          {label}
        </Typography>
        {detail && (
          <Typography level='body-sm' sx={{ color: 'text.tertiary', ml: 'auto', flexShrink: 0 }}>
            {detail}
          </Typography>
        )}
      </Stack>

      <LinearProgress
        determinate
        value={value}
        aria-label={label}
        sx={{
          borderRadius: 'sm',
          // The value steps once a second; the fill is transitioned so it reads as
          // continuous movement rather than a stutter. `--LinearProgress-percent`
          // is a plain custom property and cannot be transitioned, but the
          // `inline-size` it computes can.
          '&::before': { transition: 'inline-size 1s linear' },
          '@media (prefers-reduced-motion: reduce)': { '&::before': { transition: 'none' } }
        }}
      />

      {(stageText || showElapsed) && (
        <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline', mt: 0.75 }}>
          {/* Live region holds the stage text alone. */}
          <Box role='status' aria-live='polite' sx={{ minWidth: 0 }}>
            {stageText && (
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {stage.icon ? `${stage.icon} ${stageText}` : stageText}
              </Typography>
            )}
          </Box>
          {showElapsed && (
            // Outside the live region and hidden from the accessibility tree: a
            // per-second announcement is noise, and the bar already carries the
            // progress a screen reader needs.
            <Typography
              level='body-xs'
              aria-hidden='true'
              sx={{ color: 'text.tertiary', ml: 'auto', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
            >
              {t('generation.elapsedSeconds', { seconds: elapsedSeconds })}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  )
}
