import React from 'react'
import { Tune as TuneIcon } from '@mui/icons-material'

import FormDisclosureRail from '../../Common/Form/FormDisclosureRail'

/**
 * GoalDetailRail — the goal form's chip labels and icons, over the shared rail.
 *
 * `FormDisclosureRail` is a parameterization of what this file used to be: the
 * label map and the icon ternary were the only goal-specific things in it, and
 * both are props now. Keeping this adapter means the goal form still names its
 * own groups while there is exactly one rail implementation in the app — two
 * would drift on the first fix, which is the failure mode the form system
 * exists to prevent (UX-CONTRACT §7.1).
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

const CHIP_ICONS = { timeframe: TuneIcon }

const GoalDetailRail = ({ available = [], onReveal }) => (
  <FormDisclosureRail
    available={available}
    labels={CHIP_LABELS}
    icons={CHIP_ICONS}
    onReveal={onReveal}
    ariaLabelKey='annualPlanning.goal.detailRailAria'
  />
)

export default GoalDetailRail
