import React, { useCallback, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Chip, ChipDelete, Input, Stack } from '@mui/joy'
import { Close as CloseIcon } from '@mui/icons-material'

import FormFieldFrame from './FormFieldFrame'
import { focusRing, touchTarget } from './formStyles'

/**
 * FormTagInput — tags as removable chips.
 *
 * Four surfaces store tags as `string[]` and four collect them as a
 * comma-separated string, which means the user cannot see what they have
 * entered, cannot remove one without re-editing a sentence, and gets no
 * feedback that "verbs,, tenses" produced two tags and not three. BookEditor's
 * chip version is better by a wide margin and is the one that wins here.
 *
 * Carried over from it: Enter to add, an interpolated `t()` aria-label on each
 * delete, focus-within on the container, and — the genuinely thoughtful part —
 * auto-committing a tag the user typed but never pressed Enter on, so their
 * last tag is not silently dropped by the save they just clicked.
 *
 * Fixed here: the container's fixed `minHeight: 80`, which reserved an empty
 * box on a form that usually has no tags, and delete targets under 44px.
 *
 * `commitPending()` is exposed by ref because the submit path has to flush the
 * typed-but-not-entered tag *before* it builds the payload, and blur alone is
 * not reliable — a tap on Save on iOS does not always blur first.
 */
const FormTagInput = React.forwardRef(
  ({ value = [], onChange, labelKey = 'form.tagsLabel', placeholderKey = 'form.tagPlaceholder', helperKey = null }, ref) => {
    const { t } = useTranslation()
    const [pending, setPending] = useState('')
    const pendingRef = useRef('')
    pendingRef.current = pending

    const commit = useCallback(
      (raw) => {
        const tag = raw.trim()
        setPending('')
        if (!tag || value.includes(tag)) return
        onChange([...value, tag])
      },
      [value, onChange]
    )

    useImperativeHandle(ref, () => ({ commitPending: () => commit(pendingRef.current) }), [commit])

    return (
      <FormFieldFrame labelKey={labelKey} helperKey={helperKey}>
        {({ describedBy }) => (
          <Box
            sx={{
              p: 1,
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
              borderRadius: 'sm',
              bgcolor: 'background.surface',
              display: 'flex',
              flexDirection: 'column',
              // No minHeight: the container is the size of what is in it, and
              // with no tags that is one input.
              '&:focus-within': { borderColor: 'primary.outlinedBorder' }
            }}
          >
            {value.length > 0 && (
              <Stack direction='row' flexWrap='wrap' spacing={1} useFlexGap sx={{ mb: 1 }}>
                {value.map((tag) => (
                  <Chip
                    key={tag}
                    variant='soft'
                    color='primary'
                    size='sm'
                    sx={touchTarget}
                    endDecorator={
                      <ChipDelete
                        variant='plain'
                        aria-label={t('form.tagRemoveAria', { tag })}
                        onDelete={() => onChange(value.filter((item) => item !== tag))}
                        sx={{ minWidth: { xs: 44, sm: 20 }, minHeight: { xs: 44, sm: 20 }, ...focusRing }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </ChipDelete>
                    }
                  >
                    {tag}
                  </Chip>
                ))}
              </Stack>
            )}

            <Input
              variant='plain'
              size='sm'
              value={pending}
              placeholder={t(placeholderKey)}
              onChange={(event) => setPending(event.target.value)}
              onBlur={() => commit(pending)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                // Enter adds a tag; it must never reach a submit handler and
                // save a half-composed object (§5.9).
                event.preventDefault()
                commit(pending)
              }}
              slotProps={{ input: { 'aria-label': t('form.tagAddAria'), 'aria-describedby': describedBy } }}
              sx={{ p: 0, flex: 1, bgcolor: 'transparent', '--Input-focusedThickness': '0px', ...focusRing }}
            />
          </Box>
        )}
      </FormFieldFrame>
    )
  }
)

FormTagInput.displayName = 'FormTagInput'

export default FormTagInput
