import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, DialogTitle, Typography } from '@mui/joy'

/**
 * The goal form's elevated header — part one of the three-part modal structure
 * (elevated header / scrollable content / sticky footer) required by
 * DESIGN_GUIDELINES §8.3.
 */
const GoalDialogHeader = ({ isEdit }) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.level1'
      }}
    >
      <DialogTitle level='h4' sx={{ m: 0 }}>
        {isEdit ? t('annualPlanning.goal.edit') : t('annualPlanning.goal.add')}
      </DialogTitle>
      {isEdit && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
          {t('annualPlanning.goal.editSubtitle')}
        </Typography>
      )}
    </Box>
  )
}

export default GoalDialogHeader
