/**
 * ONB-007 — StudyGoalSelector.
 *
 * The acceptance criterion is narrow and worth pinning literally: exactly one
 * choice from `STUDY_GOALS`, through controls a keyboard and a screen reader
 * can actually drive. The interesting assertions are therefore about the DOM
 * primitives — real `input[type=radio]` elements sharing one group name — since
 * that, not any styling, is what buys arrow-key navigation, a single tab stop
 * and enforced exclusivity.
 */
jest.mock('react-i18next', () => {
  const bundle = require('../../../locales/en/translation.json')
  const resolve = (key) => key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), bundle)
  return {
    useTranslation: () => ({
      t: (key, options) => {
        const raw = resolve(key)
        if (typeof raw !== 'string') return key
        return raw.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? `{{${name}}}`))
      },
      i18n: { language: 'en' }
    })
  }
})

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import StudyGoalSelector from '../StudyGoalSelector'
import { STUDY_GOALS } from '../../../constants/learningTaxonomy'
import en from '../../../locales/en/translation.json'

const labelOf = (value) => en.taxonomy.goals[value]

const setup = (props = {}) => {
  const onChange = jest.fn()
  const utils = render(<StudyGoalSelector value={null} onChange={onChange} {...props} />)
  return { onChange, ...utils }
}

describe('StudyGoalSelector — the goals it renders', () => {
  it('renders exactly the 5 canonical goals, in canonical order', () => {
    setup()
    const options = screen.getAllByRole('radio')

    expect(options).toHaveLength(5)
    expect(options.map((option) => option.getAttribute('value'))).toEqual(STUDY_GOALS.map((goal) => goal.value))
    STUDY_GOALS.forEach((goal) => expect(screen.getByRole('radio', { name: labelOf(goal.value) })).toBeInTheDocument())
  })

  it('names the group and its guidance explicitly', () => {
    setup()
    const radiogroup = screen.getByRole('radiogroup', { name: en.taxonomy.selector.goals.label })

    expect(radiogroup).toBeInTheDocument()
    expect(radiogroup).toHaveAccessibleDescription(en.taxonomy.selector.goals.hint)
  })
})

describe('StudyGoalSelector — exactly one choice', () => {
  it('starts with nothing chosen, because a goal is not required to leave the screen', () => {
    setup()

    screen.getAllByRole('radio').forEach((option) => expect(option).not.toBeChecked())
  })

  it('checks the supplied value and nothing else', () => {
    setup({ value: 'career' })

    expect(screen.getByRole('radio', { name: labelOf('career') })).toBeChecked()
    STUDY_GOALS.filter((goal) => goal.value !== 'career').forEach((goal) =>
      expect(screen.getByRole('radio', { name: labelOf(goal.value) })).not.toBeChecked()
    )
  })

  it('reports the canonical wire value on change, not the translated label', () => {
    const { onChange } = setup({ value: 'career' })

    fireEvent.click(screen.getByRole('radio', { name: labelOf('hobby') }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('hobby')
  })
})

describe('StudyGoalSelector — keyboard and assistive-technology operability', () => {
  it('uses real radio inputs sharing one group name, so arrow keys and exclusivity come for free', () => {
    setup({ name: 'onboarding-goal' })

    screen.getAllByRole('radio').forEach((option) => {
      expect(option.tagName).toBe('INPUT')
      expect(option).toHaveAttribute('type', 'radio')
      expect(option).toHaveAttribute('name', 'onboarding-goal')
      expect(option).not.toHaveAttribute('tabindex', '0') // no div pretending to be a control
    })
  })

  it('disables every option together when the caller is mid-save', () => {
    setup({ value: 'general', disabled: true })

    screen.getAllByRole('radio').forEach((option) => expect(option).toBeDisabled())
  })
})
