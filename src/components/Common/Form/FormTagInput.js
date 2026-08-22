import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Autocomplete, AutocompleteOption, Box, Chip, ChipDelete, Stack } from '@mui/joy'
import { Close as CloseIcon } from '@mui/icons-material'

import FormFieldFrame from './FormFieldFrame'
import { focusRing, touchTarget } from './formStyles'

/**
 * FormTagInput — tags as removable chips, typed with existing-tag suggestions.
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
 *
 * `suggestions` (optional, `string[]`) is the caller's tag pool — the entry
 * row becomes a single-value, `freeSolo` `Autocomplete` instead of a plain
 * `Input` the moment it is non-empty, so "test" and "Test" don't quietly
 * become two different tags: an existing one shows up as a click-to-select
 * option instead of inviting a retyped near-duplicate. Callers with no pool
 * (or that haven't fetched one) get exactly the old plain-input behaviour —
 * the prop defaults to `[]`, which renders no dropdown at all. Selection
 * commits through the same `commit()` free-solo typing already used, so the
 * chip list, dedupe and imperative handle are unaffected either way.
 */
const FormTagInput = React.forwardRef(
  (
    { value = [], onChange, labelKey = 'form.tagsLabel', placeholderKey = 'form.tagPlaceholder', helperKey = null, suggestions = [] },
    ref
  ) => {
    const { t } = useTranslation()
    const [pending, setPending] = useState('')
    const pendingRef = useRef('')
    pendingRef.current = pending

    const commit = useCallback(
      (raw) => {
        const tag = (raw || '').trim()
        setPending('')
        if (!tag || value.includes(tag)) return
        onChange([...value, tag])
      },
      [value, onChange]
    )

    // `pendingTag()` alongside `commitPending()` because committing is a state
    // update: a submit handler that commits and then reads `values` from its own
    // closure still reads the list from before the commit, and drops the tag it
    // just rescued. The payload builder reads the pending text directly.
    useImperativeHandle(ref, () => ({ commitPending: () => commit(pendingRef.current), pendingTag: () => pendingRef.current }), [commit])

    // Tags already on this card never reappear as a suggestion for it — that
    // offer would just be a slower way to trigger the exact-duplicate refusal
    // `commit()` already does above.
    const selectedLower = useMemo(() => new Set(value.map((tag) => tag.toLowerCase())), [value])
    const options = useMemo(() => suggestions.filter((tag) => !selectedLower.has(tag.toLowerCase())), [suggestions, selectedLower])

    return (
      <FormFieldFrame labelKey={labelKey} helperKey={helperKey}>
        {({ describedBy }) => (
          <Box
            // Enter never reaches anything above this box: the capture phase
            // runs before Autocomplete's own bubble-phase Enter handler, so it
            // cannot interfere with option-selection or free-solo creation —
            // it only stops Enter's native default (§5.9), which the internal
            // handler itself skips for a single-value freeSolo field.
            onKeyDownCapture={(event) => {
              if (event.key === 'Enter') event.preventDefault()
            }}
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

            <Autocomplete
              variant='plain'
              size='sm'
              freeSolo
              disableClearable
              forcePopupIcon={false}
              options={options}
              inputValue={pending}
              // `reset` is Autocomplete re-syncing the input from its own
              // (uncontrolled) `value` after a selection — always to text we
              // just cleared via `commit()`. Applying it would silently put
              // the just-added tag straight back in the box.
              onInputChange={(event, newInputValue, reason) => {
                if (reason === 'reset') return
                setPending(newInputValue)
              }}
              // Fires identically for a clicked/Enter-selected suggestion and
              // for free-solo Enter on unmatched text — one path for both, so
              // "select the existing tag" and "type a new one" both land on
              // the same `commit()` the imperative handle and blur already use.
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') commit(newValue)
              }}
              onBlur={() => commit(pendingRef.current)}
              placeholder={t(placeholderKey)}
              noOptionsText={t('form.tagNoSuggestions')}
              renderOption={(optionProps, option) => {
                const { key, ...rest } = optionProps
                return (
                  <AutocompleteOption key={key ?? option} {...rest}>
                    {option}
                  </AutocompleteOption>
                )
              }}
              slotProps={{
                // The ring lives on the native input's own sx, not the root's —
                // it is the input that actually receives keyboard focus, and
                // `:focus-visible` only matches the element that has it.
                input: { 'aria-label': t('form.tagAddAria'), 'aria-describedby': describedBy, sx: focusRing },
                listbox: { sx: { zIndex: 'modal' } }
              }}
              sx={{
                p: 0,
                flex: 1,
                border: 'none',
                boxShadow: 'none',
                bgcolor: 'transparent',
                '--Input-focusedThickness': '0px'
              }}
            />
          </Box>
        )}
      </FormFieldFrame>
    )
  }
)

FormTagInput.displayName = 'FormTagInput'

export default FormTagInput
