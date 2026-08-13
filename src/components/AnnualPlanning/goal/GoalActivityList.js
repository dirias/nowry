import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'

/**
 * GoalActivityList — activities for one goal, passed in, never fetched.
 *
 * The two accordions this replaces each fired GET /goals/{id}/activities on
 * expand, for data GET /annual-plan/full already returns. Zero service imports
 * here is the point, not an accident.
 *
 * Returns null when the count is zero: an "Activities (0)" control promises
 * hidden content and delivers none, which is the failure ADR-003 names first.
 */
const GoalActivityList = ({ activities }) => {
  const { t, i18n } = useTranslation()
  const items = activities || []

  if (items.length === 0) return null

  return (
    <Stack spacing={1}>
      {items.map((activity) => (
        <Box key={activity._id} sx={{ py: 1, px: 1, borderRadius: 'sm', bgcolor: 'background.level1' }}>
          <Typography level='body-sm' sx={{ fontWeight: 600 }}>
            {activity.title}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {new Date(activity.created_at).toLocaleDateString(i18n.language)}
            {' · '}
            {t(`annualPlanning.activity.frequencies.${activity.frequency}`)}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

export default GoalActivityList
