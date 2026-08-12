import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, DialogContent, DialogTitle, FormControl, FormLabel, Input, Modal, ModalDialog, Stack, Textarea, Typography } from '@mui/joy'

import useGoalForm from '../../hooks/useGoalForm'
import GoalDetailRail from './goal/GoalDetailRail'
import GoalImageField from './goal/GoalImageField'
import GoalMilestoneEditor from './goal/GoalMilestoneEditor'
import GoalSaveErrorAlert from './goal/GoalSaveErrorAlert'
import GoalScopeChip from './goal/GoalScopeChip'
import GoalTimeframeFields from './goal/GoalTimeframeFields'
import GoalTitleField from './goal/GoalTitleField'
import { focusRing } from './goal/goalStyles'

const scrollBehavior = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth')

/**
 * GoalDialog — the Add/Edit Goal form, title-first.
 *
 * Was 763 lines in schema order: six unrelated decisions and two visually
 * identical `+ Add` buttons with different semantics stood between the thought
 * and the save. It is now pure composition — useGoalForm holds the state,
 * GoalDetailRail offers the optional groups on demand — and at rest it is a
 * scope chip, one field, a row of offers and two buttons.
 *
 * Recurring-habit authoring left this form and nowhere else (ADR-004 §6). Its
 * streak was never writable after creation, so the form was asking users to
 * fill a loop the product cannot close. Everything that reads or schedules
 * them is untouched.
 *
 * @param initialSection null | 'milestones' — 'milestones' opens the form ready
 *   to work: the group is revealed on mount, a blank row is seeded, the section
 *   scrolls into view and the cursor lands in that row. This is what keeps the
 *   goal card's next-action rung 5 working against a form that opens collapsed.
 */
const GoalDialog = ({ open, onClose, focusAreaId, onSuccess, goal = null, yearlyObjectives = [], initialSection = null }) => {
  const { t } = useTranslation()
  const form = useGoalForm({ open, goal, focusAreaId, initialSection })
  const { formData, setField, revealed, titleError, saveError, isEdit } = form

  const titleRef = useRef(null)
  const keyResultsRef = useRef(null)
  const descriptionRef = useRef(null)
  const targetDateRef = useRef(null)
  const imageRef = useRef(null)
  const timeframeRef = useRef(null)
  const alertRef = useRef(null)

  // Land on the requested section. Deferred a frame to let the modal lay out.
  useEffect(() => {
    if (!open || initialSection !== 'milestones') return
    const timer = setTimeout(() => keyResultsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }), 100)
    return () => clearTimeout(timer)
  }, [open, initialSection])

  // A chip unmounts when activated. Without an explicit move, focus falls to
  // <body> and a keyboard user is ejected from the form. Milestones is absent
  // here on purpose — its editor focuses the row it seeds.
  useEffect(() => {
    const targets = { description: descriptionRef, targetDate: targetDateRef, image: imageRef, timeframe: timeframeRef }
    const target = targets[form.lastRevealed]
    if (!target) return
    const timer = setTimeout(() => target.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [form.lastRevealed])

  // Empty-title Save used to be a silent `return`. Now the reason is shown and
  // the cursor goes back to the field that needs fixing, on every attempt.
  useEffect(() => {
    if (form.titleErrorAt > 0) titleRef.current?.focus()
  }, [form.titleErrorAt])

  // The Alert sits below a scrollable DialogContent; on a long form the user
  // could press Save and see nothing move.
  useEffect(() => {
    if (saveError !== null) alertRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' })
  }, [saveError])

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: '95%', sm: '85%', md: '75%', lg: '700px' },
          maxWidth: '700px',
          // `auto` at md+ lets the modal shrink to the collapsed form. A fixed
          // height would restore the mostly-empty-space problem ADR-003 removed.
          height: { xs: '95vh', md: 'auto' },
          maxHeight: { xs: '95vh', md: '90vh' },
          overflowY: 'auto',
          p: 0,
          m: 'auto',
          borderRadius: { xs: 'lg', md: 'xl' },
          boxShadow: 'lg',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
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

        <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            {form.hasContext && !form.showTimeframeSelect && (
              <GoalScopeChip
                quarter={goal?.quarter}
                hasParent={Boolean(goal?.parent_id)}
                parentTitle={yearlyObjectives.find((o) => o._id === goal?.parent_id)?.title}
              />
            )}

            {form.showTimeframeSelect && (
              <GoalTimeframeFields
                formData={formData}
                setField={setField}
                yearlyObjectives={yearlyObjectives}
                selectRef={timeframeRef}
              />
            )}

            <GoalTitleField
              value={formData.title}
              onChange={(v) => setField('title', v)}
              error={titleError}
              autoFocus={form.autoFocusTarget === 'title'}
              inputRef={titleRef}
            />

            <GoalDetailRail available={form.availableChips} onReveal={form.reveal} />

            {revealed.has('milestones') && (
              <GoalMilestoneEditor milestones={form.milestones} onChange={form.setMilestones} keyResultsRef={keyResultsRef} />
            )}

            {revealed.has('description') && (
              <FormControl>
                <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.description')}</FormLabel>
                <Textarea
                  minRows={3}
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder={t('annualPlanning.goal.descriptionPlaceholder')}
                  slotProps={{ textarea: { ref: descriptionRef } }}
                  sx={focusRing}
                />
              </FormControl>
            )}

            {revealed.has('targetDate') && (
              <FormControl>
                <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.targetDate')}</FormLabel>
                <Input
                  type='date'
                  value={formData.target_date}
                  onChange={(e) => setField('target_date', e.target.value)}
                  size='lg'
                  slotProps={{ input: { ref: targetDateRef } }}
                  sx={focusRing}
                />
              </FormControl>
            )}

            {revealed.has('image') && (
              <GoalImageField value={formData.image_url} onChange={(v) => setField('image_url', v)} inputRef={imageRef} />
            )}
          </Stack>
        </DialogContent>

        {saveError !== null && <GoalSaveErrorAlert ref={alertRef} detail={saveError} />}

        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          {/* Cancel stays enabled while saving so a stuck request is escapable. */}
          <Button variant='plain' onClick={onClose} size='lg' sx={{ width: { xs: '100%', sm: 'auto' }, ...focusRing }}>
            {t('common.cancel')}
          </Button>
          {/* Never disabled for validation — a dead primary action that never
              explains itself is the same silent dead-end, wearing grey. */}
          <Button
            onClick={() => form.submit(onSuccess, onClose)}
            loading={form.saving}
            size='lg'
            sx={{ width: { xs: '100%', sm: 'auto' }, ...focusRing }}
          >
            {isEdit ? t('annualPlanning.goal.updateGoal') : t('annualPlanning.goal.saveGoal')}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default GoalDialog
