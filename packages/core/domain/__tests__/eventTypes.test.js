import { EVENT_TYPES, EVENT_TYPE_NAMES, eventType } from '../calendar/eventTypes'
import { ALL_TYPES } from '../calendar/calendarFilters'
import { COMPLETABLE } from '../calendar/eventHelpers'
import en from '../../locales/en/translation.json'

const at = (key) => key.split('.').reduce((node, part) => node?.[part], en)

describe('the calendar event types', () => {
  it('covers every type the filter names, plus the habit the filter handles separately', () => {
    // `activity` is deliberately outside ALL_TYPES: the habits toggle owns it
    // (useCalendarFilters D-03), which is exactly why a list of "all types"
    // cannot be the list of things that can appear on a day.
    expect(EVENT_TYPE_NAMES.sort()).toEqual([...ALL_TYPES, 'activity'].sort())
  })

  it('names a label that exists', () => {
    Object.values(EVENT_TYPES).forEach(({ labelKey }) => expect(typeof at(labelKey)).toBe('string'))
  })

  it('hands out a key, never a component', () => {
    Object.values(EVENT_TYPES).forEach(({ iconKey }) => expect(typeof iconKey).toBe('string'))
  })

  it('can only be completed where the domain says so', () => {
    COMPLETABLE.forEach((type) => expect(EVENT_TYPES[type]).toBeDefined())
  })

  it('falls back rather than returning undefined', () => {
    expect(eventType('nonsense')).toBe(EVENT_TYPES.goal)
  })
})
