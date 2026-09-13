/**
 * Adding a focus area, from the phone (MOB-045).
 *
 * The web asks for all three at once, in a wizard with an intro about the
 * Power of 3, tips, a review step and a finalise key. That is a good first-run
 * experience on a desktop and a bad one on a phone: five screens deep before
 * anything is saved, on a device the user opened for thirty seconds.
 *
 * So the phone adds ONE at a time, which is also what the plan screen needs —
 * a fourth area is refused by the same rule either way, and the Add key
 * disappears at three rather than failing at four.
 *
 * The eight colours are `FOCUS_AREA_COLORS`, shared, because an area's colour
 * is how it is recognised on the calendar and in the plan on both clients. The
 * one offered first is the first one nothing is using, so three areas made in
 * a row are three different colours without the user choosing.
 */
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { annualPlanningService } from '@nowry/core/api/services'
import { FOCUS_AREA_COLORS } from '@nowry/core/domain/focusAreas'
import { readableTextOn } from '@nowry/core/tokens/colorSchemeGenerator'
import { useTheme } from '../theme'
import { resolveColor } from '../ui/Typography'
import { MIN_TOUCH_TARGET } from '../ui/buttonSpec'
import { BottomSheet, Button, DateField, FormField, Icon, Input, Stack, Typography } from '../ui'

export function AreaSheet({ open, planId, order = 1, existing = [], onClose, onSaved }) {
  const { t } = useTranslation()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(FOCUS_AREA_COLORS[0])
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setInvalid(false)
    setFailed(false)
    const taken = new Set(existing.map((area) => (area?.color ?? '').toUpperCase()))
    setColor(FOCUS_AREA_COLORS.find((candidate) => !taken.has(candidate.toUpperCase())) ?? FOCUS_AREA_COLORS[0])
  }, [open, existing])

  const save = async () => {
    if (saving) return
    if (!name.trim()) {
      setInvalid(true)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await annualPlanningService.createFocusArea({
        annual_plan_id: planId,
        name: name.trim(),
        description: description.trim(),
        // The web's wizard writes an emoji here. The phone has no icon picker
        // yet and an empty string is what the API treats as none, so a blank
        // is honest where a default emoji would be a choice made for the user.
        icon: '',
        color,
        order
      })
      onSaved?.()
      onClose?.()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={open} onClose={saving ? () => {} : onClose} title={t('annualPlanning.focusArea.add')}>
      <Stack spacing={2}>
        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('annualPlanning.focusArea.setup.saveError')}
          </Typography>
        ) : null}

        <FormField labelKey='annualPlanning.focusArea.setup.nameLabel' required errorKey={invalid ? 'form.requiredField' : null}>
          {({ invalid: bad }) => (
            <Input
              value={name}
              onChangeText={(value) => {
                setName(value)
                if (value.trim()) setInvalid(false)
              }}
              invalid={bad}
              accessibilityLabel={t('annualPlanning.focusArea.setup.nameLabel')}
              placeholder={t('annualPlanning.focusArea.setup.namePlaceholder')}
            />
          )}
        </FormField>

        <FormField labelKey='annualPlanning.focusArea.setup.descriptionLabel'>
          <Input
            value={description}
            onChangeText={setDescription}
            multiline
            accessibilityLabel={t('annualPlanning.focusArea.setup.descriptionLabel')}
            placeholder={t('annualPlanning.focusArea.setup.descriptionPlaceholder')}
          />
        </FormField>

        <FormField labelKey='annualPlanning.focusArea.setup.colorTheme'>
          <Swatches value={color} onChange={setColor} t={t} />
        </FormField>

        <Stack direction='row' spacing={1}>
          <Button variant='tertiary' style={{ flex: 1 }} onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button style={{ flex: 1 }} loading={saving} onPress={save}>
            {t('annualPlanning.focusArea.add')}
          </Button>
        </Stack>
      </Stack>
    </BottomSheet>
  )
}

/**
 * The eight, as targets rather than dots: 44pt each, with the chosen one
 * carrying a tick. A ring alone would be the only signal, and a ring on a
 * colour is exactly what a viewer who cannot separate those two hues cannot
 * see.
 */
function Swatches({ value, onChange, t }) {
  const theme = useTheme()

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[1] }}>
      {FOCUS_AREA_COLORS.map((color) => {
        const chosen = color === value
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole='radio'
            accessibilityState={{ selected: chosen }}
            accessibilityLabel={t('annualPlanning.focusArea.setup.colorSwatchLabel', { color })}
            style={{
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              borderRadius: theme.radius.sm,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: chosen ? 2 : 0,
              borderColor: resolveColor(theme, 'text.primary')
            }}
          >
            {chosen ? <Icon name='Check' size='sm' literalColor={readableTextOn(color)} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

/**
 * Adding one step to a goal (MOB-047).
 *
 * A title and a date, which is the whole of a milestone the phone can make. The
 * web's goal form can also mark one as a key result and reorder the set; both
 * are restructuring, and restructuring stays on the web for now (PRD FR-022).
 *
 * It posts through `createMilestone(goalId, …)` rather than replacing the
 * goal's whole array, so adding a step while another device ticks one does not
 * undo the tick.
 */
export function MilestoneSheet({ goalId, open, onClose, onSaved }) {
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDue('')
    setInvalid(false)
    setFailed(false)
  }, [open])

  const save = async () => {
    if (saving) return
    if (!title.trim()) {
      setInvalid(true)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await annualPlanningService.createMilestone(goalId, { title: title.trim(), due_date: due || null })
      onSaved?.()
      onClose?.()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet visible={open} onClose={saving ? () => {} : onClose} title={t('annualPlanning.goal.addMilestoneButton')}>
      <Stack spacing={2}>
        {failed ? (
          <Typography level='body-sm' color='danger.plainColor' accessibilityLiveRegion='polite'>
            {t('annualPlanning.goal.milestoneUpdateError')}
          </Typography>
        ) : null}

        <FormField labelKey='calendarModal.form.title' required errorKey={invalid ? 'form.requiredField' : null}>
          {({ invalid: bad }) => (
            <Input
              value={title}
              onChangeText={(value) => {
                setTitle(value)
                if (value.trim()) setInvalid(false)
              }}
              invalid={bad}
              accessibilityLabel={t('annualPlanning.goal.milestoneTitleAria')}
              placeholder={t('annualPlanning.goal.milestonePlaceholder')}
            />
          )}
        </FormField>

        <FormField labelKey='calendarModal.form.date'>
          <DateField
            value={due}
            onChange={setDue}
            accessibilityLabel={t('annualPlanning.goal.milestoneDueDateAria')}
            placeholderKey='annualPlanning.goal.milestoneNoDate'
          />
        </FormField>

        <Stack direction='row' spacing={1}>
          <Button variant='tertiary' style={{ flex: 1 }} onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button style={{ flex: 1 }} loading={saving} onPress={save}>
            {t('annualPlanning.goal.addMilestoneButton')}
          </Button>
        </Stack>
      </Stack>
    </BottomSheet>
  )
}

export default AreaSheet
