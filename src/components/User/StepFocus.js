import React from 'react'
import { Box, Typography, Card, CardContent, Chip, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'

/**
 * StepFocus — Step 3
 * Primary topic (single select) and study goal (single select chips).
 *
 * Props:
 *   topic         {string}
 *   goal          {string}
 *   onChangeTopic {(value: string) => void}
 *   onChangeGoal  {(value: string) => void}
 *   themeColor    {string}
 *   headingRef    {React.Ref}
 */
const StepFocus = ({ topic, goal, onChangeTopic, onChangeGoal, themeColor, headingRef }) => {
  const { t } = useTranslation()

  const availableTopics = [
    { value: 'technology', label: t('onboarding.focus.topics.technology'), icon: '💻' },
    { value: 'science', label: t('onboarding.focus.topics.science'), icon: '🔬' },
    { value: 'history', label: t('onboarding.focus.topics.history'), icon: '📜' },
    { value: 'languages', label: t('onboarding.focus.topics.languages'), icon: '🌐' },
    { value: 'art', label: t('onboarding.focus.topics.art'), icon: '🎨' },
    { value: 'mathematics', label: t('onboarding.focus.topics.mathematics'), icon: '📐' },
    { value: 'literature', label: t('onboarding.focus.topics.literature'), icon: '📚' },
    { value: 'business', label: t('onboarding.focus.topics.business'), icon: '💼' }
  ]

  const studyGoals = [
    { value: 'general', label: t('onboarding.learning.goals.general') },
    { value: 'academic', label: t('onboarding.learning.goals.academic') },
    { value: 'career', label: t('onboarding.learning.goals.career') },
    { value: 'language', label: t('onboarding.learning.goals.language') },
    { value: 'hobby', label: t('onboarding.learning.goals.hobby') }
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
        {t('onboarding.focus.title')}
      </Typography>
      <Typography level='body-sm' sx={{ mb: 3, color: 'text.secondary' }}>
        {t('onboarding.focus.subtitle')}
      </Typography>

      {/* Topic grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 1.5,
          mb: 3
        }}
      >
        {availableTopics.map((item) => {
          const isSelected = topic === item.value
          return (
            <Card
              key={item.value}
              variant='outlined'
              role='radio'
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChangeTopic(item.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChangeTopic(item.value)
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
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</Typography>
                <Typography level='body-sm' fontWeight={isSelected ? 600 : 400}>
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {/* Goal chips */}
      <Stack direction='row' flexWrap='wrap' gap={1}>
        {studyGoals.map((g) => {
          const isSelected = goal === g.value
          return (
            <Chip
              key={g.value}
              variant={isSelected ? 'solid' : 'outlined'}
              size='md'
              onClick={() => onChangeGoal(g.value)}
              aria-pressed={isSelected}
              sx={{
                cursor: 'pointer',
                bgcolor: isSelected ? themeColor : 'transparent',
                borderColor: isSelected ? themeColor : 'neutral.outlinedBorder',
                color: isSelected ? 'white' : 'text.primary',
                transition: 'all 200ms ease',
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
              {g.label}
            </Chip>
          )
        })}
      </Stack>
    </Box>
  )
}

export default StepFocus
