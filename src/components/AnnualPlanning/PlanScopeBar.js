import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Typography, Select, Option, IconButton, Tooltip, LinearProgress, Dropdown, Menu, MenuButton, MenuItem } from '@mui/joy'
import {
  Edit as EditIcon,
  LightMode as DayIcon,
  LockRounded as LockRoundedIcon,
  AutoAwesome as AutoAwesomeRoundedIcon,
  MoreHoriz as MoreHorizIcon
} from '@mui/icons-material'
import AnnualPlanningTabBar from './AnnualPlanningTabBar'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

/**
 * Zone B of the Annual Planning persistent header — sticky, never unmounted.
 *
 * The quarter Select lives here rather than in Zone A because Goals and Reports
 * are quarter-scoped: scrolling a long goal list must never put the control that
 * defines what that list means out of reach.
 *
 * `collapsed` is driven by an IntersectionObserver in AnnualPlanningLayout (not a
 * scroll listener, which would re-render on every frame and jank this bar). Two
 * discrete states only — no interpolation.
 *
 * Layout: on md+ everything shares ONE row — [title?] [tabs] … [quarter] — because
 * the quarter Select on a row of its own rendered a ~53px band holding a single
 * 104px control pushed to the far right, i.e. pure dead space. On xs the Select and
 * the icon actions genuinely fill their row, so the tabs wrap below them instead
 * (`order` + `flexWrap`) rather than being crushed against a 104px Select at 375px.
 */
const PlanScopeBar = ({ collapsed, quarter, onQuarterChange, planTitle, progress, loading, onAIAssist, aiPanelOpen, tier }) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        bgcolor: 'background.body',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: collapsed ? 'xs' : 'none',
        // Applied in both states so collapsing does not jump the bar's height.
        // `justifyContent: flex-end` sends any slack above the tab row, keeping the
        // active-tab underline welded to the container's bottom border.
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        minHeight: 52,
        mb: 3,
        transition: 'min-height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
      }}
    >
      <Stack
        direction='row'
        alignItems='center'
        spacing={1}
        sx={{
          // Top padding only: the tab bar carries its own 8px below the labels, so
          // the active underline sits directly on the container's bottom border.
          pt: 0.75,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          rowGap: { xs: 0.75, md: 0 }
        }}
      >
        {collapsed && !loading && (
          <Typography
            level='title-sm'
            noWrap
            sx={{
              flex: { xs: 1, md: '0 1 auto' },
              maxWidth: { md: 240 },
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.primary'
            }}
          >
            {planTitle}
          </Typography>
        )}

        {/* On md this flex:1 item is what right-aligns the Select — no spacer needed. */}
        <Box
          sx={{
            order: { xs: 1, md: 0 },
            width: { xs: '100%', md: 'auto' },
            flex: { md: '1 1 auto' },
            minWidth: 0,
            alignSelf: { md: 'flex-end' }
          }}
        >
          <AnnualPlanningTabBar />
        </Box>

        {/* xs only, and only while there is no title to do the pushing: the tabs sit
            on their own wrapped line there, so nothing else right-aligns the Select. */}
        <Box sx={{ display: { xs: collapsed ? 'none' : 'block', md: 'none' }, flex: 1 }} />

        <Select
          value={quarter}
          onChange={(event, val) => val && onQuarterChange(val)}
          size='sm'
          variant='plain'
          aria-label={t('annualPlanning.header.quarterLabel')}
          placeholder={t('annualPlanning.header.quarterLabel')}
          slotProps={{ button: { 'aria-label': t('annualPlanning.header.quarterLabel') } }}
          sx={{
            minWidth: 104,
            flexShrink: 0,
            fontWeight: 600,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'background.level1', color: 'text.primary' },
            ...focusRing
          }}
        >
          <Option value='All'>{t('annualPlanning.home.allYear')}</Option>
          <Option value='1'>Q1</Option>
          <Option value='2'>Q2</Option>
          <Option value='3'>Q3</Option>
          <Option value='4'>Q4</Option>
        </Select>

        {/* Primary CTA — icon-only here. Always present on xs (Zone A drops its
            action cluster on small viewports), on md only once Zone A is gone. */}
        <Tooltip title={t('goalAi.buttonLabel')}>
          <IconButton
            size='sm'
            variant={aiPanelOpen ? 'solid' : 'outlined'}
            color='primary'
            onClick={onAIAssist}
            aria-label={t('goalAi.buttonLabel')}
            sx={{ display: { xs: 'inline-flex', md: collapsed ? 'inline-flex' : 'none' }, ...focusRing }}
          >
            {tier !== 'pro' ? <LockRoundedIcon fontSize='small' /> : <AutoAwesomeRoundedIcon fontSize='small' />}
          </IconButton>
        </Tooltip>

        <Tooltip title={t('annualPlanning.home.dailyRoutineBtn')}>
          <IconButton
            component={Link}
            to='/annual-planning/daily-routine'
            size='sm'
            variant='soft'
            color='warning'
            aria-label={t('annualPlanning.home.dailyRoutineBtn')}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, ...focusRing }}
          >
            <DayIcon fontSize='small' />
          </IconButton>
        </Tooltip>

        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{
              root: { size: 'sm', variant: 'plain', color: 'neutral', 'aria-label': t('annualPlanning.header.moreActions') }
            }}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, ...focusRing }}
          >
            <MoreHorizIcon fontSize='small' />
          </MenuButton>
          <Menu placement='bottom-end' size='sm'>
            <MenuItem component={Link} to='/annual-planning/setup'>
              <EditIcon fontSize='small' />
              {t('annualPlanning.home.editPlanBtn')}
            </MenuItem>
          </Menu>
        </Dropdown>
      </Stack>

      {/* Zone A's progress bar, collapsed to a hairline on Zone B's *top* edge.
          It cannot live on the bottom edge: the active tab's indicator is also a 2px
          primary-coloured rule on exactly that band, so the two rendered as one
          broken line and the selected tab became unreadable. Nudging it down only
          shrank the overlap — both are the same colour, so anything adjacent still
          read as one thick smear. The top edge is the one place in a 52px bar that
          no other rule occupies, and a progress hairline along the top of a pinned
          header is the conventional position for it anyway. */}
      {collapsed && !loading && (
        <LinearProgress
          determinate
          value={progress}
          thickness={2}
          aria-hidden='true'
          sx={{
            '--LinearProgress-radius': '0px',
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bgcolor: 'transparent',
            color: 'primary.solidBg'
          }}
        />
      )}
    </Box>
  )
}

export default PlanScopeBar
