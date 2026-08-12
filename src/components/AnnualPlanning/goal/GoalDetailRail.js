import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button } from '@mui/joy'
import { Add as AddIcon, Tune as TuneIcon } from '@mui/icons-material'
import { focusRing } from './goalStyles'

/**
 * GoalDetailRail — the progressive-disclosure mechanism for the goal form.
 *
 * A single wrapping row of named chips under the title. Each states its own
 * payload, reveals only its own group, and removes itself on use, so a user who
 * fills everything in ends with zero disclosure chrome on screen.
 *
 * Chosen over an accordion deliberately: ADR-003 removed accordions from the
 * goal card for gatewaying content behind unlabelled chevrons, and an accordion
 * header is permanent chrome whether or not it is ever opened. A chip reading
 * "Add an image" cannot promise hidden content and fail to deliver it — there
 * is nothing behind it, it is a creation offer.
 *
 * Pure and stateless: the parent owns the revealed set.
 */
const CHIP_LABELS = {
  milestones: 'annualPlanning.goal.addMilestones',
  description: 'annualPlanning.goal.addDescription',
  targetDate: 'annualPlanning.goal.addTargetDate',
  image: 'annualPlanning.goal.addImage',
  // An override of an already-correct value, not an addition — hence the
  // different icon, and it is always ordered last.
  timeframe: 'annualPlanning.goal.changeTimeframe'
}

const GoalDetailRail = ({ available = [], onReveal }) => {
  const { t } = useTranslation()

  // No empty container and no residual margin once everything is revealed.
  if (available.length === 0) return null

  return (
    <Box role='group' aria-label={t('annualPlanning.goal.detailRailAria')} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {available.map((group) => (
        <Button
          key={group}
          size='sm'
          variant='soft'
          color='neutral'
          onClick={() => onReveal(group)}
          startDecorator={group === 'timeframe' ? <TuneIcon sx={{ fontSize: 14 }} /> : <AddIcon sx={{ fontSize: 14 }} />}
          sx={{
            fontWeight: 500,
            // The visible label is the accessible name; no redundant aria-label.
            minHeight: { xs: 44, sm: 32 },
            ...focusRing
          }}
        >
          {t(CHIP_LABELS[group])}
        </Button>
      ))}
    </Box>
  )
}

export default GoalDetailRail
