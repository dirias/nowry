import React from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/joy/Box'
import Stack from '@mui/joy/Stack'
import Typography from '@mui/joy/Typography'
import Button from '@mui/joy/Button'
import Alert from '@mui/joy/Alert'
import AccordionGroup from '@mui/joy/AccordionGroup'
import Accordion from '@mui/joy/Accordion'
import AccordionSummary from '@mui/joy/AccordionSummary'
import AccordionDetails from '@mui/joy/AccordionDetails'
import List from '@mui/joy/List'
import ListItem from '@mui/joy/ListItem'
import Chip from '@mui/joy/Chip'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'

/**
 * GoalAIPanel — Inline analysis panel for Goal AI (Pro-only feature).
 * Renders 3 collapsible accordion sections:
 *   1. Quarterly Suggestions (GOAL-01)
 *   2. Conflicts Detected   (GOAL-02)
 *   3. Archiving Recommendations (GOAL-03)
 *
 * Props:
 *   analysis   — GoalAnalysisResponse | null
 *   loading    — boolean
 *   error      — boolean
 *   noPlan     — boolean (404 from backend — neutral info, not error)
 *   onRefresh  — () => void
 */

import useGenerationProgress from '../../hooks/useGenerationProgress'
import GenerationProgress from '../Common/GenerationProgress'

// Per-surface narration (PRD A5). Generic copy would be worse than the spinner it
// replaces: being specific about the work is the whole value of the line.
const GOAL_AI_STAGES = [
  { after: 0, icon: '📖', msgKey: 'goalAi.stages.s0' },
  { after: 7, icon: '🔍', msgKey: 'goalAi.stages.s1' },
  { after: 15, icon: '✍️', msgKey: 'goalAi.stages.s2' }
]

const GOAL_AI_ESTIMATED_MS = 20000

const GoalAIPanel = ({ analysis, loading, error, noPlan, onRefresh }) => {
  const { t } = useTranslation()

  const progress = useGenerationProgress({
    active: loading,
    failed: Boolean(error),
    estimatedMs: GOAL_AI_ESTIMATED_MS,
    stages: GOAL_AI_STAGES
  })

  return (
    <Box
      sx={{
        mt: 3,
        p: 3,
        bgcolor: 'background.level1',
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Panel header row */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
        <Typography level='title-lg' fontWeight={700}>
          {t('goalAi.panelTitle')}
        </Typography>
        <Button
          variant='outlined'
          size='sm'
          startDecorator={<RefreshRoundedIcon />}
          onClick={onRefresh}
          loading={loading}
          aria-label={t('goalAi.refresh')}
        >
          {t('goalAi.refresh')}
        </Button>
      </Stack>

      {/* Loading state */}
      {progress.visible && (
        <Box sx={{ py: 3 }}>
          <GenerationProgress progress={progress} label={t('goalAi.loading')} />
        </Box>
      )}

      {/* No annual plan — neutral info (not error) */}
      {!loading && noPlan && (
        <Alert color='neutral' variant='soft'>
          {t('goalAi.noPlan')}
        </Alert>
      )}

      {/* Error state */}
      {!loading && error && !noPlan && (
        <Alert color='danger' variant='soft'>
          {t('goalAi.error')}
        </Alert>
      )}

      {/* Success — 3 collapsible accordion sections */}
      {!loading && !error && !noPlan && analysis && (
        <AccordionGroup>
          {/* GOAL-01: Quarterly Suggestions */}
          <Accordion defaultExpanded>
            <AccordionSummary>
              <Typography level='title-md' fontWeight={700}>
                {t('goalAi.sections.suggestions')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.suggestions.length === 0 ? (
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {t('goalAi.empty.suggestions')}
                </Typography>
              ) : (
                <List>
                  {analysis.suggestions.map((s, i) => (
                    <ListItem key={i} sx={{ flexDirection: 'column', alignItems: 'flex-start', pb: 2 }}>
                      <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                        <Chip size='sm' variant='soft' color='primary'>
                          Q{s.quarter}
                        </Chip>
                        <Typography level='title-sm' fontWeight={600}>
                          {s.goal_title}
                        </Typography>
                      </Stack>
                      {s.milestones?.length > 0 && (
                        <List sx={{ pl: 2 }}>
                          {s.milestones.map((m, mi) => (
                            <ListItem key={mi}>
                              <Typography level='body-sm'>{m}</Typography>
                            </ListItem>
                          ))}
                        </List>
                      )}
                      {s.rationale && (
                        <Typography level='body-sm' sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 0.5 }}>
                          {s.rationale}
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </AccordionDetails>
          </Accordion>

          {/* GOAL-02: Conflicts Detected */}
          <Accordion>
            <AccordionSummary>
              <Typography level='title-md' fontWeight={700}>
                {t('goalAi.sections.conflicts')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.conflicts.length === 0 ? (
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {t('goalAi.empty.conflicts')}
                </Typography>
              ) : (
                <List>
                  {analysis.conflicts.map((c, i) => (
                    <ListItem key={i} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography level='body-md'>{c.description}</Typography>
                      {c.affected_goals?.length > 0 && (
                        <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.25 }}>
                          {c.affected_goals.join(', ')}
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </AccordionDetails>
          </Accordion>

          {/* GOAL-03: Archiving Recommendations */}
          <Accordion>
            <AccordionSummary>
              <Typography level='title-md' fontWeight={700}>
                {t('goalAi.sections.archiving')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.archiving_recommendations.length === 0 ? (
                <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                  {t('goalAi.empty.archiving')}
                </Typography>
              ) : (
                <List>
                  {analysis.archiving_recommendations.map((r, i) => (
                    <ListItem key={i} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography level='title-sm' fontWeight={600}>
                        {r.goal_title}
                      </Typography>
                      <Typography level='body-sm' sx={{ color: 'text.secondary', mt: 0.25 }}>
                        {r.reason}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </AccordionDetails>
          </Accordion>
        </AccordionGroup>
      )}
    </Box>
  )
}

export default GoalAIPanel
