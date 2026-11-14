/**
 * ADMIN-007a — the Invitations tab's rules (FR-012): pasted text becomes
 * entries, a dry run becomes summary lines, a send leaves the lines that did
 * not go, and each row offers the actions its state allows.
 */
import {
  COHORT_PATTERN,
  DEFAULT_COHORT,
  INVITE_LOCALES,
  MAX_BATCH,
  apiErrorCode,
  defaultInviteLocale,
  inviteCount,
  isValidCohort,
  parseAddresses,
  rowActions,
  sendSummary,
  summarizeCheck,
  unsentEntries
} from '../invitations'

describe('parseAddresses', () => {
  it('splits on newlines and commas, trims, and drops the empty pieces', () => {
    expect(parseAddresses(' a@x.com\n\nb@y.org , c@z.io,\r\n  ,d@w.net  ')).toEqual(['a@x.com', 'b@y.org', 'c@z.io', 'd@w.net'])
  })

  it('reads nothing from nothing', () => {
    expect(parseAddresses('')).toEqual([])
    expect(parseAddresses(undefined)).toEqual([])
    expect(parseAddresses(' \n , ')).toEqual([])
  })

  it('keeps duplicates and bad lines: the API answers each one', () => {
    expect(parseAddresses('a@x.com\na@x.com\npedro@example')).toEqual(['a@x.com', 'a@x.com', 'pedro@example'])
  })

  it('caps a batch at fifty', () => {
    expect(MAX_BATCH).toBe(50)
  })
})

describe('isValidCohort', () => {
  it.each(['c1-waitlist', 'friends', 'a', '0-play', 'x'.repeat(40)])('accepts %s', (name) => {
    expect(isValidCohort(name)).toBe(true)
  })

  it.each(['', '-lead', 'Upper', 'with space', 'under_score', 'x'.repeat(41), null])('refuses %s', (name) => {
    expect(isValidCohort(name)).toBe(false)
  })

  it('is the API pattern', () => {
    expect(COHORT_PATTERN.source).toBe('^[a-z0-9][a-z0-9-]*$')
    expect(DEFAULT_COHORT).toBe('c1-waitlist')
  })
})

describe('defaultInviteLocale', () => {
  it('takes the admin language when it is one of the five', () => {
    expect(defaultInviteLocale('es')).toBe('es')
    expect(defaultInviteLocale('fr-CA')).toBe('fr')
    expect(defaultInviteLocale('ja')).toBe('ja')
  })

  it('falls back to English', () => {
    expect(defaultInviteLocale('pt-BR')).toBe('en')
    expect(defaultInviteLocale(undefined)).toBe('en')
    expect(INVITE_LOCALES).toEqual(['en', 'es', 'fr', 'de', 'ja'])
  })
})

const results = [
  { input: 'lucia@example.com', email: 'lucia@example.com', outcome: 'will_invite' },
  { input: 'tom@example.org', email: 'tom@example.org', outcome: 'will_invite' },
  { input: 'ana@example.com', email: 'ana@example.com', outcome: 'open_invite' },
  { input: 'pedro@example', email: null, outcome: 'invalid' },
  { input: 'old@example.com', email: 'old@example.com', outcome: 'has_account' },
  { input: 'gone@example.com', email: 'gone@example.com', outcome: 'left_list' },
  { input: 'bad', email: null, outcome: 'invalid' }
]

describe('summarizeCheck', () => {
  it('groups the outcomes in the order the board reads them, with line numbers', () => {
    expect(summarizeCheck(results)).toEqual([
      { outcome: 'will_invite', count: 2, lines: [1, 2] },
      { outcome: 'open_invite', count: 1, lines: [3] },
      { outcome: 'invalid', count: 2, lines: [4, 7] },
      { outcome: 'has_account', count: 1, lines: [5] },
      { outcome: 'left_list', count: 1, lines: [6] }
    ])
  })

  it('leaves out the outcomes nobody had, and reads a missing answer as empty', () => {
    expect(summarizeCheck([{ input: 'a@x.com', outcome: 'will_invite' }])).toEqual([{ outcome: 'will_invite', count: 1, lines: [1] }])
    expect(summarizeCheck(undefined)).toEqual([])
  })

  it('orders the send outcomes too', () => {
    const sent = [
      { input: 'a', outcome: 'send_failed' },
      { input: 'b', outcome: 'sent' }
    ]
    expect(summarizeCheck(sent).map((line) => line.outcome)).toEqual(['sent', 'send_failed'])
  })
})

describe('inviteCount', () => {
  it('counts the addresses that will be invited', () => {
    expect(inviteCount(results)).toBe(2)
    expect(inviteCount([])).toBe(0)
    expect(inviteCount(null)).toBe(0)
  })
})

describe('sendSummary', () => {
  it('says what was sent and what was not', () => {
    const answer = [
      { input: 'a', outcome: 'sent' },
      { input: 'b', outcome: 'sent' },
      { input: 'c', outcome: 'open_invite' },
      { input: 'd', outcome: 'invalid' },
      { input: 'e', outcome: 'send_failed' }
    ]
    expect(sendSummary(answer)).toEqual({
      tone: 'warning',
      parts: [
        { outcome: 'sent', count: 2, lines: [1, 2] },
        { outcome: 'send_failed', count: 1, lines: [5] },
        { outcome: 'open_invite', count: 1, lines: [3] },
        { outcome: 'invalid', count: 1, lines: [4] }
      ]
    })
  })

  it('is a success when every email left, and neutral when none did', () => {
    expect(sendSummary([{ input: 'a', outcome: 'sent' }]).tone).toBe('success')
    expect(sendSummary([{ input: 'a', outcome: 'has_account' }]).tone).toBe('neutral')
  })
})

describe('unsentEntries', () => {
  it('keeps every line that was not sent, in order', () => {
    const entries = ['a', 'b', 'c', 'd']
    const answer = [
      { input: 'a', outcome: 'sent' },
      { input: 'b', outcome: 'invalid' },
      { input: 'c', outcome: 'sent' },
      { input: 'd', outcome: 'send_failed' }
    ]
    expect(unsentEntries(entries, answer)).toEqual(['b', 'd'])
  })

  it('keeps everything when the answer is missing', () => {
    expect(unsentEntries(['a'], undefined)).toEqual(['a'])
  })
})

describe('rowActions', () => {
  it.each([
    ['open', ['resend', 'revoke']],
    ['expired', ['resend']],
    ['revoked', ['inviteAgain']],
    ['used', []],
    ['unknown', []]
  ])('%s → %j', (state, actions) => {
    expect(rowActions({ state })).toEqual(actions)
  })
})

describe('apiErrorCode', () => {
  it('reads the code the API put in the detail', () => {
    expect(apiErrorCode({ response: { status: 409, data: { detail: { code: 'over_budget', needed: 3, left: 1 } } } })).toBe('over_budget')
    expect(apiErrorCode({ response: { status: 500, data: { detail: 'boom' } } })).toBeNull()
    expect(apiErrorCode(undefined)).toBeNull()
  })
})
