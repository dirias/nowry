/**
 * StagePortraits — every portrait the user has generated for their current
 * form, and the ability to switch between them.
 *
 * Exists because generating used to be *destructive*: each stage held one
 * portrait, overwritten on every generation, so a Pro user with three
 * generations a month kept only the third and the other two were paid for and
 * thrown away. That made Generate a button you pressed at your own risk —
 * spending a scarce resource on a result that might be worse than what you
 * already had, with no way back. Keeping them makes generation purely
 * additive, which is the point.
 *
 * Deliberately scoped to the CURRENT stage. Being able to wear an earlier
 * form at a later stage would make the whole evolution arc cosmetic: the
 * companion's appearance is supposed to reflect what the user has earned.
 * Past forms live in the journey as history; this is a choice within the form
 * they are actually at.
 *
 * Renders nothing with fewer than two portraits — a picker offering one option
 * is not a choice, it is clutter.
 */
import React from 'react'
import { Box, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const StagePortraits = ({ portraits, wornUrl, stage, stageName, onWear, disabled }) => {
  const { t } = useTranslation()

  if (!portraits || portraits.length < 2) return null

  return (
    <Box>
      <Typography level='title-md' fontWeight={700} mb={0.5}>
        {stageName ? t('agent.companion.portraitsForStage', { stage: stageName }) : t('agent.companion.portraitsTitle')}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
        {t('agent.companion.portraitsDescription')}
      </Typography>

      <Box role='radiogroup' aria-label={t('agent.companion.portraitsTitle')} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {portraits.map((url, index) => {
          const worn = url === wornUrl
          return (
            <Box
              key={url}
              role='radio'
              aria-checked={worn}
              aria-label={t('agent.companion.portraitOption', { index: index + 1 })}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && !worn && onWear(stage, url)}
              onKeyDown={(e) => {
                if (disabled || worn) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onWear(stage, url)
                }
              }}
              sx={{
                position: 'relative',
                width: 92,
                height: 92,
                borderRadius: 'lg',
                overflow: 'hidden',
                cursor: disabled || worn ? 'default' : 'pointer',
                bgcolor: 'background.level1',
                border: '2px solid',
                borderColor: worn ? 'primary.solidBg' : 'transparent',
                opacity: disabled ? 0.5 : 1,
                transition: 'border-color 0.18s ease, transform 0.18s ease',
                '&:hover': disabled || worn ? undefined : { transform: 'translateY(-2px)' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.solidBg', outlineOffset: 2 }
              }}
            >
              <Box component='img' src={url} alt='' sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {worn && (
                <Box
                  sx={{
                    position: 'absolute',
                    insetInline: 0,
                    bottom: 0,
                    bgcolor: 'primary.solidBg',
                    color: 'primary.solidColor',
                    textAlign: 'center',
                    py: 0.25
                  }}
                >
                  <Typography level='body-xs' sx={{ color: 'inherit', fontWeight: 'lg' }}>
                    {t('agent.companion.portraitWorn')}
                  </Typography>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default StagePortraits
