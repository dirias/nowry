import React from 'react'

import FormTextField from '../../Common/Form/FormTextField'

/**
 * The one field a goal cannot be saved without.
 *
 * `FormTextField` was generalized from this file and carries the whole contract
 * it used to hand-roll: `error` on the control, the reason under the input, and
 * aria-invalid plus aria-describedby so the reason is announced rather than
 * only coloured. Save is still never disabled for validation — a dead primary
 * action that never explains itself is the same silent dead-end as the bare
 * `return` this replaced, just wearing grey.
 */
const GoalTitleField = ({ value, onChange, error, autoFocus, inputRef }) => (
  <FormTextField
    labelKey='annualPlanning.goal.title'
    placeholderKey='annualPlanning.goal.titlePlaceholder'
    errorKey={error ? 'annualPlanning.goal.titleRequired' : null}
    value={value}
    onChange={onChange}
    required
    // Mutually exclusive with the milestone row's focus (§5.2).
    autoFocus={autoFocus}
    inputRef={inputRef}
  />
)

export default GoalTitleField
