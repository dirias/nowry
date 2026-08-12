import React from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '@mui/system'
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  FormLabel,
  ModalClose,
  Option,
  Select,
  Skeleton,
  Stack,
  Typography
} from '@mui/joy'
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import GoalActivityList from './GoalActivityList'
import GoalMilestoneStepper from './GoalMilestoneStepper'
import GoalProgressBar from './GoalProgressBar'
import GoalStatePill from './GoalStatePill'

const focusRing = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
}

const LIFECYCLE_OPTIONS = [
  { value: 'not_started', labelKey: 'annualPlanning.goal.status.notStarted' },
  { value: 'in_progress', labelKey: 'annualPlanning.goal.status.inProgress' },
  { value: 'completed', labelKey: 'annualPlanning.goal.status.completed' }
]

/**
 * GoalDetailDrawer — everything that used to sit behind two per-card accordions,
 * now one click away behind a real focusable link.
 *
 * A Joy Drawer traps focus, closes on Escape, and returns focus to the invoking
 * card. AccordionDetails did none of that, and it reflowed the grid on every
 * expand. Progressive disclosure is retained; only its container changed
 * (ADR-003 §2).
 *
 * Owns no data and no fetch: activities arrive as a prop from the plan payload
 * that GET /annual-plan/full already returned.
 */
const GoalDetailDrawer = ({
  open,
  goal,
  model,
  loading = false,
  error = null,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleMilestone,
  onRetry
}) => {
  const { t } = useTranslation()
  // Bottom sheet on phones, side panel from md up. Explicit query string rather
  // than a theme breakpoint so this stays headless.
  const isWide = useMediaQuery('(min-width: 900px)')

  if (!goal) return null

  const locked = model?.isLocked || goal.status === 'completed'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor={isWide ? 'right' : 'bottom'}
      size={isWide ? 'md' : 'lg'}
      slotProps={{
        content: {
          sx: {
            bgcolor: 'background.surface',
            width: isWide ? 420 : 'auto',
            borderTopLeftRadius: isWide ? 0 : 'lg',
            borderTopRightRadius: isWide ? 0 : 'lg'
          }
        }
      }}
    >
      <ModalClose aria-label={t('common.close')} sx={focusRing} />

      <Box sx={{ p: 3, pt: 5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {error && (
          <Alert
            color='danger'
            variant='soft'
            endDecorator={
              onRetry && (
                <Button size='sm' variant='soft' color='danger' onClick={onRetry} sx={focusRing}>
                  {t('common.retry')}
                </Button>
              )
            }
          >
            {t('annualPlanning.goal.statusUpdateError')}
          </Alert>
        )}

        {/* Title + state */}
        <Box>
          <Skeleton loading={loading} variant='text' level='title-lg'>
            <Typography level='title-lg' sx={{ color: 'text.primary', pr: 4 }}>
              {goal.title}
            </Typography>
          </Skeleton>
          <Box sx={{ mt: 1 }}>
            {loading ? (
              <Skeleton variant='rectangular' width={72} height={20} sx={{ borderRadius: 'sm' }} />
            ) : (
              <GoalStatePill state={model?.state} />
            )}
          </Box>
        </Box>

        {/* Progress */}
        <Skeleton loading={loading} variant='rectangular' height={24} sx={{ borderRadius: 'sm' }}>
          <GoalProgressBar
            percent={model?.progress?.percent ?? 0}
            state={model?.state}
            completed={model?.progress?.completed ?? 0}
            total={model?.progress?.total ?? 0}
            isMilestoneBased={model?.progress?.isMilestoneBased}
          />
        </Skeleton>

        {/* Lifecycle — a labelled Select with three explicit options, replacing the
            unlabelled click-cycle Box that keyboard users could not reach at all. */}
        <FormControl size='sm'>
          <FormLabel>{t('annualPlanning.goal.detail.lifecycleLabel')}</FormLabel>
          <Select
            value={goal.status || 'not_started'}
            disabled={loading || model?.isLocked}
            onChange={(event, value) => value && value !== goal.status && onStatusChange?.(goal, value)}
            slotProps={{ button: { 'aria-label': t('annualPlanning.goal.detail.lifecycleLabel') } }}
            sx={focusRing}
          >
            {LIFECYCLE_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </Option>
            ))}
          </Select>
        </FormControl>

        <Divider />

        {/* Description */}
        <Box>
          <Typography level='title-sm' sx={{ mb: 0.5 }}>
            {t('annualPlanning.goal.description')}
          </Typography>
          <Skeleton loading={loading} variant='text' level='body-sm'>
            <Typography level='body-sm' sx={{ color: goal.description ? 'text.secondary' : 'text.tertiary' }}>
              {goal.description || t('annualPlanning.goal.detail.noDescription')}
            </Typography>
          </Skeleton>
        </Box>

        <Divider />

        {/* Milestones */}
        <Box>
          <Typography level='title-sm' sx={{ mb: 1.5 }}>
            {t('annualPlanning.goal.detail.milestones')}
          </Typography>
          {loading ? (
            <Stack spacing={1}>
              <Skeleton variant='text' level='body-sm' width='70%' />
              <Skeleton variant='text' level='body-sm' width='55%' />
            </Stack>
          ) : (
            <GoalMilestoneStepper goal={goal} locked={locked} onToggle={onToggleMilestone} />
          )}
        </Box>

        {/* Activities — the section is omitted entirely at zero, never rendered
            as an empty "(0)" control. */}
        {!loading && model?.activityCount > 0 && (
          <>
            <Divider />
            <Box>
              <Typography level='title-sm' sx={{ mb: 1.5 }}>
                {t('annualPlanning.goal.activities')}
              </Typography>
              <GoalActivityList activities={model.activities} />
            </Box>
          </>
        )}

        <Divider />

        {/* Actions — Delete stays labelled and still routes through
            DeleteConfirmationModal in the container. */}
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Button
            variant='outlined'
            color='neutral'
            size='sm'
            startDecorator={<EditIcon />}
            disabled={loading || model?.isLocked}
            onClick={() => onEdit?.(goal)}
            sx={focusRing}
          >
            {t('annualPlanning.goal.edit')}
          </Button>
          <Button
            variant='plain'
            color='danger'
            size='sm'
            startDecorator={<DeleteIcon />}
            disabled={loading || model?.isLocked}
            onClick={() => onDelete?.(goal)}
            sx={focusRing}
          >
            {t('annualPlanning.goal.delete')}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default GoalDetailDrawer
