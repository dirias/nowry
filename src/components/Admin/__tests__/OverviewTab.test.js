/**
 * ADMIN-007c — the Overview tab (FR-011, boards A and L): the four "Needs you"
 * rows with their counts, meta lines and doors; today's email meters; what
 * admins did as sentences, one batch of invitations read as one line; Full
 * log; loading, empty and error with Try again.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import OverviewTab from '../overview/OverviewTab'

/* The key, then its interpolation values: 'admin.overview.needs.things|count=4'. */
const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }) }))

jest.mock('@nowry/core/api/services/adminOverview.service', () => ({
  ADMIN_LOG_PAGE: 50,
  adminOverviewService: { getOverview: jest.fn(), listActions: jest.fn() }
}))
const { adminOverviewService: service } = require('@nowry/core/api/services/adminOverview.service')

// "2 h ago" and "yesterday" depend on the local day: pin the clock to 14:00 local time, so the
// fixtures never cross midnight whenever the suite runs. Only Date is faked; timers stay real.
const RealDate = Date
const PINNED = new RealDate(2026, 10, 14, 14, 0, 0).getTime()
class PinnedDate extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [PINNED]))
  }
  static now() {
    return PINNED
  }
}
// Set at load: the fixtures below are built when this file is read.
global.Date = PinnedDate
afterAll(() => {
  global.Date = RealDate
})

const MARK = '⁣'
const ME = { kind: 'admin', username: 'didier', is_you: true }
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString()
const send = (id, at, email) => ({
  id,
  at,
  actor: ME,
  action: 'invite.send',
  target_type: 'invite',
  target_id: id,
  target_title: email,
  reason: null,
  details: { cohort: 'c1-waitlist', outcome: 'sent' }
})
const batchMinute = new Date(Date.now() - 3 * 3600000)
batchMinute.setSeconds(30, 0)
const OVERVIEW = {
  needs: {
    reports_to_review: { count: 2, oldest_at: ago(180), reasons: ['copyright', 'spam'] },
    new_bugs: { count: 3, critical: 1 },
    invitations_ending: { count: 4, cohorts: ['c1-waitlist'] },
    waiting: { count: 37, since_last_batch: 12 }
  },
  emails_today: { invitations: { sent: 8, share: 72 }, confirmations: { sent: 5, share: 54 }, resets_at: '2026-11-15T00:00:00Z' },
  recent_actions: [
    {
      id: 'r1',
      at: ago(120),
      actor: ME,
      action: 'content.remove',
      target_type: 'deck',
      target_id: 'd1',
      target_title: 'JLPT N5 kanji (copy)',
      reason: 'copyright',
      details: { copies: 1 }
    },
    send('s1', new Date(batchMinute.getTime() + 20000).toISOString(), 'a@x.org'),
    send('s2', new Date(batchMinute.getTime() + 10000).toISOString(), 'b@x.org'),
    send('s3', batchMinute.toISOString(), 'c@x.org'),
    {
      id: 'g1',
      at: ago(200),
      actor: { kind: 'script', username: null, is_you: false },
      action: 'admin.grant',
      target_type: 'account',
      target_id: 'u1',
      target_title: 'didier@example.com',
      reason: 'set_admin.py',
      details: {}
    },
    {
      id: 'b1',
      at: ago(210),
      actor: { kind: 'admin', username: null, is_you: false },
      action: 'bug.status',
      target_type: 'bug',
      target_id: 'b1',
      target_title: 'Pomodoro bell keeps ringing',
      reason: null,
      details: { from: 'new', to: 'fixed', note_added: true }
    }
  ]
}

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/overview']}>
        <OverviewTab />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** The tab once the Overview has been read. */
const openTab = async () => {
  renderTab()
  await waitFor(() => expect(screen.queryByTestId('overview-needs-loading')).not.toBeInTheDocument())
}

beforeEach(() => {
  service.getOverview.mockResolvedValue(OVERVIEW)
})

describe('Needs you', () => {
  it('draws the four rows with their counts, in the board’s order, each a door to its tab', async () => {
    await openTab()
    const card = await screen.findByRole('region', { name: 'admin.overview.needs.title' })
    expect(within(card).getByText('admin.overview.needs.things|count=4')).toBeInTheDocument()
    const links = within(card).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/moderation',
      '/admin/bugs',
      '/admin/invitations?state=open',
      '/admin/waitlist'
    ])
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'admin.overview.needs.rowLabel|title=admin.overview.needs.reports.title,number=2',
      'admin.overview.needs.rowLabel|title=admin.overview.needs.bugs.title,number=3',
      'admin.overview.needs.rowLabel|title=admin.overview.needs.invitations.title,number=4',
      'admin.overview.needs.rowLabel|title=admin.overview.needs.waiting.title,number=37'
    ])
    expect(within(links[0]).getByText('2')).toBeInTheDocument()
    expect(within(links[0]).getByText('admin.overview.needs.reports.go')).toBeInTheDocument()
    expect(within(links[3]).getByText('37')).toBeInTheDocument()
  })

  it('says what each row is about', async () => {
    await openTab()
    const card = await screen.findByRole('region', { name: 'admin.overview.needs.title' })
    const [reports, bugs, invitations, waiting] = within(card).getAllByRole('link')
    expect(reports).toHaveTextContent(
      /admin\.overview\.needs\.reports\.oldest\|when=.+ · admin\.mod\.reasons\.copyright, admin\.mod\.reasons\.spam/
    )
    expect(bugs).toHaveTextContent('admin.overview.needs.bugs.critical|count=1')
    expect(invitations).toHaveTextContent('admin.overview.needs.invitations.unused · c1-waitlist')
    expect(waiting).toHaveTextContent('admin.overview.needs.waiting.since|count=12')
  })

  it('keeps a row whose count is zero and says nothing waits there', async () => {
    service.getOverview.mockResolvedValue({
      ...OVERVIEW,
      needs: { new_bugs: { count: 2, critical: 0 }, waiting: { count: 5, since_last_batch: 0 } }
    })
    await openTab()
    const card = await screen.findByRole('region', { name: 'admin.overview.needs.title' })
    const [reports, bugs, invitations, waiting] = within(card).getAllByRole('link')
    expect(within(card).getByText('admin.overview.needs.things|count=2')).toBeInTheDocument()
    expect(within(reports).getByText('0')).toBeInTheDocument()
    expect(reports).toHaveTextContent('admin.overview.needs.none')
    expect(invitations).toHaveTextContent('admin.overview.needs.none')
    expect(bugs).toHaveTextContent('admin.overview.needs.bugs.noCritical')
    expect(waiting).toHaveTextContent('admin.overview.needs.waiting.sinceNone')
  })
})

describe('Emails today', () => {
  it('draws the two meters against the day’s shares, and when they reset', async () => {
    await openTab()
    const card = await screen.findByRole('region', { name: 'admin.overview.emails.title' })
    expect(within(card).getByText('admin.overview.emails.resets|time=00:00')).toBeInTheDocument()
    const [invitations, confirmations] = within(card).getAllByRole('meter')
    expect(invitations).toHaveAttribute('aria-label', 'admin.overview.emails.invitations')
    expect(invitations).toHaveAttribute('aria-valuenow', '8')
    expect(invitations).toHaveAttribute('aria-valuemax', '72')
    expect(invitations).toHaveAttribute('aria-valuetext', 'admin.overview.emails.of|sent=8,share=72')
    expect(confirmations).toHaveAttribute('aria-label', 'admin.overview.emails.confirmations')
    expect(confirmations).toHaveAttribute('aria-valuenow', '5')
    expect(within(card).getByText('admin.overview.emails.of|sent=5,share=54')).toBeInTheDocument()
  })
})

describe('What admins did', () => {
  it('says each action as a sentence with when, one batch of invitations as one line', async () => {
    await openTab()
    const card = await screen.findByRole('region', { name: 'admin.overview.recent.title' })
    const items = within(card).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent(
      `admin.log.you.removeDeckCopies|title=JLPT N5 kanji (copy),count=1 · admin.overview.recent.reason.copyright`
    )
    expect(within(items[0]).getByText('JLPT N5 kanji (copy)').tagName).toBe('B')
    expect(items[0].querySelector('time')).toHaveTextContent('2h')
    expect(items[1]).toHaveTextContent('admin.log.you.inviteGroup|count=3,cohort=c1-waitlist')
    expect(items[2]).toHaveTextContent('admin.overview.recent.byScript|what=admin.log.what.adminGrant|email=didier@example.com')
    expect(items[3]).toHaveTextContent(
      'admin.overview.recent.bySomeone|what=admin.log.withNote|what=admin.log.what.bugStatus.fixed|title=Pomodoro bell keeps ringing'
    )
    expect(card.textContent).not.toContain(MARK)
  })

  it('opens the full log', async () => {
    await openTab()
    const card = await screen.findByRole('region', { name: 'admin.overview.recent.title' })
    expect(within(card).getByRole('link', { name: 'admin.overview.recent.fullLog' })).toHaveAttribute('href', '/admin/log')
  })

  it('says when nothing has happened yet', async () => {
    service.getOverview.mockResolvedValue({ ...OVERVIEW, recent_actions: [] })
    await openTab()
    expect(await screen.findByText('admin.overview.recent.empty')).toBeInTheDocument()
  })
})

describe('states', () => {
  it('draws skeleton rows while it loads', () => {
    service.getOverview.mockReturnValue(new Promise(() => {}))
    renderTab()
    expect(screen.getByTestId('overview-needs-loading')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('overview-emails-loading')).toBeInTheDocument()
    expect(screen.getByTestId('overview-recent-loading')).toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  it('says it could not load, and Try again reads once more', async () => {
    service.getOverview.mockRejectedValueOnce({ response: { status: 500 } })
    renderTab()
    expect(await screen.findByText('admin.overview.error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.tryAgain' }))
    await waitFor(() => expect(service.getOverview).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('region', { name: 'admin.overview.needs.title' })).toBeInTheDocument()
  })
})
