import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button } from '@mui/joy'
import { Add as AddIcon } from '@mui/icons-material'

import { focusRing, touchTarget } from './formStyles'

/**
 * FormDisclosureRail — the progressive-disclosure mechanism, shared.
 *
 * A single wrapping row of named chips. Each states its own payload, reveals
 * only its own group, and removes itself on use, so a user who fills everything
 * in ends with zero disclosure chrome on screen.
 *
 * Chosen over an accordion deliberately: ADR-003 removed accordions for
 * gatewaying content behind unlabelled chevrons, and an accordion header is
 * permanent chrome whether or not it is ever opened. A chip reading "Add an
 * image" cannot promise hidden content and fail to deliver it — there is
 * nothing behind it, it is a creation offer.
 *
 * This is a parameterization of the shipped GoalDetailRail, not a rewrite: the
 * label map and the icon ternary were the only goal-specific things in it, and
 * both are now props. Everything else is carried over unchanged, which is what
 * makes the goal form's migration low-risk.
 *
 * Pure and stateless: the caller owns the revealed set.
 */
const FormDisclosureRail = ({ available = [], labels = {}, icons = {}, onReveal, ariaLabelKey = 'form.detailRailAria' }) => {
  const { t } = useTranslation()

  // No empty container and no residual margin once everything is revealed.
  if (available.length === 0) return null

  return (
    <Box role='group' aria-label={t(ariaLabelKey)} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {available.map((group) => {
        const Icon = icons[group] || AddIcon
        return (
          <Button
            key={group}
            size='sm'
            variant='soft'
            color='neutral'
            onClick={() => onReveal(group)}
            startDecorator={<Icon sx={{ fontSize: 14 }} />}
            sx={{
              fontWeight: 500,
              // The visible label is the accessible name; no redundant aria-label.
              ...touchTarget,
              ...focusRing
            }}
          >
            {t(labels[group] || group)}
          </Button>
        )
      })}
    </Box>
  )
}

export default FormDisclosureRail
