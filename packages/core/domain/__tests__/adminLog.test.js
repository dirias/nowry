/**
 * ADMIN-007c — the admin log's sentences, the Overview's grouping and its
 * "Needs you" rows and email meters (FR-011, boards A and K).
 */
import {
  LOG_KINDS,
  actionKind,
  actorOf,
  describeAction,
  describeEntry,
  dayGap,
  emailMeters,
  groupRecent,
  isLogKind,
  needsCount,
  needsRows,
  reasonOf,
  shortWhen
} from '../adminLog'

const ME = { kind: 'admin', username: 'didier', is_you: true }
const ANA = { kind: 'admin', username: 'ana', is_you: false }
const SCRIPT = { kind: 'script', username: null, is_you: false }

const row = (action, extra = {}) => ({
  id: extra.id ?? action,
  at: '2026-11-14T10:00:00',
  actor: ME,
  action,
  target_type: 'invite',
  target_id: 't1',
  target_title: 'ana.r@example.com',
  reason: null,
  details: {},
  ...extra
})

describe('kinds', () => {
  it('lists the filters in the chips’ order', () => {
    expect(LOG_KINDS).toEqual(['invitations', 'moderation', 'bugs', 'access'])
    expect(isLogKind('bugs')).toBe(true)
    expect(isLogKind('all')).toBe(false)
    expect(isLogKind(undefined)).toBe(false)
  })

  it('maps every action to its kind', () => {
    expect(['invite.create', 'invite.send', 'invite.resend', 'invite.revoke'].map(actionKind)).toEqual(Array(4).fill('invitations'))
    expect(['report.review', 'content.remove', 'curation.review'].map(actionKind)).toEqual(Array(3).fill('moderation'))
    expect(actionKind('bug.status')).toBe('bugs')
    expect(['admin.grant', 'admin.revoke'].map(actionKind)).toEqual(['access', 'access'])
    expect(actionKind('something.new')).toBeNull()
  })
})

describe('who did it', () => {
  it('is you, the script, or the admin by name', () => {
    expect(actorOf(ME)).toEqual({ key: 'you' })
    expect(actorOf(SCRIPT)).toEqual({ key: 'script' })
    expect(actorOf(ANA)).toEqual({ name: 'ana' })
    expect(actorOf({ kind: 'admin', username: null, is_you: false })).toEqual({ key: 'someone' })
    expect(actorOf(null)).toEqual({ key: 'someone' })
  })
})

describe('describeAction', () => {
  it('says the invitation calls with the address and the cohort', () => {
    expect(describeAction(row('invite.send', { details: { cohort: 'c1-waitlist' } }))).toEqual({
      id: 'inviteSend',
      values: { email: 'ana.r@example.com', cohort: 'c1-waitlist' }
    })
    expect(describeAction(row('invite.send'))).toEqual({ id: 'inviteSendPlain', values: { email: 'ana.r@example.com' } })
    expect(describeAction(row('invite.create', { details: { cohort: 'friends' } }))).toEqual({
      id: 'inviteCreate',
      values: { email: 'ana.r@example.com', cohort: 'friends' }
    })
    expect(describeAction(row('invite.create'))).toEqual({ id: 'inviteSendPlain', values: { email: 'ana.r@example.com' } })
    expect(describeAction(row('invite.resend'))).toEqual({ id: 'inviteResend', values: { email: 'ana.r@example.com' } })
    expect(describeAction(row('invite.revoke'))).toEqual({ id: 'inviteRevoke', values: { email: 'ana.r@example.com' } })
  })

  it('falls back on the target id when the row has no title', () => {
    expect(describeAction(row('invite.resend', { target_title: null, target_id: 'inv-9' })).values.email).toBe('inv-9')
  })

  it('says admin access granted and taken away', () => {
    expect(describeAction(row('admin.grant', { target_title: 'didier@example.com' }))).toEqual({
      id: 'adminGrant',
      values: { email: 'didier@example.com' }
    })
    expect(describeAction(row('admin.revoke', { target_title: 'didier@example.com' })).id).toBe('adminRevoke')
  })

  it('says a removal with its type and its public copies', () => {
    const removal = row('content.remove', { target_type: 'deck', target_title: 'JLPT N5', reason: 'copyright', details: { copies: 1 } })
    expect(describeAction(removal)).toEqual({ id: 'removeDeckCopies', values: { title: 'JLPT N5', count: 1 } })
    expect(describeAction({ ...removal, details: { copies: 2 } })).toEqual({
      id: 'removeDeckCopies',
      values: { title: 'JLPT N5', count: 2 }
    })
    expect(describeAction({ ...removal, details: {} })).toEqual({ id: 'removeDeck', values: { title: 'JLPT N5' } })
    expect(describeAction({ ...removal, details: { is_copy: true } })).toEqual({ id: 'removeCopy', values: { title: 'JLPT N5' } })
    expect(describeAction({ ...removal, target_type: 'book', details: { copies: 0 } }).id).toBe('removeBook')
    expect(describeAction({ ...removal, target_type: 'book', details: { copies: 3 } }).id).toBe('removeBookCopies')
    expect(describeAction({ ...removal, target_type: 'note', details: null }).id).toBe('removeItem')
  })

  it('says a report review by its decision, and a curation', () => {
    expect(describeAction(row('report.review', { target_title: 'Deck A', details: { decision: 'kept' } }))).toEqual({
      id: 'reportKept',
      values: { title: 'Deck A' }
    })
    expect(describeAction(row('report.review', { target_title: 'Deck A', details: { decision: 'removed' } })).id).toBe('reportRemoved')
    expect(describeAction(row('curation.review', { target_title: 'Kana' }))).toEqual({ id: 'curationReview', values: { title: 'Kana' } })
  })

  it('says a bug report’s new state, with a note when one was added', () => {
    const bug = row('bug.status', { target_title: 'Bell rings', details: { from: 'new', to: 'fixed' } })
    expect(describeAction(bug)).toEqual({ id: 'bugStatus.fixed', values: { title: 'Bell rings' } })
    expect(describeAction({ ...bug, details: { from: 'new', to: 'wont_fix', note_added: true } })).toEqual({
      id: 'bugStatus.wont_fix',
      values: { title: 'Bell rings' },
      withNote: true
    })
    expect(describeAction({ ...bug, details: { from: 'new', to: 'new', note_added: true } })).toEqual({
      id: 'bugNote',
      values: { title: 'Bell rings' }
    })
    expect(describeAction({ ...bug, details: { to: 'bogus' } }).id).toBe('bugNote')
  })

  it('names an action it does not know rather than hiding it', () => {
    expect(describeAction(row('something.new', { target_title: 'X' }))).toEqual({
      id: 'other',
      values: { action: 'something.new', title: 'X' }
    })
    expect(describeAction(row('something.new', { target_title: null, target_id: 'id9' })).values.title).toBe('id9')
  })
})

describe('reasonOf', () => {
  it('is a moderation reason by its code, any other text as written, or nothing', () => {
    expect(reasonOf(row('content.remove', { reason: 'copyright' }))).toEqual({ code: 'copyright' })
    expect(reasonOf(row('admin.grant', { reason: 'set_admin.py' }))).toEqual({ text: 'set_admin.py' })
    expect(reasonOf(row('admin.grant', { reason: '  ' }))).toBeNull()
    expect(reasonOf(row('admin.grant'))).toBeNull()
  })
})

describe('groupRecent', () => {
  const send = (id, at, extra = {}) =>
    row('invite.send', { id, at, details: { cohort: 'c1-waitlist' }, target_title: `${id}@x.org`, ...extra })

  it('joins consecutive sends by one admin to one cohort within one minute', () => {
    const rows = [
      send('a', '2026-11-13T18:15:40'),
      send('b', '2026-11-13T18:15:10'),
      send('c', '2026-11-13T18:15:01'),
      row('invite.revoke', { id: 'r', at: '2026-11-13T18:00:00' })
    ]
    const entries = groupRecent(rows)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ id: 'a', at: '2026-11-13T18:15:40', actor: ME })
    expect(entries[0].rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(describeEntry(entries[0])).toEqual({ id: 'inviteGroup', values: { count: 3, cohort: 'c1-waitlist' } })
    expect(describeEntry(entries[1]).id).toBe('inviteRevoke')
  })

  it('keeps sends apart across minutes, cohorts, admins, or another action between', () => {
    expect(groupRecent([send('a', '2026-11-13T18:16:00'), send('b', '2026-11-13T18:15:59')])).toHaveLength(2)
    expect(
      groupRecent([send('a', '2026-11-13T18:15:30'), send('b', '2026-11-13T18:15:20', { details: { cohort: 'friends' } })])
    ).toHaveLength(2)
    expect(groupRecent([send('a', '2026-11-13T18:15:30'), send('b', '2026-11-13T18:15:20', { actor: ANA })])).toHaveLength(2)
    expect(
      groupRecent([send('a', '2026-11-13T18:15:30'), row('invite.revoke', { at: '2026-11-13T18:15:25' }), send('b', '2026-11-13T18:15:20')])
    ).toHaveLength(3)
  })

  it('says a single send as itself', () => {
    const [entry] = groupRecent([send('a', '2026-11-13T18:15:30')])
    expect(describeEntry(entry).id).toBe('inviteSend')
  })

  it('reads nothing as no entries', () => {
    expect(groupRecent(undefined)).toEqual([])
  })
})

describe('when', () => {
  const now = new Date(2026, 10, 14, 16, 0) // Saturday 14 Nov, 16:00 local

  it('counts calendar days in local time', () => {
    expect(dayGap(new Date(2026, 10, 14, 0, 5), now)).toBe(0)
    expect(dayGap(new Date(2026, 10, 13, 23, 59), now)).toBe(1)
    expect(dayGap(new Date(2026, 10, 10, 9, 30), now)).toBe(4)
    expect(dayGap('not a date', now)).toBeNull()
  })

  it('is minutes, then hours today, yesterday, the weekday this week, then the date', () => {
    expect(shortWhen(new Date(2026, 10, 14, 15, 59, 40), now)).toEqual({ unit: 'now' })
    expect(shortWhen(new Date(2026, 10, 14, 15, 35), now)).toEqual({ unit: 'minute', amount: 25 })
    expect(shortWhen(new Date(2026, 10, 14, 14, 0), now)).toEqual({ unit: 'hour', amount: 2 })
    expect(shortWhen(new Date(2026, 10, 13, 18, 15), now)).toEqual({ unit: 'yesterday' })
    expect(shortWhen(new Date(2026, 10, 10, 9, 30), now)).toEqual({ unit: 'weekday' })
    expect(shortWhen(new Date(2026, 10, 1, 9, 30), now)).toEqual({ unit: 'date' })
    expect(shortWhen(null, now)).toBeNull()
  })
})

describe('needsRows', () => {
  const OVERVIEW = {
    needs: {
      reports_to_review: { count: 2, oldest_at: '2026-11-14T13:00:00', reasons: ['copyright', 'spam', 'bogus'] },
      new_bugs: { count: 3, critical: 1 },
      invitations_ending: { count: 4, cohorts: ['c1-waitlist'] },
      waiting: { count: 37, since_last_batch: 12 }
    }
  }

  it('answers the four rows in the board’s order, whatever the counts', () => {
    expect(needsRows(OVERVIEW)).toEqual([
      { kind: 'reports', count: 2, oldestAt: '2026-11-14T13:00:00', reasons: ['copyright', 'spam'] },
      { kind: 'bugs', count: 3, critical: 1 },
      { kind: 'invitations', count: 4, cohorts: ['c1-waitlist'] },
      { kind: 'waiting', count: 37, sinceLastBatch: 12 }
    ])
    expect(needsRows({}).map((r) => [r.kind, r.count])).toEqual([
      ['reports', 0],
      ['bugs', 0],
      ['invitations', 0],
      ['waiting', 0]
    ])
  })

  it('counts the rows that need something', () => {
    expect(needsCount(needsRows(OVERVIEW))).toBe(4)
    expect(needsCount(needsRows({ needs: { waiting: { count: 1 }, new_bugs: { count: -2 } } }))).toBe(1)
  })
})

describe('emailMeters', () => {
  it('answers each meter’s count, share and how full it is', () => {
    const meters = emailMeters({
      emails_today: { invitations: { sent: 8, share: 72 }, confirmations: { sent: 5, share: 54 }, resets_at: '2026-11-15T00:00:00' }
    })
    expect(meters).toEqual({
      invitations: { sent: 8, share: 72, percent: 11 },
      confirmations: { sent: 5, share: 54, percent: 9 },
      resetsAt: '2026-11-15T00:00:00'
    })
  })

  it('never runs past full, and reads a missing share as empty', () => {
    const meters = emailMeters({ emails_today: { invitations: { sent: 90, share: 72 }, confirmations: { sent: 2, share: 0 } } })
    expect(meters.invitations.percent).toBe(100)
    expect(meters.confirmations.percent).toBe(100)
    expect(emailMeters(undefined)).toEqual({
      invitations: { sent: 0, share: 0, percent: 0 },
      confirmations: { sent: 0, share: 0, percent: 0 },
      resetsAt: null
    })
  })
})
