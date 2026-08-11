import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, LinearProgress, Typography } from '@mui/joy'
import { GOAL_STATE_COLOR } from '../goalDerivation'

/**
 * GoalProgressBar — magnitude by length, health by colour.
 *
 * Replaces two hand-rolled Box-in-Box bars that were painted with the focus
 * area's identity colour, which made an 86%-complete On Track goal render red.
 * Joy's LinearProgress brings role='progressbar' for free; the caption below it
 * is a milestone *count* rather than the old "X% Complete" string, because a
 * count is actionable and a percentage merely restates the bar.
 *
 * `dense` drops the caption for the list row, where the bar is a 120px sliver
 * and the count would not fit.
 */
const GoalProgressBar = ({ percent = 0, state, completed = 0, total = 0, isMilestoneBased = false, dense = false }) => {
  const { t } = useTranslation()

  const countLabel = isMilestoneBased
    ? t('annualPlanning.goal.milestoneCount', { completed, total, count: total })
    : t('annualPlanning.goal.percentComplete', { percent })

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress
        determinate
        value={Math.min(Math.max(percent, 0), 100)}
        variant='soft'
        color={GOAL_STATE_COLOR[state] || 'neutral'}
        thickness={6}
        aria-label={t('annualPlanning.goal.progress')}
        // Screen readers otherwise announce a bare "57%", which says nothing
        // about what is left to do. The count does.
        aria-valuetext={countLabel}
        sx={{
          // Contract §2.2: the track is neutral chrome, never a tinted echo of
          // the state colour — only the fill carries health.
          bgcolor: 'background.level2',
          borderRadius: 'sm',
          transition: 'all 0.3s ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        }}
      />
      {!dense && (
        <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
          {countLabel}
        </Typography>
      )}
    </Box>
  )
}

export default GoalProgressBar
