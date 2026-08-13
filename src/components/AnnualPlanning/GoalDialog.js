import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, Stack } from '@mui/joy'

import FormErrorBanner from '../Common/Form/FormErrorBanner'
import FormSheet from '../Common/Form/FormSheet'
import FormTextArea from '../Common/Form/FormTextArea'
import FormTextField from '../Common/Form/FormTextField'
import { focusRing } from '../Common/Form/formStyles'
import { scrollIntoViewSafely } from '../Common/Form/formUtils'
import useGoalForm from '../../hooks/useGoalForm'
import GoalDetailRail from './goal/GoalDetailRail'
import GoalImageField from './goal/GoalImageField'
import GoalMilestoneEditor from './goal/GoalMilestoneEditor'
import GoalScopeChip from './goal/GoalScopeChip'
import GoalTimeframeFields from './goal/GoalTimeframeFields'
import GoalTitleField from './goal/GoalTitleField'

/**
 * GoalDialog — the Add/Edit Goal form, title-first.
 *
 * Was 763 lines in schema order: six unrelated decisions and two visually
 * identical `+ Add` buttons with different semantics stood between the thought
 * and the save. It is now pure composition — useGoalForm holds the state,
 * GoalDetailRail offers the optional groups on demand — and at rest it is a
 * scope chip, one field, a row of offers and two buttons.
 *
 * FE-S9 moved it onto the shared shell. The header, the save-failure banner and
 * the hand-rolled ModalDialog `sx` are `FormSheet`'s now, which is where the
 * form gains a bottom sheet at `xs` and a footer that cannot scroll away under
 * an open keyboard — the one behaviour this surface did not already have.
 *
 * Recurring-habit authoring left this form and nowhere else (ADR-004 §6): its
 * streak was never writable after creation, so the form asked users to fill a
 * loop the product cannot close. Everything reading them is untouched.
 *
 * @param initialSection null | 'milestones' — reveals the group on mount, seeds
 *   a blank row, scrolls to it and lands the cursor in it. This is what keeps
 *   the card's next-action rung 5 working against a form that opens collapsed.
 */
const actionSx = { width: { xs: '100%', sm: 'auto' }, ...focusRing }

const GoalDialog = ({ open, onClose, focusAreaId, onSuccess, goal = null, yearlyObjectives = [], initialSection = null }) => {
  const { t } = useTranslation()
  const form = useGoalForm({ open, goal, focusAreaId, initialSection })
  const { formData, setField, revealed, titleError, saveError, isEdit } = form

  const milestonesRef = useRef(null)

  // Land on the requested section. Deferred a frame to let the sheet lay out.
  useEffect(() => {
    if (!open || initialSection !== 'milestones') return
    const timer = setTimeout(() => scrollIntoViewSafely(milestonesRef.current, 'start'), 100)
    return () => clearTimeout(timer)
  }, [open, initialSection])

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      titleKey={isEdit ? 'annualPlanning.goal.edit' : 'annualPlanning.goal.add'}
      subtitleKey={isEdit ? 'annualPlanning.goal.editSubtitle' : null}
      width='standard'
      banner={saveError !== null ? <FormErrorBanner titleKey='annualPlanning.goal.saveError' detailText={saveError} /> : null}
      footer={
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          {/* Cancel stays enabled while saving so a stuck request is escapable. */}
          <Button variant='plain' onClick={onClose} size='lg' sx={actionSx}>
            {t('common.cancel')}
          </Button>
          {/* Never disabled for validation — a dead primary action that never
              explains itself is the same silent dead-end, wearing grey. */}
          <Button onClick={() => form.submit(onSuccess, onClose)} loading={form.saving} size='lg' sx={actionSx}>
            {isEdit ? t('annualPlanning.goal.updateGoal') : t('annualPlanning.goal.saveGoal')}
          </Button>
        </Box>
      }
    >
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
            selectRef={form.refFor('timeframe')}
          />
        )}

        <GoalTitleField
          value={formData.title}
          onChange={(value) => setField('title', value)}
          error={titleError}
          autoFocus={form.autoFocusTarget === 'title'}
          inputRef={form.refFor('title')}
        />

        <GoalDetailRail available={form.availableChips} onReveal={form.reveal} />

        {revealed.has('milestones') && (
          <GoalMilestoneEditor
            milestones={form.milestones}
            onChange={form.setMilestones}
            keyResultsRef={milestonesRef}
            autoFocusFirstRow={form.autoFocusTarget === 'firstMilestone'}
          />
        )}

        {revealed.has('description') && (
          <FormTextArea
            labelKey='annualPlanning.goal.description'
            placeholderKey='annualPlanning.goal.descriptionPlaceholder'
            value={formData.description}
            onChange={(value) => setField('description', value)}
            textareaRef={form.refFor('description')}
          />
        )}

        {revealed.has('targetDate') && (
          <FormTextField
            labelKey='annualPlanning.goal.targetDate'
            type='date'
            value={formData.target_date}
            onChange={(value) => setField('target_date', value)}
            inputRef={form.refFor('targetDate')}
          />
        )}

        {revealed.has('image') && (
          <GoalImageField value={formData.image_url} onChange={(value) => setField('image_url', value)} inputRef={form.refFor('image')} />
        )}
      </Stack>
    </FormSheet>
  )
}

export default GoalDialog
