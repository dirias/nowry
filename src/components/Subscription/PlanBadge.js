import React from 'react'
import { Chip } from '@mui/joy'
import { useTheme } from '@mui/joy/styles'
import { useTranslation } from 'react-i18next'
import { betaBadgeTone, planBadge } from '@nowry/core/domain/access'

/**
 * The plan an account wears, wherever "Pro" is shown (ADR-079, FR-025).
 *
 * An account that pays shows its plan in the learner's accent, as it always
 * has. A tester shows "Beta" in the same chip, in Ink Teal. A free account
 * shows nothing, unless `showFree` asks for its plan to be named.
 */
const PlanBadge = ({ subscription, size = 'sm', showFree = false, sx }) => {
  const { t } = useTranslation()
  const mode = useTheme().palette.mode
  const badge = planBadge(subscription)

  if (!badge) {
    if (!showFree) return null
    return (
      <Chip size={size} variant='soft' color='neutral' sx={sx}>
        {t('subscription.tier.free')}
      </Chip>
    )
  }

  if (badge.kind === 'beta') {
    const tone = betaBadgeTone(mode)
    return (
      <Chip size={size} variant='solid' sx={{ bgcolor: tone.bg, color: tone.color, ...sx }}>
        {t(badge.labelKey)}
      </Chip>
    )
  }

  return (
    <Chip size={size} variant='soft' color='primary' sx={sx}>
      {t(badge.labelKey)}
    </Chip>
  )
}

export default PlanBadge
