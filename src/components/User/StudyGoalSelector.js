import React, { useId } from 'react'
import { Box, Radio, RadioGroup, Sheet, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { STUDY_GOALS } from '../../constants/learningTaxonomy'
import { optionBase, selectedOption, unselectedOption, overlayFocusRing } from './taxonomySelectorStyles'

/**
 * StudyGoalSelector — the single study-goal choice, shared by the onboarding
 * Personalization screen (ONB-010, FR-020) and Account Settings (ONB-013,
 * FR-053).
 *
 * Controlled and presentational, like its topic sibling: one value in, one
 * value out, no fetching and no screen chrome.
 *
 * Built on a real `RadioGroup` rather than a row of toggle buttons. Native
 * radios give the whole set a single tab stop with arrow-key movement between
 * options, `role='radiogroup'`, and exclusivity that assistive technology
 * enforces for free (NFR-001). Hand-rolled toggles would have to reimplement
 * all three, and the old wizard's `tabIndex={0}` divs are the reason that is not
 * on the table.
 *
 * Nothing here is required. FR-021 lets a user leave Personalization without a
 * goal, so `value` may legitimately be `null` and no option starts checked.
 *
 * @param {object}                 props
 * @param {string|null}            props.value        Selected goal value, or `null` for none.
 * @param {(next: string) => void} props.onChange     Receives the newly chosen goal value.
 * @param {boolean}                [props.disabled]   Disables every option.
 * @param {string}                 [props.name]       Radio group name; only matters if two groups share a form.
 * @param {string}                 [props.label]      Group label; defaults to the shared localized string.
 * @param {string}                 [props.hint]       Guidance under the label; defaults to the shared localized string.
 */
const StudyGoalSelector = ({ value = null, onChange, disabled = false, name = 'study-goal', label, hint }) => {
  const { t } = useTranslation()
  const baseId = useId()
  const labelId = `${baseId}-label`
  const hintId = `${baseId}-hint`

  return (
    <Box>
      <Typography id={labelId} level='title-sm'>
        {label ?? t('taxonomy.selector.goals.label')}
      </Typography>
      <Typography id={hintId} level='body-sm' sx={{ mt: 0.5, color: 'text.tertiary' }}>
        {hint ?? t('taxonomy.selector.goals.hint')}
      </Typography>

      <RadioGroup
        name={name}
        // `''` rather than `null`: a controlled RadioGroup handed `null` warns
        // and then flips to uncontrolled on the first real selection.
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mt: 1.5 }}
      >
        {STUDY_GOALS.map((goal) => {
          const isSelected = value === goal.value

          return (
            <Sheet
              key={goal.value}
              variant='outlined'
              sx={(theme) => ({
                ...optionBase,
                ...(isSelected ? selectedOption(theme) : unselectedOption),
                // The overlay action span is positioned against this sheet, so
                // the sheet has to establish the containing block itself.
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'background.surface'
              })}
            >
              <Radio
                overlay
                disableIcon={false}
                value={goal.value}
                disabled={disabled}
                // Neutral, not primary: the checked dot then draws from the
                // neutral outlined tokens instead of the user's accent, which
                // can be any lightness at all across the seven presets.
                color='neutral'
                variant='outlined'
                label={
                  <Typography level='body-md' sx={{ fontWeight: isSelected ? 600 : 400, whiteSpace: 'normal' }}>
                    {t(goal.i18nKey)}
                  </Typography>
                }
                // The focus ring belongs on the action span, which is what
                // covers the whole card and what Joy flags as focus-visible.
                slotProps={{ label: { sx: { minWidth: 0 } }, action: { sx: overlayFocusRing } }}
              />
            </Sheet>
          )
        })}
      </RadioGroup>
    </Box>
  )
}

export default StudyGoalSelector
