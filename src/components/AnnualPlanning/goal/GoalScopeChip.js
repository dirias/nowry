import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography } from '@mui/joy'

/**
 * The goal form's read-only scope line: which quarter (or the year) this goal
 * belongs to, plus its parent objective when it has one.
 *
 * Read-only by design. `type` and `quarter` decide which list a goal appears
 * in, and a goal saved with the silent `yearly` default vanishes from the
 * quarter view the user came from — unrecoverably, since a goal's quarter
 * cannot be edited today. Where the caller supplied scope this states it;
 * where it did not, the form shows the editable Select instead (§3.4).
 */
const GoalScopeChip = ({ quarter, parentTitle, hasParent }) => {
  const { t } = useTranslation()
  const quarterly = Boolean(quarter)

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 'md',
        bgcolor: quarterly ? 'primary.softBg' : 'neutral.softBg',
        border: '1px solid',
        borderColor: quarterly ? 'primary.outlinedBorder' : 'neutral.outlinedBorder'
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: quarterly ? 'primary.solidBg' : 'neutral.solidBg' }} />
      <Typography level='body-sm' sx={{ fontWeight: 600, color: quarterly ? 'primary.plainColor' : 'text.primary' }}>
        {quarterly ? t('annualPlanning.goal.scopeQuarterly', { quarter }) : t('annualPlanning.goal.scopeYearly')}
      </Typography>
      {hasParent && (
        <Typography level='body-sm' sx={{ color: 'text.secondary', minWidth: 0 }}>
          · {parentTitle || t('annualPlanning.goal.parentFallback')}
        </Typography>
      )}
    </Stack>
  )
}

export default GoalScopeChip
