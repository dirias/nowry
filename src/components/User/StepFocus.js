import React from 'react'
import { Box, Typography, Card, CardContent, Chip, Stack } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { TOPICS, STUDY_GOALS } from '../../constants/learningTaxonomy'

/**
 * This step has always shown a curated 8-topic grid rather than the full
 * taxonomy — the values below select from TOPICS, they do not redefine it.
 * Keeping the subset preserves the existing layout; the labels, icons and
 * wire values all still come from the single source of truth.
 */
const FOCUS_TOPIC_VALUES = ['technology', 'science', 'history', 'languages', 'art', 'mathematics', 'literature', 'business']

const FOCUS_TOPICS = FOCUS_TOPIC_VALUES.map((value) => TOPICS.find((topic) => topic.value === value))

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
        {FOCUS_TOPICS.map((item) => {
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
                  {t(item.i18nKey)}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {/* Goal chips */}
      <Stack direction='row' flexWrap='wrap' gap={1}>
        {STUDY_GOALS.map((g) => {
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
              {t(g.i18nKey)}
            </Chip>
          )
        })}
      </Stack>
    </Box>
  )
}

export default StepFocus
