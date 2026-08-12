import React, { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, FormLabel, RadioGroup, Stack, Typography } from '@mui/joy'
import { Add as AddIcon } from '@mui/icons-material'

import { focusRing, formLabel } from '../../Common/Form/formStyles'
import QuizOptionRow from './QuizOptionRow'

const UNDO_WINDOW_MS = 5000
const MINIMUM_OPTIONS = 2

/**
 * The answer-option region of a quiz card (CARDS.md §4.5, §7.1, §8.3).
 *
 * Opens on two rows, not the four `QuizCardModal` initialised — four empty
 * inputs is four pieces of chrome for zero data, and roughly 110px of a phone
 * viewport that the keyboard is about to take anyway.
 *
 * The group is a required region, so it cannot be disclosed, and its error is
 * relational: "fewer than two options" and "no correct answer" are properties
 * of the set, not of a row. The message therefore renders once under the group
 * and the group itself is the focus target — nothing persists per row, so
 * there is no per-row error surface (§10).
 *
 * Removing a row that has text in it is undoable for five seconds. Always
 * visible plus one tap from destroying typed input is the failure mode that
 * sits opposite hover-reveal's; low emphasis plus undo answers both.
 */
const QuizOptionList = ({ options, correctIndex, setOptions, setCorrectIndex, errorKey, groupRef, optionsRef }) => {
  const { t } = useTranslation()
  const generatedId = useId()
  const errorId = `quiz-options-error-${generatedId}`
  const inputRefs = useRef([])
  const addButtonRef = useRef(null)
  const [removed, setRemoved] = useState(null)

  // Focus the trailing row when it is blank — the one Add or Enter just
  // appended. Guarded on a length change so typing in an earlier row while a
  // blank row trails does not yank the cursor to the bottom.
  const previousLength = useRef(-1)
  useEffect(() => {
    const changed = previousLength.current !== options.length
    previousLength.current = options.length
    if (!changed || options.length === 0) return
    const last = options.length - 1
    if (options[last]) return
    const timer = setTimeout(() => inputRefs.current[last]?.focus(), 50)
    return () => clearTimeout(timer)
  }, [options])

  // "Fewer than two options" has no field to blame either, but it does have a
  // sensible destination: the row the user has not filled in yet. Exposed as a
  // `focus` method so the form's focus table can treat it like any other
  // target and needs no special case for this one field.
  useImperativeHandle(
    optionsRef,
    () => ({
      focus: () => {
        const empty = options.findIndex((option) => option.trim() === '')
        const node = inputRefs.current[empty < 0 ? 0 : empty]
        node?.focus()
        node?.scrollIntoView?.({ block: 'nearest' })
      }
    }),
    [options]
  )

  useEffect(() => {
    if (!removed) return undefined
    const timer = setTimeout(() => setRemoved(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [removed])

  const addOption = useCallback(() => setOptions([...options, '']), [options, setOptions])

  const updateOption = useCallback(
    (index, value) => setOptions(options.map((option, position) => (position === index ? value : option))),
    [options, setOptions]
  )

  const removeOption = useCallback(
    (index) => {
      const next = options.filter((_, position) => position !== index)
      setOptions(next)

      // The designation is positional, so removing a row above it shifts it.
      if (correctIndex === index) setCorrectIndex(null)
      else if (correctIndex > index) setCorrectIndex(correctIndex - 1)

      // Deleting an empty row costs nothing, so it is silent and immediate.
      setRemoved(options[index] ? { index, value: options[index], wasCorrect: correctIndex === index } : null)

      inputRefs.current.splice(index, 1)
      // The row that held focus is gone. Without this, focus falls to <body>.
      if (next.length <= MINIMUM_OPTIONS) setTimeout(() => addButtonRef.current?.focus(), 0)
      else setTimeout(() => inputRefs.current[Math.min(index, next.length - 1)]?.focus(), 0)
    },
    [options, correctIndex, setOptions, setCorrectIndex]
  )

  const undoRemove = useCallback(() => {
    if (!removed) return
    const next = [...options]
    next.splice(removed.index, 0, removed.value)
    setOptions(next)
    if (removed.wasCorrect) setCorrectIndex(removed.index)
    else if (correctIndex !== null && correctIndex >= removed.index) setCorrectIndex(correctIndex + 1)
    setRemoved(null)
    setTimeout(() => inputRefs.current[removed.index]?.focus(), 0)
  }, [removed, options, correctIndex, setOptions, setCorrectIndex])

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1, gap: 1 }}>
        <FormLabel sx={formLabel}>{t('cards.quiz.optionsLabel')}</FormLabel>
        {/* The group heading carries Add, so the list needs no trailing
            control competing with the sheet's own primary action. */}
        <Button
          ref={addButtonRef}
          size='sm'
          variant='soft'
          color='neutral'
          onClick={addOption}
          startDecorator={<AddIcon sx={{ fontSize: 14 }} />}
          sx={{ flexShrink: 0, minHeight: { xs: 44, sm: 32 }, ...focusRing }}
        >
          {t('cards.quiz.addOption')}
        </Button>
      </Stack>

      <RadioGroup
        ref={groupRef}
        // tabIndex so the relational error has somewhere to send focus: there
        // is no single field to blame when the failure is about the set.
        tabIndex={-1}
        aria-label={t('cards.quiz.optionsAria')}
        aria-describedby={errorKey ? errorId : undefined}
        value={correctIndex === null || correctIndex === undefined ? '' : String(correctIndex)}
        onChange={(event) => setCorrectIndex(Number(event.target.value))}
        sx={{ gap: 1.5, ...focusRing }}
      >
        {options.map((option, index) => (
          <QuizOptionRow
            key={index}
            index={index}
            value={option}
            onChange={updateOption}
            onEnter={addOption}
            onRemove={removeOption}
            removable={options.length > MINIMUM_OPTIONS}
            inputRef={(node) => {
              inputRefs.current[index] = node
            }}
          />
        ))}
      </RadioGroup>

      {errorKey && (
        <Typography id={errorId} level='body-xs' sx={{ mt: 0.75, color: 'danger.plainColor' }}>
          {t(errorKey)}
        </Typography>
      )}

      {removed && (
        <Stack direction='row' alignItems='center' spacing={1} sx={{ mt: 0.75 }}>
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('cards.quiz.optionRemoved')}
          </Typography>
          <Button size='sm' variant='plain' color='neutral' onClick={undoRemove} sx={{ minHeight: { xs: 44, sm: 24 }, ...focusRing }}>
            {t('cards.quiz.undoRemove')}
          </Button>
        </Stack>
      )}
    </Box>
  )
}

export default QuizOptionList
