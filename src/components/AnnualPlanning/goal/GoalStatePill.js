import React from 'react'
import { useTranslation } from 'react-i18next'
import { Chip } from '@mui/joy'
import { GOAL_STATE_COLOR, GOAL_STATE_I18N } from '../goalDerivation'

/**
 * GoalStatePill — the ONE chip that carries a goal's health.
 *
 * Replaces two copies of the health-colour map plus two hand-rolled lifecycle
 * <Box> pills. Colour on a goal means health and nothing else (ADR-003), and
 * the pill always renders its text label alongside the colour, so it is
 * colourblind-safe by construction rather than by convention.
 */
const GoalStatePill = ({ state, size = 'sm' }) => {
  const { t } = useTranslation()
  if (!state || !GOAL_STATE_COLOR[state]) return null

  return (
    <Chip size={size} variant='soft' color={GOAL_STATE_COLOR[state]} sx={{ flexShrink: 0 }}>
      {t(`annualPlanning.goal.healthStatus.${GOAL_STATE_I18N[state]}`)}
    </Chip>
  )
}

export default GoalStatePill
