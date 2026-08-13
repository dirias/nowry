import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Skeleton,
  LinearProgress,
  IconButton,
  Tooltip,
  Dropdown,
  Menu,
  MenuItem,
  MenuButton,
  ListDivider
} from '@mui/joy'
import {
  Timeline as TimelineIcon,
  Edit as EditIcon,
  LightMode as DayIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  LockRounded as LockRoundedIcon,
  AutoAwesome as AutoAwesomeRoundedIcon,
  MoreVert as MoreVertIcon,
  Tune as TuneIcon,
  DeleteOutline as DeleteOutlineIcon,
  AddTask as AddTaskIcon,
  EventAvailable as EventAvailableIcon
} from '@mui/icons-material'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

// Every tier shares this metric box so the three buttons read as one control group
// rather than three unrelated widgets.
const tierShape = { minHeight: 36, borderRadius: 'md', fontWeight: 600, ...focusRing }

/**
 * Zone A of the Annual Planning persistent header.
 *
 * Left-aligned and deliberately short: this block used to centre-stack a title, a
 * subtitle, a chip strip and three competing buttons across most of the first
 * viewport, which pushed the actual plan below the fold.
 *
 * Scrolls away freely — everything that must survive the scroll (quarter Select,
 * tabs, primary CTA) lives in PlanScopeBar (Zone B) instead. On xs the action
 * cluster is dropped here because Zone B carries it as icon buttons from the start.
 */
const PlanIdentityBlock = ({
  plan,
  loading,
  metrics,
  priorities = [],
  routineStats = { total: 0, completedToday: 0 },
  areas = [],
  totalGoalsAllYear = 0,
  quarterClose,
  isEditingTitle,
  editTitle,
  onEditTitleChange,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onAIAssist,
  onOpenCloseQuarter,
  onDeletePlan,
  tier
}) => {
  const { t } = useTranslation()
  const firstAreaId = areas[0]?._id

  // Exactly one primary action, chosen by what the plan actually needs right now.
  // The zero-goals branch reads the *year-wide* count, not the quarter-scoped one:
  // "Add your first goal" is a lie for someone who simply has nothing in Q4.
  const quarterIsClosable = Boolean(quarterClose?.closable)
  const hasNoGoals = totalGoalsAllYear === 0
  const primaryKind = quarterIsClosable ? 'closeQuarter' : hasNoGoals && firstAreaId ? 'addGoal' : 'ai'
  const aiIcon = tier !== 'pro' ? <LockRoundedIcon /> : <AutoAwesomeRoundedIcon />

  const renderPrimary = () => {
    if (primaryKind === 'closeQuarter') {
      return (
        <Button
          size='sm'
          variant='solid'
          color='primary'
          startDecorator={<EventAvailableIcon />}
          onClick={() => onOpenCloseQuarter(quarterClose.closableQuarter, quarterClose.closableYear)}
          sx={tierShape}
        >
          {t('annualPlanning.reports.emptyCtaReady', { quarter: quarterClose.closableQuarter })}
        </Button>
      )
    }
    if (primaryKind === 'addGoal') {
      return (
        <Button
          size='sm'
          variant='solid'
          color='primary'
          component={Link}
          to={`/annual-planning/area/${firstAreaId}`}
          startDecorator={<AddTaskIcon />}
          sx={tierShape}
        >
          {t('annualPlanning.header.addFirstGoal')}
        </Button>
      )
    }
    return (
      <Button size='sm' variant='solid' color='primary' onClick={onAIAssist} startDecorator={aiIcon} sx={tierShape}>
        {t('goalAi.buttonLabel')}
      </Button>
    )
  }

  return (
    <Box sx={{ pt: { xs: 1, md: 1.5 }, pb: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={{ xs: 1.5, md: 2 }}
      >
        {/* Identity + progress */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isEditingTitle ? (
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
              <Box
                component='input'
                value={editTitle}
                aria-label={t('annualPlanning.header.renamePlan')}
                onChange={(e) => onEditTitleChange(e.target.value)}
                sx={{
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  color: 'text.primary',
                  border: 'none',
                  borderBottom: '2px solid',
                  borderColor: 'text.primary',
                  outline: 'none',
                  bgcolor: 'transparent',
                  maxWidth: '400px',
                  minWidth: 0
                }}
              />
              <Button size='sm' variant='soft' color='success' onClick={onSaveTitle} startDecorator={<SaveIcon />} sx={focusRing}>
                {t('annualPlanning.home.save')}
              </Button>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                aria-label={t('common.cancel')}
                onClick={onCancelEditTitle}
                sx={focusRing}
              >
                <CancelIcon />
              </IconButton>
            </Stack>
          ) : (
            <Stack direction='row' alignItems='center' spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography
                level='h2'
                fontWeight={800}
                startDecorator={<TimelineIcon sx={{ color: 'primary.plainColor', fontSize: 22 }} />}
                sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2, m: 0, minWidth: 0 }}
              >
                <Skeleton loading={loading} variant='text' width='12ch'>
                  {plan?.title || `${t('annualPlanning.title')} ${plan?.year || ''}`}
                </Skeleton>
              </Typography>
              {!loading && (
                <Tooltip title={t('annualPlanning.header.renamePlan')}>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    aria-label={t('annualPlanning.header.renamePlan')}
                    onClick={onStartEditTitle}
                    sx={focusRing}
                  >
                    <EditIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}

          {/* Progress + metric chips share one row — the old layout gave each of
              these its own centred block, which is most of the height that was lost. */}
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
            <Typography level='body-sm' fontWeight={700} sx={{ color: 'text.secondary', minWidth: '4ch' }}>
              <Skeleton loading={loading} variant='text' width='3ch'>
                {metrics.progress}%
              </Skeleton>
            </Typography>

            {/* 480, not 320: at 1280 this column is ~840px wide, so 480 + the three
                metric chips (~300px) consumes it almost exactly — and on an empty
                plan, where every chip is correctly suppressed, a 480px bar still
                reads as a deliberate element instead of a stub beside a void. Capped
                in px rather than % so ultrawide adds slack right of the chips instead
                of stretching the bar into a banner. */}
            <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 480 } }}>
              {loading ? (
                <Skeleton variant='rectangular' height={6} sx={{ borderRadius: 'xs' }} />
              ) : (
                <LinearProgress
                  determinate
                  value={metrics.progress}
                  thickness={6}
                  aria-label={t('annualPlanning.header.progress', { percent: metrics.progress })}
                  sx={{ borderRadius: 'xs', bgcolor: 'background.level2', color: 'primary.solidBg' }}
                />
              )}
            </Box>

            {!loading && (
              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {metrics.totalGoals > 0 && (
                  <Chip size='sm' variant='soft' color='neutral'>
                    {t('annualPlanning.header.goalsRatio', { completed: metrics.completedGoals, total: metrics.totalGoals })}
                  </Chip>
                )}
                {priorities.length > 0 && (
                  <Chip size='sm' variant='soft' color='neutral'>
                    {t('annualPlanning.header.prioritiesCount', { count: priorities.length })}
                  </Chip>
                )}
                {/* Clickable via the `action` slot, not `component` on the root: Joy's
                    Chip already renders an inner action element, so putting the Link
                    on the root makes useRootElementName warn on every render. */}
                {routineStats.total > 0 && (
                  <Chip
                    size='sm'
                    variant='soft'
                    color='neutral'
                    slotProps={{
                      action: {
                        component: Link,
                        to: '/annual-planning/daily-routine',
                        'aria-label': t('annualPlanning.home.dailyRoutineBtn'),
                        sx: focusRing
                      }
                    }}
                  >
                    {t('annualPlanning.header.routineRatio', { completed: routineStats.completedToday, total: routineStats.total })}
                  </Chip>
                )}
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Action cluster — hidden on xs, where Zone B carries these as icon buttons */}
        {!loading && (
          <Stack direction='row' spacing={1} alignItems='center' sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}>
            {renderPrimary()}

            <Button
              component={Link}
              to='/annual-planning/daily-routine'
              variant='outlined'
              color='neutral'
              startDecorator={<DayIcon />}
              size='sm'
              sx={tierShape}
            >
              {t('annualPlanning.home.dailyRoutineBtn')}
            </Button>

            <Dropdown>
              <MenuButton
                slots={{ root: IconButton }}
                slotProps={{
                  root: { size: 'sm', variant: 'plain', color: 'neutral', 'aria-label': t('annualPlanning.header.moreActions') }
                }}
                sx={focusRing}
              >
                <MoreVertIcon />
              </MenuButton>
              <Menu placement='bottom-end' size='sm'>
                {/* AI Assist demotes into the menu whenever something more urgent owns
                    the primary slot. Same handler, so the non-Pro upgrade path is intact. */}
                {primaryKind !== 'ai' && (
                  <MenuItem onClick={onAIAssist}>
                    {React.cloneElement(aiIcon, { fontSize: 'small' })}
                    {t('goalAi.buttonLabel')}
                  </MenuItem>
                )}
                <MenuItem onClick={onStartEditTitle}>
                  <EditIcon fontSize='small' />
                  {t('annualPlanning.actions.editPlan')}
                </MenuItem>
                <MenuItem component={Link} to='/annual-planning/setup'>
                  <TuneIcon fontSize='small' />
                  {t('annualPlanning.actions.setFocusAreas')}
                </MenuItem>
                <ListDivider />
                <MenuItem color='danger' onClick={onDeletePlan}>
                  <DeleteOutlineIcon fontSize='small' />
                  {t('annualPlanning.header.deletePlan')}
                </MenuItem>
              </Menu>
            </Dropdown>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

export default PlanIdentityBlock
