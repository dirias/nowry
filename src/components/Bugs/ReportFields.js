import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Textarea,
  Typography
} from '@mui/joy'
import { AddRounded, CloseRounded } from '@mui/icons-material'
import { REPORT_AREAS, REPORT_LIMITS, SCREENSHOT_TYPES, SEVERITIES, fieldLimit } from '@nowry/core/domain/bugReports'
import { focusRing, formLabel, segment, segmentedGroup, tabularNums } from '../Common/Form/formStyles'
import { shrinkScreenshot } from './reportContext'

/**
 * The report form's fields (BUG-001, ADMIN-008a; board G): the three texts with
 * their limits said before they bite, how bad it is as one segmented control,
 * the area, and up to three screenshots made smaller before they are kept.
 */

/** A counter appears once a field has used this share of its limit. */
const COUNT_FROM = 0.8

const PROBLEM_KEYS = {
  title: { required: 'report.errors.titleRequired' },
  description: { required: 'report.errors.descriptionRequired' }
}

const problemText = (t, field, problem, max) =>
  problem === 'tooLong' ? t('report.errors.tooLong', { max }) : t(PROBLEM_KEYS[field]?.[problem] ?? 'report.errors.descriptionRequired')

/** "Steps to get there optional": a label and its quieter qualifier. */
const Optional = () => {
  const { t } = useTranslation()
  return (
    <Typography component='span' level='body-xs' sx={{ ml: 0.75, color: 'text.tertiary', fontWeight: 'md' }}>
      {t('report.fields.optional')}
    </Typography>
  )
}

/** One text field: its label, the field, and under it the problem and the counter near the limit. */
export function LimitedField({ field, label, optional = false, multiline = false, placeholder, value, problem, onChange, inputRef }) {
  const { t } = useTranslation()
  const max = fieldLimit(field)
  const showCount = value.length >= max * COUNT_FROM
  const helpId = `report-${field}-help`
  const control = {
    value,
    placeholder,
    onChange: (event) => onChange(field, event.target.value),
    slotProps: { [multiline ? 'textarea' : 'input']: { ref: inputRef, 'aria-describedby': problem || showCount ? helpId : undefined } }
  }
  return (
    <FormControl error={Boolean(problem)}>
      <FormLabel sx={formLabel}>
        {label}
        {optional && <Optional />}
      </FormLabel>
      {multiline ? <Textarea minRows={3} maxRows={8} {...control} /> : <Input {...control} />}
      {(problem || showCount) && (
        <FormHelperText id={helpId} sx={{ gap: 1 }}>
          {problem && <span>{problemText(t, field, problem, max)}</span>}
          {showCount && (
            <Box component='span' sx={{ ml: 'auto', color: value.length > max ? 'danger.plainColor' : 'text.tertiary', ...tabularNums }}>
              {t('report.fields.counter', { length: value.length, max })}
            </Box>
          )}
        </FormHelperText>
      )}
    </FormControl>
  )
}

/** "How bad is it?": the four severities as one segmented object (BUTTONS.md §5). */
export function SeverityControl({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <FormControl sx={{ minWidth: 0 }}>
      <FormLabel id='report-severity-label' sx={formLabel}>
        {t('report.fields.severity')}
      </FormLabel>
      <Sheet variant='outlined' role='group' aria-labelledby='report-severity-label' sx={{ ...segmentedGroup, width: '100%' }}>
        {SEVERITIES.map((severity, index) => (
          <Button
            key={severity}
            variant='plain'
            color='neutral'
            aria-pressed={value === severity}
            onClick={() => onChange('severity', severity)}
            sx={{ ...segment(value === severity, index === 0), flex: '1 1 auto', px: 1.25 }}
          >
            {t(`report.severity.${severity}`)}
          </Button>
        ))}
      </Sheet>
    </FormControl>
  )
}

/** The area the problem is in. */
export function AreaSelect({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <FormControl sx={{ minWidth: 0 }}>
      <FormLabel id='report-area-label' sx={formLabel}>
        {t('report.fields.area')}
      </FormLabel>
      <Select
        value={value}
        onChange={(_, next) => next && onChange('category', next)}
        slotProps={{ button: { 'aria-labelledby': 'report-area-label report-area-value', id: 'report-area-value', sx: focusRing } }}
      >
        {REPORT_AREAS.map((area) => (
          <Option key={area} value={area}>
            {t(`report.areas.${area}`)}
          </Option>
        ))}
      </Select>
    </FormControl>
  )
}

const TILE = { width: 64, height: 44, borderRadius: 'sm', flex: 'none' }

/** One kept screenshot, small, with its remove key. */
const Thumb = ({ shot, number, onRemove }) => {
  const { t } = useTranslation()
  return (
    <Box
      sx={{ ...TILE, position: 'relative', border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.level1' }}
    >
      <Box
        component='img'
        src={shot.data}
        alt={t('report.fields.screenshot', { number })}
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <IconButton
        size='sm'
        variant='soft'
        color='neutral'
        onClick={onRemove}
        aria-label={t('report.fields.removeScreenshot', { number })}
        sx={{ position: 'absolute', top: 2, right: 2, '--IconButton-size': '22px', minWidth: 22, minHeight: 22, ...focusRing }}
      >
        <CloseRounded sx={{ fontSize: 'sm' }} />
      </IconButton>
    </Box>
  )
}

const IMAGE_PROBLEMS = {
  type: 'report.errors.imageType',
  tooLarge: 'report.errors.imageTooLarge',
  unreadable: 'report.errors.imageUnreadable'
}

/**
 * "Screenshots 2 of 3 · PNG, JPEG or WebP · made smaller before sending", the
 * kept ones and the add tile. A picture is made smaller as it is picked; one
 * that cannot be is said in a danger alert and not kept.
 */
export function ScreenshotField({ shots, onChange }) {
  const { t } = useTranslation()
  const fileRef = useRef(null)
  const [adding, setAdding] = useState(false)
  const [problem, setProblem] = useState(null)

  const add = async (event) => {
    const file = event.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file || shots.length >= REPORT_LIMITS.screenshots) return
    setAdding(true)
    setProblem(null)
    try {
      const shot = await shrinkScreenshot(file)
      onChange('screenshots', [...shots, shot])
    } catch (error) {
      setProblem(IMAGE_PROBLEMS[error?.code] ?? IMAGE_PROBLEMS.unreadable)
    } finally {
      setAdding(false)
    }
  }
  const remove = (index) =>
    onChange(
      'screenshots',
      shots.filter((_, at) => at !== index)
    )

  return (
    <FormControl>
      <FormLabel sx={{ ...formLabel, flexWrap: 'wrap' }}>
        {t('report.fields.screenshots')}
        <Typography component='span' level='body-xs' sx={{ ml: 0.75, color: 'text.tertiary', fontWeight: 'md' }}>
          {t('report.fields.screenshotsCaption', { used: shots.length })}
        </Typography>
      </FormLabel>
      <input ref={fileRef} type='file' accept={SCREENSHOT_TYPES.join(',')} hidden onChange={add} data-testid='report-screenshot-input' />
      <Stack direction='row' gap={1} flexWrap='wrap'>
        {shots.map((shot, index) => (
          <Thumb key={`${shot.filename}-${shot.uploaded_at}`} shot={shot} number={index + 1} onRemove={() => remove(index)} />
        ))}
        {shots.length < REPORT_LIMITS.screenshots && (
          <IconButton
            variant='plain'
            color='neutral'
            loading={adding}
            onClick={() => fileRef.current?.click()}
            aria-label={t('report.fields.addScreenshot')}
            sx={{ ...TILE, border: '1px dashed', borderColor: 'neutral.outlinedBorder', color: 'text.secondary', ...focusRing }}
          >
            <AddRounded />
          </IconButton>
        )}
      </Stack>
      <Box role='status' aria-live='polite'>
        {problem && (
          <Alert variant='soft' color='danger' size='sm' sx={{ mt: 1 }}>
            {t(problem)}
          </Alert>
        )}
      </Box>
    </FormControl>
  )
}
