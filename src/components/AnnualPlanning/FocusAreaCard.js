import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Stack } from '@mui/joy'
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material'
import { measureFill, measureTrack, readout } from '../Common/Form/formStyles'

/**
 * FocusAreaCard — one focus area on the Overview tab.
 *
 * Extracted from the inline markup in OverviewTabView. The old card had no border
 * and an `mt: 'auto'` progress row, so it read as a loose row padded out to ~200px
 * of dead air rather than as a card. This version is bordered, clamped and compact.
 *
 * The goal count is deliberate: at 0% the progress row otherwise carries no
 * information at all, which is exactly the state every new plan starts in.
 */
const FocusAreaCard = ({ area, progress, goalCount, to }) => {
  const { t } = useTranslation()

  return (
    <Box
      component={Link}
      to={to}
      aria-label={area.name}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: { xs: 2, md: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 'lg',
        textDecoration: 'none',
        color: 'inherit',
        // Hover is a ground, never a lift: a card is content, and the only depth
        // on the page is the key's edge (ELEVATION.md §2, SITE-012).
        '&:hover': {
          bgcolor: 'background.level1',
          '& .hover-arrow': { opacity: 1 }
        },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
      }}
    >
      <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 0.5 }}>
        <Typography component='span' sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
          {area.icon}
        </Typography>
        <Typography level='title-md' sx={{ flex: 1, minWidth: 0 }} noWrap>
          {area.name}
        </Typography>
        {/* Hidden until hover: the whole card is a link and already lifts, so a
            permanently visible arrow was decoration competing with the content. */}
        <ArrowForwardIcon
          className='hover-arrow'
          sx={{ fontSize: 18, color: 'primary.plainColor', opacity: 0, transition: 'opacity 0.2s' }}
        />
      </Stack>

      <Typography
        level='body-sm'
        sx={{
          color: 'text.tertiary',
          mb: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          // Reserve exactly two lines whether or not the text fills them. Without
          // this, a one-line description floats its progress row higher than its
          // neighbours' — visible raggedness now that `mt: 'auto'` is gone.
          lineHeight: 1.4,
          minHeight: '2.8em'
        }}
      >
        {area.description}
      </Typography>

      {/* No `mt: 'auto'` here on purpose — pushing this row to the bottom is what
          padded the old card out to ~200px. The 2-line clamp above already keeps
          the progress rows aligned across a grid row. */}
      {/* The row anatomy every list in the product uses (§15.11, SITE-012): the
          measure, then its percent as a tabular readout on the right, then the count. */}
      <Stack direction='row' spacing={1} alignItems='center'>
        <Box sx={{ ...measureTrack, width: 'auto', flex: 1, flexShrink: 1 }}>
          <Box sx={measureFill(progress)} />
        </Box>
        <Typography level='body-xs' sx={{ ...readout, fontSize: 'xs', width: 34, textAlign: 'right' }}>
          {progress}%
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', whiteSpace: 'nowrap' }}>
          {t('annualPlanning.overview.areaGoalCount', { count: goalCount })}
        </Typography>
      </Stack>
    </Box>
  )
}

export default FocusAreaCard
