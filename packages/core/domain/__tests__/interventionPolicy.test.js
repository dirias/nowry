import {
  INTERVENTION_CAPS,
  SILENCE_MS,
  allowIntervention,
  interventionCap,
  interventionSettings,
  sessionSummaryEvent,
  silenceUntil,
  wrongAnswerEvent
} from '../interventionPolicy'

const settings = (over = {}) => ({
  frequency: 'balanced',
  focusMode: false,
  types: {
    wrong_answer: true,
    session_summary: true,
    pre_session: true,
    re_engagement: true,
    streak_milestone: true
  },
  ...over
})

describe('interventionSettings', () => {
  it('reads the four settings off the server payload', () => {
    expect(
      interventionSettings({
        agent_intervention_frequency: 'frequent',
        agent_focus_mode: true,
        agent_intervention_wrong_answer: false
      })
    ).toEqual({
      frequency: 'frequent',
      focusMode: true,
      types: {
        wrong_answer: false,
        session_summary: true,
        pre_session: true,
        re_engagement: true,
        streak_milestone: true
      }
    })
  })

  it('defaults every switch on, because the server omits what was never set', () => {
    const read = interventionSettings(null)
    expect(read.frequency).toBe('balanced')
    expect(read.focusMode).toBe(false)
    expect(Object.values(read.types).every(Boolean)).toBe(true)
  })

  it('keeps a switch that is explicitly false rather than defaulting it on', () => {
    expect(interventionSettings({ agent_intervention_session_summary: false }).types.session_summary).toBe(false)
  })
})

describe('allowIntervention', () => {
  it('allows a message with everything at its default', () => {
    expect(allowIntervention('wrong_answer')).toBe(true)
  })

  it('refuses a type whose own switch is off', () => {
    expect(allowIntervention('wrong_answer', { settings: settings({ types: { wrong_answer: false } }) })).toBe(false)
  })

  it('lets an unknown type through — the server owns the list', () => {
    expect(allowIntervention('something_new', { settings: settings() })).toBe(true)
  })

  it('refuses nothing at all', () => {
    expect(allowIntervention(null)).toBe(false)
    expect(allowIntervention('')).toBe(false)
  })

  describe('focus mode', () => {
    it('blocks an in-session type while a session runs', () => {
      expect(allowIntervention('wrong_answer', { settings: settings({ focusMode: true }), inSession: true })).toBe(false)
    })

    it('does not block a summary, which arrives after the last card', () => {
      expect(allowIntervention('session_summary', { settings: settings({ focusMode: true }), inSession: true })).toBe(true)
    })

    it('does not block outside a session', () => {
      expect(allowIntervention('wrong_answer', { settings: settings({ focusMode: true }), inSession: false })).toBe(true)
    })
  })

  describe('the session cap', () => {
    it('is one on conservative, two on balanced, four on frequent', () => {
      expect(INTERVENTION_CAPS).toEqual({ conservative: 1, balanced: 2, frequent: 4 })
    })

    it('refuses once the count reaches the cap', () => {
      expect(allowIntervention('wrong_answer', { settings: settings(), count: 1 })).toBe(true)
      expect(allowIntervention('wrong_answer', { settings: settings(), count: 2 })).toBe(false)
    })

    it('counts every type against one budget', () => {
      expect(allowIntervention('session_summary', { settings: settings({ frequency: 'conservative' }), count: 1 })).toBe(false)
    })

    it('falls back to the balanced cap for a frequency it does not know', () => {
      expect(interventionCap('hourly')).toBe(2)
      expect(interventionCap(undefined)).toBe(2)
    })
  })

  describe('the silent window', () => {
    it('refuses a wrong answer inside it', () => {
      expect(allowIntervention('wrong_answer', { settings: settings(), silentUntil: 5000, now: 4999 })).toBe(false)
    })

    it('allows one once it has passed', () => {
      expect(allowIntervention('wrong_answer', { settings: settings(), silentUntil: 5000, now: 5000 })).toBe(true)
    })

    it('does not silence a summary', () => {
      expect(allowIntervention('session_summary', { settings: settings(), silentUntil: 5000, now: 1 })).toBe(true)
    })
  })
})

describe('silenceUntil', () => {
  it('is twenty minutes on conservative, ten on balanced, three on frequent', () => {
    expect(SILENCE_MS).toEqual({ conservative: 1200000, balanced: 600000, frequent: 180000 })
    expect(silenceUntil('frequent', 1000)).toBe(181000)
  })

  it('falls back to balanced for an unknown frequency', () => {
    expect(silenceUntil('hourly', 0)).toBe(600000)
  })
})

describe('wrongAnswerEvent', () => {
  const card = {
    _id: 'c1',
    title: 'ずいぶん',
    content: 'considerably',
    notes: 'adverb',
    card_type: 'basic'
  }

  it('builds the payload the server declares', () => {
    expect(wrongAnswerEvent(card, { index: 3, total: 25, deckName: 'JLPT N3' })).toEqual({
      type: 'wrong_answer',
      card_id: 'c1',
      deck_name: 'JLPT N3',
      card_front: 'ずいぶん',
      card_back: 'considerably',
      card_notes: 'adverb',
      card_type: 'basic',
      session_card_index: 4,
      session_total_cards: 25
    })
  })

  it('counts the card the way a person does, not the way a list does', () => {
    expect(wrongAnswerEvent(card, { index: 0, total: 25 }).session_card_index).toBe(1)
  })

  it('reads a card saved under the other shape', () => {
    const event = wrongAnswerEvent({ id: 'c2', front: 'f', back: 'b' })
    expect(event.card_id).toBe('c2')
    expect(event.card_front).toBe('f')
    expect(event.card_back).toBe('b')
    expect(event.card_notes).toBeNull()
    expect(event.card_type).toBe('basic')
  })

  it('is nothing without a card', () => {
    expect(wrongAnswerEvent(null)).toBeNull()
  })

  it('omits the deck rather than naming it "this deck"', () => {
    // The server used to substitute that phrase and hand it to the model as a
    // NAME, which is how a summary came back saying "The deck this deck"
    // (MOB-099). Null lets the server say Unknown, which its own rules forbid
    // it from papering over.
    expect(wrongAnswerEvent(card).deck_name).toBeNull()
    expect(sessionSummaryEvent({ total: 1 }).deck_name).toBeNull()
  })
})

describe('sessionSummaryEvent', () => {
  it('builds the payload the server declares', () => {
    expect(sessionSummaryEvent({ total: 25, wrong: 4, cardId: 'c1', front: 'ずいぶん', deckName: 'JLPT N3' })).toEqual({
      type: 'session_summary',
      deck_name: 'JLPT N3',
      session_total_cards: 25,
      session_wrong_count: 4,
      most_missed_card_id: 'c1',
      most_missed_card_front: 'ずいぶん'
    })
  })

  it('reports no most-missed card rather than omitting the field', () => {
    const event = sessionSummaryEvent({ total: 10, wrong: 0 })
    expect(event.most_missed_card_id).toBeNull()
    expect(event.most_missed_card_front).toBeNull()
  })
})
