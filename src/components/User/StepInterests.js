import React from 'react'
import { Box, Typography, Chip } from '@mui/joy'
import { useTranslation } from 'react-i18next'

/**
 * StepInterests — Step 4
 * Multi-select interest chips that populate the home news feed.
 *
 * Props:
 *   interests        {string[]}               — array of selected values
 *   onToggleInterest {(value: string) => void} — adds or removes a value
 *   themeColor       {string}
 *   headingRef       {React.Ref}
 */
const StepInterests = ({ interests, onToggleInterest, themeColor, headingRef }) => {
  const { t } = useTranslation()

  const interestOptions = [
    { value: 'artificial_intelligence', label: t('onboarding.interests.items.ai'), icon: '🤖' },
    { value: 'technology', label: t('onboarding.interests.items.technology'), icon: '💻' },
    { value: 'science', label: t('onboarding.interests.items.science'), icon: '🔬' },
    { value: 'mathematics', label: t('onboarding.interests.items.mathematics'), icon: '📐' },
    { value: 'history', label: t('onboarding.interests.items.history'), icon: '📜' },
    { value: 'languages', label: t('onboarding.interests.items.languages'), icon: '🌐' },
    { value: 'literature', label: t('onboarding.interests.items.literature'), icon: '📚' },
    { value: 'art', label: t('onboarding.interests.items.art'), icon: '🎨' },
    { value: 'music', label: t('onboarding.interests.items.music'), icon: '🎵' },
    { value: 'business', label: t('onboarding.interests.items.business'), icon: '💼' },
    { value: 'health', label: t('onboarding.interests.items.health'), icon: '🏃' },
    { value: 'philosophy', label: t('onboarding.interests.items.philosophy'), icon: '🧠' },
    { value: 'design', label: t('onboarding.interests.items.design'), icon: '✏️' },
    { value: 'psychology', label: t('onboarding.interests.items.psychology'), icon: '💭' }
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
        {t('onboarding.interests.title')}
      </Typography>
      <Typography level='body-sm' sx={{ mb: 1, color: 'text.secondary' }}>
        {t('onboarding.interests.subtitle')}
      </Typography>

      <Box role='group' aria-label={t('onboarding.interests.groupLabel')} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 3 }}>
        {interestOptions.map((item) => {
          const isSelected = interests.includes(item.value)
          return (
            <Chip
              key={item.value}
              variant={isSelected ? 'solid' : 'outlined'}
              size='lg'
              startDecorator={<Typography sx={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</Typography>}
              onClick={() => onToggleInterest(item.value)}
              aria-pressed={isSelected}
              sx={{
                cursor: 'pointer',
                bgcolor: isSelected ? themeColor : 'transparent',
                borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                color: isSelected ? 'white' : 'text.primary',
                transition: 'all 200ms ease',
                transform: isSelected ? 'translateY(-1px)' : 'none',
                boxShadow: isSelected ? `0 2px 8px ${themeColor}40` : 'none',
                '&:hover': {
                  borderColor: themeColor,
                  bgcolor: isSelected ? themeColor : `${themeColor}12`
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.outlinedBorder',
                  outlineOffset: 2
                }
              }}
            >
              {item.label}
            </Chip>
          )
        })}
      </Box>
    </Box>
  )
}

export default StepInterests
