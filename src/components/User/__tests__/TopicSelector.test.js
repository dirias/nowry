/**
 * ONB-007 — TopicSelector.
 *
 * The properties pinned here are the ones the acceptance criteria are written
 * against, and each maps to a real defect this component exists to prevent:
 * a fifteenth topic drifting in from a second taxonomy copy, a selection state
 * that only a sighted user with good color vision can perceive, a sixth tap
 * that silently does nothing, and a reorder that quietly changes who the
 * primary topic is.
 *
 * The i18n mock resolves against the real `en` bundle rather than echoing keys,
 * so a key that was never added to the locale files fails here instead of
 * shipping as a raw key on screen.
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
import { render, screen, fireEvent, within } from '@testing-library/react'
import TopicSelector from '../TopicSelector'
import { TOPICS, MAX_TOPICS } from '../../../constants/learningTaxonomy'
import en from '../../../locales/en/translation.json'

const labelOf = (value) => en.taxonomy.topics[value]
const FIVE = TOPICS.slice(0, MAX_TOPICS).map((topic) => topic.value)

const setup = (props = {}) => {
  const onChange = jest.fn()
  const utils = render(<TopicSelector value={[]} onChange={onChange} {...props} />)
  return { onChange, ...utils }
}

const group = () => screen.getByRole('group', { name: en.taxonomy.selector.topics.label })
const optionFor = (value) =>
  within(group()).getByRole('button', { name: new RegExp(`^${labelOf(value).replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}`) })

describe('TopicSelector — the taxonomy it renders', () => {
  it('renders exactly the 14 canonical topics, in canonical order, as toggle buttons', () => {
    setup()
    const options = within(group()).getAllByRole('button')

    expect(options).toHaveLength(14)
    expect(options.map((option) => option.textContent)).toEqual(TOPICS.map((topic) => labelOf(topic.value)))
  })

  it('exposes every option as a toggle through aria-pressed', () => {
    setup({ value: ['technology'] })

    within(group())
      .getAllByRole('button')
      .forEach((option) => expect(option).toHaveAttribute('aria-pressed'))

    expect(optionFor('technology')).toHaveAttribute('aria-pressed', 'true')
    expect(optionFor('science')).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('TopicSelector — selection is not signalled by color', () => {
  it('marks a selected option with a check glyph and unselected ones with an empty one', () => {
    setup({ value: ['technology'] })

    expect(within(optionFor('technology')).getByTestId('CheckCircleRoundedIcon')).toBeInTheDocument()
    expect(within(optionFor('science')).getByTestId('RadioButtonUncheckedRoundedIcon')).toBeInTheDocument()
    expect(within(optionFor('science')).queryByTestId('CheckCircleRoundedIcon')).not.toBeInTheDocument()
  })

  it('states the selection in words inside the accessible name, not only through aria-pressed', () => {
    setup({ value: ['science', 'art'] })

    // The visible label stays first, so the accessible name still matches what
    // a speech-input user would say (WCAG 2.5.3).
    expect(optionFor('art')).toHaveAccessibleName(`${labelOf('art')} Selected, position 2 of 2`)
  })
})

describe('TopicSelector — order is the primary-topic control', () => {
  it('announces the first selection as the primary topic and shows it in the status region', () => {
    setup({ value: ['science', 'art'] })

    expect(optionFor('science')).toHaveAccessibleName(`${labelOf('science')} Selected, primary topic, position 1 of 2`)
    expect(screen.getByRole('status')).toHaveTextContent(`Primary topic: ${labelOf('science')}`)
  })

  it('offers no separate primary-topic control — position is the only one', () => {
    setup({ value: ['science', 'art'] })

    // 14 topic toggles and nothing else: no "make primary", no reorder buttons.
    expect(screen.getAllByRole('button')).toHaveLength(14)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('preserves the order of the survivors when a topic is removed, promoting the next to primary', () => {
    const { onChange } = setup({ value: ['science', 'art', 'music'] })

    fireEvent.click(optionFor('science'))

    expect(onChange).toHaveBeenCalledWith(['art', 'music'])
  })

  it('appends a re-selected topic rather than restoring its old position', () => {
    const { onChange } = setup({ value: ['art', 'music'] })

    fireEvent.click(optionFor('science'))

    expect(onChange).toHaveBeenCalledWith(['art', 'music', 'science'])
  })
})

describe('TopicSelector — the selection limit', () => {
  it('reports progress toward the limit before it is reached', () => {
    setup({ value: ['science', 'art'] })

    expect(screen.getByRole('status')).toHaveTextContent(`2 of ${MAX_TOPICS} selected`)
    expect(screen.getByRole('status')).not.toHaveTextContent('reached the limit')
  })

  it('refuses a sixth topic and says why instead of ignoring the tap', () => {
    const onLimitReached = jest.fn()
    const { onChange } = setup({ value: FIVE, onLimitReached })

    const blocked = optionFor('philosophy')
    fireEvent.click(blocked)

    expect(onChange).not.toHaveBeenCalled()
    expect(onLimitReached).toHaveBeenCalledWith('philosophy')
    expect(screen.getByRole('status')).toHaveTextContent(
      `You have reached the limit of ${MAX_TOPICS} topics. Remove one to choose another.`
    )
  })

  it('ties the reason to the control that refused, and keeps that control reachable', () => {
    setup({ value: FIVE })
    const blocked = optionFor('philosophy')

    expect(blocked).toHaveAttribute('aria-disabled', 'true')
    // `aria-disabled`, never the `disabled` attribute: a control the user cannot
    // focus is a control that cannot tell them why it refused.
    expect(blocked).not.toBeDisabled()

    const reason = document.getElementById(blocked.getAttribute('aria-describedby'))
    expect(reason).toHaveTextContent(`limit of ${MAX_TOPICS} topics`)
    expect(blocked).toHaveAccessibleName(`${labelOf('philosophy')} Not available, limit of ${MAX_TOPICS} topics reached`)
  })

  it('still lets an already-selected topic be removed at the limit', () => {
    const { onChange } = setup({ value: FIVE })

    fireEvent.click(optionFor(FIVE[2]))

    expect(onChange).toHaveBeenCalledWith(FIVE.filter((value) => value !== FIVE[2]))
  })

  it('honours a caller-supplied cap instead of hardcoding five', () => {
    const { onChange } = setup({ value: ['science', 'art'], maxTopics: 2 })

    fireEvent.click(optionFor('music'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('reached the limit of 2 topics')
  })
})

describe('TopicSelector — accessible naming', () => {
  it('gives the group and its guidance explicit names rather than relying on proximity', () => {
    setup()

    expect(group()).toHaveAccessibleName(en.taxonomy.selector.topics.label)
    expect(group()).toHaveAccessibleDescription(`Pick 1 to ${MAX_TOPICS} topics. The first one you pick becomes your primary topic.`)
  })

  it('lets a caller override the label without touching the taxonomy', () => {
    setup({ label: 'Interests' })

    expect(screen.getByRole('group', { name: 'Interests' })).toBeInTheDocument()
  })
})
