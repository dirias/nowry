import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/joy'
import { useTranslation } from 'react-i18next'

/**
 * StepIdentity — Step 1
 * Language preference selection.
 *
 * Props:
 *   language           {string}
 *   onChangeLanguage   {(value: string) => void}
 *   themeColor         {string}
 *   availableLanguages {Array<{ value, label, flag }>}
 *   headingRef         {React.Ref}
 */
const StepIdentity = ({ language, onChangeLanguage, themeColor, availableLanguages, headingRef }) => {
  const { t } = useTranslation()

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
        {t('onboarding.identity.title')}
      </Typography>
      <Typography level='body-sm' sx={{ mb: 3, color: 'text.secondary' }}>
        {t('onboarding.identity.subtitle')}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
          gap: 1.5
        }}
      >
        {availableLanguages.map((lang) => {
          const isSelected = language === lang.value
          return (
            <Card
              key={lang.value}
              variant='outlined'
              role='radio'
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChangeLanguage(lang.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChangeLanguage(lang.value)
                }
              }}
              sx={{
                cursor: 'pointer',
                transition: 'all 200ms ease',
                borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                bgcolor: isSelected ? `${themeColor}12` : 'background.surface',
                boxShadow: isSelected ? `0 0 0 2px ${themeColor}40` : 'none',
                '&:hover': {
                  borderColor: themeColor,
                  bgcolor: isSelected ? `${themeColor}18` : 'background.level1'
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.outlinedBorder',
                  outlineOffset: 2
                }
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1.5 }}>
                <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{lang.flag}</Typography>
                <Typography level='body-sm' textAlign='center' fontWeight={isSelected ? 600 : 400}>
                  {lang.label}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Box>
  )
}

export default StepIdentity
