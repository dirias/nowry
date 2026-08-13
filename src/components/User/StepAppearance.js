import React from 'react'
import { Box, Typography, Card, CardContent, Stack } from '@mui/joy'
import { CheckRounded, LightMode, DarkMode } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

/**
 * StepAppearance — Step 2
 * Theme mode (light/dark) and accent color selection.
 *
 * Props:
 *   themeMode     {'light' | 'dark'}
 *   themeColor    {string}
 *   onChangeMode  {(mode: string) => void}
 *   onChangeColor {(color: string) => void}
 *   colorPresets  {Array<{ color: string, label: string }>}
 *   headingRef    {React.Ref}
 */
const StepAppearance = ({ themeMode, themeColor, onChangeMode, onChangeColor, colorPresets, headingRef }) => {
  const { t } = useTranslation()

  const modes = [
    { value: 'light', label: t('onboarding.theme.light'), Icon: LightMode },
    { value: 'dark', label: t('onboarding.theme.dark'), Icon: DarkMode }
  ]

  return (
    <Box>
      <Typography
        level='h3'
        ref={headingRef}
        tabIndex={-1}
        sx={{
          mb: 0.5,
          outline: 'none',
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', borderRadius: 'xs' }
        }}
      >
        {t('onboarding.appearance.title')}
      </Typography>
      <Typography level='body-sm' sx={{ mb: 3, color: 'text.secondary' }}>
        {t('onboarding.appearance.subtitle')}
      </Typography>

      {/* Mode selection */}
      <Stack direction='row' spacing={2} sx={{ mb: 3 }}>
        {modes.map(({ value, label, Icon }) => {
          const isSelected = themeMode === value
          return (
            <Card
              key={value}
              variant='outlined'
              role='radio'
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChangeMode(value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChangeMode(value)
                }
              }}
              sx={{
                flex: 1,
                cursor: 'pointer',
                transition: 'all 200ms ease',
                borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                bgcolor: isSelected ? `${themeColor}12` : 'background.surface',
                '&:hover': { borderColor: themeColor },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.outlinedBorder',
                  outlineOffset: 2
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Icon
                  sx={{
                    fontSize: 36,
                    mb: 1,
                    color: isSelected ? themeColor : 'text.secondary'
                  }}
                />
                <Typography level='title-md'>{label}</Typography>
              </CardContent>
            </Card>
          )
        })}
      </Stack>

      {/* Color swatch grid */}
      <Box
        role='radiogroup'
        aria-label={t('onboarding.appearance.colorGroupLabel')}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        {colorPresets.map((preset) => {
          const isSelected = themeColor === preset.color
          return (
            <Box
              key={preset.color}
              role='radio'
              aria-checked={isSelected}
              aria-label={t('onboarding.appearance.colorLabel', { name: preset.label })}
              title={preset.label}
              tabIndex={0}
              onClick={() => onChangeColor(preset.color)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChangeColor(preset.color)
                }
              }}
              sx={{
                width: 56,
                height: 56,
                borderRadius: 'md',
                bgcolor: preset.color,
                cursor: 'pointer',
                border: '3px solid',
                borderColor: isSelected ? 'text.primary' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
                '&:hover': { transform: 'scale(1.08)' },
                '&:focus-visible': {
                  outline: `3px solid ${preset.color}`,
                  outlineOffset: 2
                }
              }}
            >
              {isSelected && <CheckRounded sx={{ color: 'white', fontSize: 20 }} />}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default StepAppearance
