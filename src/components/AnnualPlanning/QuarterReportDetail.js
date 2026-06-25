import React from 'react'
import { Box, Typography, Stack, Divider, LinearProgress, Card, Chip, Grid, Input, CircularProgress, AspectRatio } from '@mui/joy'
import {
  EmojiEvents as EmojiEventsIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material'

const QuarterReportDetail = ({
  report,
  focusAreas,
  isPreview = false,
  interactiveMigration = false,
  migrationData = {},
  onMigrationChange = () => {},
  hideGoals = false
}) => {
  // Map focus areas
  const areaMap = focusAreas.reduce((acc, fa) => {
    acc[fa._id] = fa
    return acc
  }, {})

  // Group goals safely
  const goalsByArea = {}
  if (report.goals_summary && Array.isArray(report.goals_summary)) {
    report.goals_summary.forEach((rawG) => {
      let progress = rawG.progress || 0
      if (rawG.milestones && rawG.milestones.length > 0) {
        const done = rawG.milestones.filter((m) => m.completed).length
        progress = Math.round((done / rawG.milestones.length) * 100)
      }
      const g = { ...rawG, _calculatedProgress: progress }

      const areaId = g.focus_area_id || 'unassigned'
      if (!goalsByArea[areaId]) goalsByArea[areaId] = []
      goalsByArea[areaId].push(g)
    })
  }

  // Fallback icon/color
  const getArea = (id) => areaMap[id] || { name: 'Unassigned', icon: '🎯', color: 'primary.plainColor' }

  return (
    <Box sx={{ p: 0, bgcolor: 'transparent', mb: 2 }}>
      <Box sx={{ pb: 3, mb: 4, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography level='title-lg' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEventsIcon sx={{ color: 'warning.plainColor' }} />Q{report.quarter} {report.year} Report {isPreview && '(Preview)'}
          </Typography>
          {!isPreview && report.created_at && (
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {new Date(report.created_at).toLocaleDateString()}
            </Typography>
          )}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Read-only Reflections (Historical View) */}
        {!isPreview && report.reflections && (
          <Box sx={{ my: 4, px: { xs: 1, sm: 3 } }}>
            <Typography level='title-md' sx={{ mb: 2, color: 'text.primary' }}>
              Quarterly Reflections
            </Typography>
            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
              <Card variant='outlined' sx={{ flex: 1, bgcolor: 'background.surface' }}>
                <Typography level='body-xs' sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'success.plainColor', mb: 1 }}>
                  Biggest Wins
                </Typography>
                <Typography level='body-md' sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  &quot;{report.reflections.biggest_wins || 'None recorded'}&quot;
                </Typography>
              </Card>
              <Card variant='outlined' sx={{ flex: 1, bgcolor: 'background.surface' }}>
                <Typography level='body-xs' sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'danger.plainColor', mb: 1 }}>
                  Challenges
                </Typography>
                <Typography level='body-md' sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  &quot;{report.reflections.biggest_challenges || 'None recorded'}&quot;
                </Typography>
              </Card>
              <Card variant='outlined' sx={{ flex: 1, bgcolor: 'background.surface' }}>
                <Typography level='body-xs' sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'primary.plainColor', mb: 1 }}>
                  Next Focus
                </Typography>
                <Typography level='body-md' sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  &quot;{report.reflections.next_quarter_focus || 'None recorded'}&quot;
                </Typography>
              </Card>
            </Stack>
          </Box>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          divider={<Divider />}
          justifyContent='space-evenly'
          alignItems='center'
          spacing={2}
          sx={{
            py: 3,
            px: 2,
            my: 4,
            bgcolor: 'background.surface',
            borderRadius: 'lg',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ flex: 1, textAlign: 'center', width: '100%' }}>
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', textTransform: 'uppercase', letterSpacing: 'sm', mb: 1, fontWeight: 700 }}
            >
              Goals Achieved
            </Typography>
            <Stack direction='row' alignItems='baseline' justifyContent='center' spacing={0.5}>
              <Typography level='h2' sx={{ lineHeight: 1, m: 0 }}>
                {report.completed_goals}
              </Typography>
              <Typography level='title-sm' sx={{ color: 'text.tertiary' }}>
                / {report.total_goals}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', width: '100%' }}>
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', textTransform: 'uppercase', letterSpacing: 'sm', mb: 1, fontWeight: 700 }}
            >
              Milestones Completed
            </Typography>
            <Stack direction='row' alignItems='baseline' justifyContent='center' spacing={0.5}>
              <Typography level='h2' sx={{ lineHeight: 1, m: 0 }}>
                {report.completed_milestones}
              </Typography>
              <Typography level='title-sm' sx={{ color: 'text.tertiary' }}>
                / {report.total_milestones}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', width: '100%' }}>
            <Typography
              level='body-xs'
              sx={{ color: 'text.tertiary', textTransform: 'uppercase', letterSpacing: 'sm', mb: 1, fontWeight: 700 }}
            >
              Total Progress
            </Typography>
            <Stack direction='row' alignItems='baseline' justifyContent='center' spacing={0.5}>
              <Typography
                level='h2'
                sx={{ lineHeight: 1, m: 0, color: report.progress_percentage === 100 ? 'success.plainColor' : 'inherit' }}
              >
                {report.progress_percentage}%
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Box sx={{ px: 1 }}>
          <LinearProgress
            determinate
            value={report.progress_percentage || 0}
            color={report.progress_percentage === 100 ? 'success' : 'primary'}
            sx={{ mt: 2, height: 6, borderRadius: 'full' }}
          />
        </Box>
      </Box>

      {/* Historical Insights (Routines & Books) */}
      {!isPreview && (report.routines_summary?.active_days > 0 || report.knowledge_summary?.books_finished?.length > 0) && (
        <Box sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
          <Typography level='title-md' sx={{ mb: 2 }}>
            Quarterly Insights
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {report.routines_summary?.active_days > 0 && (
              <Card
                variant='outlined'
                sx={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, bgcolor: 'background.surface' }}
              >
                <CircularProgress determinate value={report.routines_summary.completion_rate} color='primary' size='lg'>
                  <Typography level='body-xs' fontWeight='bold'>
                    {report.routines_summary.completion_rate}%
                  </Typography>
                </CircularProgress>
                <Box>
                  <Typography level='title-sm'>Routine Consistency</Typography>
                  <Typography level='body-xs' color='text.tertiary'>
                    Active {report.routines_summary.active_days} days this quarter
                  </Typography>
                </Box>
              </Card>
            )}

            {report.knowledge_summary?.books_finished?.length > 0 && (
              <Card variant='outlined' sx={{ flex: 2, bgcolor: 'background.surface' }}>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  Books Finished ({report.knowledge_summary.books_finished.length})
                </Typography>
                <Stack direction='row' spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
                  {report.knowledge_summary.books_finished.map((b, i) => (
                    <Box key={i} sx={{ minWidth: 70, maxWidth: 70, textAlign: 'center' }}>
                      {b.cover_url ? (
                        <AspectRatio ratio='2/3' objectFit='cover' sx={{ borderRadius: 'sm', mb: 0.5 }}>
                          <img src={b.cover_url} alt={b.title} loading='lazy' />
                        </AspectRatio>
                      ) : (
                        <Box
                          sx={{
                            height: 105,
                            bgcolor: 'background.level2',
                            borderRadius: 'sm',
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Typography
                            level='body-xs'
                            sx={{
                              p: 0.5,
                              fontSize: '0.6rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {b.title}
                          </Typography>
                        </Box>
                      )}
                      <Typography level='body-xs' noWrap sx={{ fontSize: '0.65rem' }}>
                        {b.title}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Box>
      )}

      {/* Grouped Breakdowns */}
      {!hideGoals && (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography level='title-md' sx={{ mb: 2 }}>
            Breakdown by Focus Area
          </Typography>
          <Stack spacing={4}>
            {Object.entries(goalsByArea).map(([areaId, goals]) => {
              const area = getArea(areaId)

              return (
                <Box key={areaId} sx={{ mb: 4 }}>
                  <Typography
                    level='title-lg'
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, color: area.color || 'text.primary' }}
                  >
                    {area.icon && <Box sx={{ fontSize: '1.5rem', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}>{area.icon}</Box>}
                    {area.name}
                  </Typography>

                  <Stack spacing={0} divider={<Divider />}>
                    {goals.map((g) => (
                      <GoalDetail
                        key={g._id}
                        goal={g}
                        interactiveMigration={interactiveMigration}
                        migrationState={migrationData && migrationData[g._id]}
                        onMigrationChange={(field, val) => onMigrationChange(g._id, field, val)}
                      />
                    ))}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

const GoalDetail = ({ goal, interactiveMigration, migrationState, onMigrationChange }) => {
  const progress = goal._calculatedProgress !== undefined ? goal._calculatedProgress : goal.progress || 0
  const isComplete = goal.status === 'completed' || progress === 100

  return (
    <Box
      sx={{
        py: 2.5,
        px: { xs: 1, sm: 2 },
        bgcolor: 'transparent',
        borderRadius: 'sm',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'background.level1' }
      }}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={goal.milestones?.length ? 1.5 : 0}>
        <Box sx={{ pr: 2 }}>
          <Stack direction='row' alignItems='center' spacing={1} mb={0.5}>
            <Typography level='title-md'>{goal.title}</Typography>
            {!isComplete && (goal.migration_count || 0) >= 2 && (
              <Chip size='sm' variant='soft' color='warning' sx={{ fontSize: '0.65rem' }}>
                Migrated {goal.migration_count}x
              </Chip>
            )}
          </Stack>
          {goal.description && (
            <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.5 }}>
              {goal.description}
            </Typography>
          )}
        </Box>
        <Chip size='sm' variant={isComplete ? 'solid' : 'soft'} color={isComplete ? 'success' : 'neutral'} sx={{ fontWeight: 600 }}>
          {progress}%
        </Chip>
      </Stack>

      {goal.milestones?.length > 0 && (
        <Stack spacing={1} sx={{ mt: 1.5, pl: { xs: 1, sm: 2 }, borderLeft: '2px solid', borderColor: 'divider', ml: 0.5 }}>
          {goal.milestones.map((m, i) => (
            <Stack key={i} direction='column' spacing={0.25}>
              <Stack direction='row' alignItems='flex-start' spacing={1}>
                {m.completed ? (
                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.plainColor', mt: 0.25 }} />
                ) : (
                  <UncheckedIcon sx={{ fontSize: 16, color: 'text.tertiary', mt: 0.25 }} />
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    level='body-sm'
                    sx={{
                      color: m.completed ? 'text.secondary' : 'text.primary',
                      textDecoration: m.completed ? 'line-through' : 'none',
                      lineHeight: 1.2
                    }}
                  >
                    {m.title}
                  </Typography>
                  {/* Show target date if exists */}
                  {(m.due_date || m.target_date) && (
                    <Stack direction='row' alignItems='center' spacing={0.5} sx={{ mt: 0.25 }}>
                      <CalendarIcon sx={{ fontSize: 12, color: m.completed ? 'text.tertiary' : 'warning.plainColor' }} />
                      <Typography level='body-xs' sx={{ color: m.completed ? 'text.tertiary' : 'warning.plainColor', fontSize: '0.65rem' }}>
                        Due: {new Date(m.due_date || m.target_date).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}

      {/* Migration Controls for Pending Goals */}
      {!isComplete && interactiveMigration && migrationState && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1, fontWeight: 600, textTransform: 'uppercase' }}>
            Migrate to Next Quarter
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems='center'>
            <ArrowForwardIcon sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.tertiary', mr: 0.5, fontSize: 18 }} />
            <Input
              type='number'
              size='sm'
              min={1}
              max={4}
              value={migrationState.new_quarter || ''}
              onChange={(e) => onMigrationChange('new_quarter', parseInt(e.target.value))}
              startDecorator='Q'
              sx={{ width: 70 }}
            />
            <Input
              type='date'
              size='sm'
              value={migrationState.new_target_date || ''}
              onChange={(e) => onMigrationChange('new_target_date', e.target.value)}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>
      )}
    </Box>
  )
}

export default QuarterReportDetail
