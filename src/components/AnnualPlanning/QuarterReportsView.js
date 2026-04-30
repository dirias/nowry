import React, { useState, useEffect } from 'react'
import { Card, Typography, Stack, Box, Grid, LinearProgress, Skeleton, Divider } from '@mui/joy'
import { CheckCircle as CheckCircleIcon, Timeline as TimelineIcon, EmojiEvents as EmojiEventsIcon } from '@mui/icons-material'
import { annualPlanningService } from '../../api/services'

const QuarterReportsView = ({ planId }) => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      if (!planId) return
      try {
        const data = await annualPlanningService.getQuarterReports(planId)
        setReports(data)
      } catch (error) {
        console.error('Failed to fetch quarter reports', error)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [planId])

  if (!loading && reports.length === 0) return null

  const getGoalProgress = (g) => {
    if (g.status === 'completed') return 100
    if (g.milestones?.length > 0) {
      const done = g.milestones.filter((m) => m.completed).length
      return Math.round((done / g.milestones.length) * 100)
    }
    return g.progress || 0
  }

  const calculateProgress = (goals) => {
    if (!goals || goals.length === 0) return 0
    let sum = 0
    goals.forEach((g) => {
      sum += getGoalProgress(g)
    })
    return Math.round(sum / goals.length)
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography level='h4' sx={{ mb: 2 }}>
        Past Quarters History
      </Typography>

      {loading && (
        <Grid container spacing={2}>
          {[1, 2].map((i) => (
            <Grid key={i} xs={12} md={6}>
              <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'sm' }} />
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && (
        <Grid container spacing={2}>
          {reports.map((report) => {
            const actualProgress = report.progress_percentage || calculateProgress(report.goals_summary)

            return (
              <Grid key={report._id} xs={12} md={6}>
                <Card variant='outlined' sx={{ p: 2, bgcolor: 'background.surface' }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
                    <Typography level='title-lg' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmojiEventsIcon sx={{ color: 'warning.plainColor' }} />Q{report.quarter} {report.year} Report
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </Typography>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary', textTransform: 'uppercase', mb: 0.5 }}>
                        Goals Achieved
                      </Typography>
                      <Typography level='title-md'>
                        {report.completed_goals} / {report.total_goals}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography level='body-xs' sx={{ color: 'text.tertiary', textTransform: 'uppercase', mb: 0.5 }}>
                        Total Progress
                      </Typography>
                      <Typography level='title-md'>{actualProgress}%</Typography>
                    </Box>
                  </Stack>
                  <LinearProgress determinate value={actualProgress} sx={{ mt: 1.5 }} />

                  <Box sx={{ mt: 2 }}>
                    <Typography level='title-sm' sx={{ mb: 1 }}>
                      Snapshots ({report.goals_summary?.length || 0})
                    </Typography>
                    <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                      {report.goals_summary?.map((g) => (
                        <Box
                          key={g._id}
                          sx={{
                            p: 1,
                            borderRadius: 'sm',
                            bgcolor: 'background.level1',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <Typography level='body-sm' noWrap sx={{ maxWidth: '80%' }}>
                            {g.title}
                          </Typography>
                          {getGoalProgress(g) === 100 ? (
                            <CheckCircleIcon color='success' sx={{ fontSize: 16 }} />
                          ) : (
                            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                              {getGoalProgress(g)}%
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  {report.reflections && (
                    <Box sx={{ mt: 3 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography level='title-sm' sx={{ mb: 1.5 }}>
                        Quarterly Reflections
                      </Typography>
                      <Stack spacing={1.5}>
                        {report.reflections.biggest_wins && (
                          <Box sx={{ p: 1.5, bgcolor: 'success.softBg', borderRadius: 'md' }}>
                            <Typography
                              level='body-xs'
                              fontWeight={700}
                              sx={{ color: 'success.plainColor', textTransform: 'uppercase', mb: 0.5 }}
                            >
                              Biggest Wins
                            </Typography>
                            <Typography level='body-sm' sx={{ color: 'text.primary' }}>
                              {report.reflections.biggest_wins}
                            </Typography>
                          </Box>
                        )}
                        {report.reflections.biggest_challenges && (
                          <Box sx={{ p: 1.5, bgcolor: 'danger.softBg', borderRadius: 'md' }}>
                            <Typography
                              level='body-xs'
                              fontWeight={700}
                              sx={{ color: 'danger.plainColor', textTransform: 'uppercase', mb: 0.5 }}
                            >
                              Biggest Challenges
                            </Typography>
                            <Typography level='body-sm' sx={{ color: 'text.primary' }}>
                              {report.reflections.biggest_challenges}
                            </Typography>
                          </Box>
                        )}
                        {report.reflections.next_quarter_focus && (
                          <Box sx={{ p: 1.5, bgcolor: 'primary.softBg', borderRadius: 'md' }}>
                            <Typography
                              level='body-xs'
                              fontWeight={700}
                              sx={{ color: 'primary.plainColor', textTransform: 'uppercase', mb: 0.5 }}
                            >
                              Next Quarter Focus
                            </Typography>
                            <Typography level='body-sm' sx={{ color: 'text.primary' }}>
                              {report.reflections.next_quarter_focus}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}

// Needed imported Divider above, adding it via manual replace pattern won't be easily, so I'll just use raw HTML or import if it fails.
// Just realized I didn't import Divider, fixing next.
export default QuarterReportsView
