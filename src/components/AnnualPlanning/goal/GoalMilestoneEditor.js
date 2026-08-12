import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack, Typography } from '@mui/joy'
import { Add as AddIcon } from '@mui/icons-material'
import GoalMilestoneEditorRow from './GoalMilestoneEditorRow'
import { focusRing } from './goalStyles'

export const blankMilestone = () => ({ title: '', completed: false, due_date: '' })

/**
 * The milestone group of the goal form: heading, helper, Add, rows, empty state.
 *
 * Owns the array handlers that used to sit in GoalDialog. The parent holds the
 * array and receives whole replacements, so there is one source of truth and
 * no per-row persistence — nothing here writes to the API.
 */
const GoalMilestoneEditor = ({ milestones, onChange, keyResultsRef }) => {
  const { t } = useTranslation()
  const inputRefs = useRef([])
  const addButtonRef = useRef(null)

  // Focus the last row when it is blank — the row just appended by Add or
  // Enter, or the one seeded on open by initialSection='milestones'.
  // Guarded on a length change so typing in an earlier row while a blank row
  // trails does not yank the cursor to the bottom.
  const prevLength = useRef(-1)
  useEffect(() => {
    const changed = prevLength.current !== milestones.length
    prevLength.current = milestones.length
    if (!changed || milestones.length === 0) return
    const last = milestones.length - 1
    if (milestones[last]?.title) return
    const timer = setTimeout(() => inputRefs.current[last]?.focus(), 50)
    return () => clearTimeout(timer)
  }, [milestones])

  const addMilestone = useCallback(() => onChange([...milestones, blankMilestone()]), [milestones, onChange])

  const updateMilestone = useCallback(
    (index, field, value) => onChange(milestones.map((m, i) => (i === index ? { ...m, [field]: value } : m))),
    [milestones, onChange]
  )

  const deleteMilestone = useCallback(
    (index) => {
      const next = milestones.filter((_, i) => i !== index)
      onChange(next)
      inputRefs.current.splice(index, 1)
      // The row that held focus is gone. Without this, focus falls to <body>.
      if (next.length === 0) setTimeout(() => addButtonRef.current?.focus(), 0)
      else setTimeout(() => inputRefs.current[Math.min(index, next.length - 1)]?.focus(), 0)
    },
    [milestones, onChange]
  )

  return (
    <Box ref={keyResultsRef}>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ mb: 1.5, gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography level='title-md' sx={{ color: 'text.primary' }}>
            {t('annualPlanning.goal.keyResultsTitle')}
          </Typography>
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.25 }}>
            {t('annualPlanning.goal.keyResultsHelper')}
          </Typography>
        </Box>
        <Button
          ref={addButtonRef}
          size='sm'
          variant='soft'
          startDecorator={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={addMilestone}
          sx={{ flexShrink: 0, minHeight: { xs: 44, sm: 32 }, ...focusRing }}
        >
          {t('annualPlanning.goal.addMilestoneButton')}
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {milestones.map((milestone, index) => (
          <GoalMilestoneEditorRow
            key={index}
            milestone={milestone}
            index={index}
            onChange={updateMilestone}
            onDelete={deleteMilestone}
            onEnter={addMilestone}
            inputRef={(el) => (inputRefs.current[index] = el)}
          />
        ))}

        {/* Only reachable by deleting the last row — the group seeds a row when
            it is revealed, so it never opens empty. */}
        {milestones.length === 0 && (
          <Box
            sx={{
              py: 3,
              textAlign: 'center',
              bgcolor: 'background.level1',
              borderRadius: 'md',
              border: '1px dashed',
              borderColor: 'divider'
            }}
          >
            <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
              {t('annualPlanning.goal.noMilestones')}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export default GoalMilestoneEditor
