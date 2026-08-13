import React from 'react'
import { useTranslation } from 'react-i18next'
import { FormControl, FormLabel, Option, Select, Stack } from '@mui/joy'
import { CalendarToday as CalendarTodayIcon } from '@mui/icons-material'
import { focusRing } from './goalStyles'

const QUARTERS = [
  { value: 1, key: 'annualPlanning.goal.timeframeQ1' },
  { value: 2, key: 'annualPlanning.goal.timeframeQ2' },
  { value: 3, key: 'annualPlanning.goal.timeframeQ3' },
  { value: 4, key: 'annualPlanning.goal.timeframeQ4' }
]

/**
 * The editable timeframe block: which quarter (or the whole year) a goal is
 * for, and the objective it rolls up to.
 *
 * Rendered at rest only where the caller supplied no scope, and on demand
 * behind the rail's "Change timeframe" chip. Never in Edit mode.
 *
 * The yearly option used to read "📅 All Year (Objective)". DESIGN_GUIDELINES
 * §8.5 asked for emoji in Select options; §13.4 forbids emoji as button
 * content, and Joy renders a Select trigger as a <button>, so the selected
 * option's emoji landed inside one. §13.4 wins — this is a real Joy icon.
 */
const GoalTimeframeFields = ({ formData, setField, yearlyObjectives, selectRef }) => {
  const { t } = useTranslation()

  return (
    <Stack spacing={2}>
      <FormControl>
        <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.timeframeQuestion')}</FormLabel>
        <Select
          value={formData.type === 'yearly' ? 'yearly' : formData.quarter}
          onChange={(e, val) => {
            setField('type', val === 'yearly' ? 'yearly' : 'quarterly')
            setField('quarter', val === 'yearly' ? '' : val)
          }}
          size='lg'
          slotProps={{ button: { ref: selectRef } }}
          sx={focusRing}
        >
          <Option value='yearly'>
            <CalendarTodayIcon sx={{ fontSize: 16, mr: 1, color: 'text.tertiary' }} />
            {t('annualPlanning.goal.timeframeYearly')}
          </Option>
          {QUARTERS.map(({ value, key }) => (
            <Option key={value} value={value}>
              {t(key)}
            </Option>
          ))}
        </Select>
      </FormControl>

      {formData.type === 'quarterly' && yearlyObjectives.length > 0 && (
        <FormControl>
          <FormLabel sx={{ fontWeight: 600 }}>{t('annualPlanning.goal.linkToObjective')}</FormLabel>
          <Select
            value={formData.parent_id}
            onChange={(e, val) => setField('parent_id', val)}
            placeholder={t('annualPlanning.goal.parentPlaceholder')}
            size='lg'
            sx={focusRing}
          >
            {yearlyObjectives.map((obj) => (
              <Option key={obj._id} value={obj._id}>
                {obj.title}
              </Option>
            ))}
          </Select>
        </FormControl>
      )}
    </Stack>
  )
}

export default GoalTimeframeFields
