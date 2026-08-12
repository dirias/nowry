import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Input, Radio, Tooltip } from '@mui/joy'
import { Delete as DeleteIcon } from '@mui/icons-material'

import { focusRing } from '../../Common/Form/formStyles'

/**
 * One answer option: the correctness designation, the text, and remove.
 *
 * The `Radio` carries `value={String(index)}`, not the option's text. Binding
 * to the text meant that selecting option 2 and then editing it silently unset
 * correctness — `correct_answer` still held the old string, which matched no
 * option, so the user saw no radio selected and no explanation of why. Two
 * options with the same text made both radios appear selected. An index does
 * not move when the characters under it change, which is what the user means.
 *
 * The radio is never disabled. Designating a row before typing into it is a
 * reasonable order to work in, and it survives, because the binding is
 * positional; an empty designation is caught at submit with a message rather
 * than by a control that refuses to be pressed (§S4).
 */
const QuizOptionRow = ({ index, value, onChange, onEnter, onRemove, removable, inputRef }) => {
  const { t } = useTranslation()
  const number = index + 1

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Radio
        value={String(index)}
        // Joy puts a top-level aria-label on the root <span>, leaving the
        // <input> that carries role=radio unnamed. Label the input slot.
        slotProps={{ input: { 'aria-label': t('cards.quiz.correctAria', { number }) } }}
        sx={{ flexShrink: 0, minWidth: { xs: 44, sm: 'auto' }, minHeight: { xs: 44, sm: 'auto' }, ...focusRing }}
      />

      <Input
        fullWidth
        value={value}
        onChange={(event) => onChange(index, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          // Enter adds the next option. It must never reach a submit handler:
          // there is no <form> here precisely so a half-composed card cannot be
          // saved from a field the user is still filling (§5.9).
          event.preventDefault()
          onEnter()
        }}
        placeholder={t('cards.quiz.optionPlaceholder', { number })}
        slotProps={{ input: { ref: inputRef } }}
        sx={{ flex: 1, minWidth: 0, '&:focus-within': { borderColor: 'primary.outlinedBorder' } }}
      />

      {/* Always visible — hover is not a thing on touch, so a hover-revealed
          control is an unreachable one. Low emphasis at rest and at the
          trailing edge instead, far from the thumb-zone primary action, with
          removal of typed text undoable (§8.5). */}
      {removable && (
        <Tooltip title={t('cards.quiz.removeOptionAria', { number })} size='sm' placement='top'>
          <IconButton
            size='sm'
            variant='plain'
            color='neutral'
            onClick={() => onRemove(index)}
            aria-label={t('cards.quiz.removeOptionAria', { number })}
            sx={{
              flexShrink: 0,
              minWidth: { xs: 44, sm: 32 },
              minHeight: { xs: 44, sm: 32 },
              '&:hover, &:focus-visible': { color: 'danger.plainColor' },
              ...focusRing
            }}
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export default QuizOptionRow
