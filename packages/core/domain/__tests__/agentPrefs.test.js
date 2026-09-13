import {
  AGENT_PREFS,
  CONCISENESS,
  FREQUENCY,
  INTERVENTION_TYPES,
  TONE,
  agentPref,
  interventionEnabled,
  interventionKey,
  knowledgeAccessPatch
} from '../agentPrefs'
import { INTERVENTION_CAPS, interventionSettings } from '../interventionPolicy'

describe('the option lists', () => {
  it('offers the three lengths, four tones and three frequencies the server accepts', () => {
    expect(CONCISENESS).toEqual(['concise', 'balanced', 'detailed'])
    expect(TONE).toEqual(['friendly', 'professional', 'socratic', 'strict'])
    expect(FREQUENCY).toEqual(['conservative', 'balanced', 'frequent'])
  })

  it('agrees with the policy about which frequencies exist', () => {
    expect([...FREQUENCY].sort()).toEqual(Object.keys(INTERVENTION_CAPS).sort())
  })

  it('agrees with the policy about which intervention types exist', () => {
    expect([...INTERVENTION_TYPES].sort()).toEqual(Object.keys(interventionSettings(null).types).sort())
  })
})

describe('agentPref', () => {
  it('reads the server spelling', () => {
    expect(agentPref({ agent_tone: 'strict' }, 'tone')).toBe('strict')
    expect(agentPref({ agent_conciseness: 'concise' }, 'conciseness')).toBe('concise')
  })

  it('falls back to what the server means by leaving a field out', () => {
    expect(agentPref({}, 'tone')).toBe('friendly')
    expect(agentPref(null, 'interventionFrequency')).toBe('balanced')
    expect(agentPref(null, 'knowledgeAccess')).toBe(false)
    expect(agentPref(null, 'focusMode')).toBe(false)
  })

  it('keeps a false that was actually stored', () => {
    expect(agentPref({ agent_focus_mode: false }, 'focusMode')).toBe(false)
    expect(agentPref({ agent_knowledge_access: true }, 'knowledgeAccess')).toBe(true)
  })

  it('is nothing for a name it does not carry', () => {
    expect(agentPref({}, 'notAPreference')).toBeNull()
  })
})

describe('interventionEnabled', () => {
  it('names the switch the way the server does', () => {
    expect(interventionKey('wrong_answer')).toBe('agent_intervention_wrong_answer')
  })

  it('treats an absent switch as on, as the policy does', () => {
    expect(interventionEnabled(null, 'wrong_answer')).toBe(true)
    expect(interventionEnabled({}, 'session_summary')).toBe(true)
  })

  it('keeps one that was switched off', () => {
    expect(interventionEnabled({ agent_intervention_wrong_answer: false }, 'wrong_answer')).toBe(false)
  })

  it('reads the same document the policy gates on', () => {
    const stored = { agent_intervention_pre_session: false }
    expect(interventionEnabled(stored, 'pre_session')).toBe(interventionSettings(stored).types.pre_session)
  })
})

describe('knowledgeAccessPatch', () => {
  it('turns the nudges off with the access they depend on', () => {
    expect(knowledgeAccessPatch(false)).toEqual({
      agent_knowledge_access: false,
      agent_proactive_nudging: false
    })
  })

  it('leaves the nudges alone when access is turned on', () => {
    expect(knowledgeAccessPatch(true)).toEqual({ agent_knowledge_access: true })
  })

  it('sends the keys the table names', () => {
    expect(Object.keys(knowledgeAccessPatch(false))).toContain(AGENT_PREFS.proactiveNudging.key)
  })
})
