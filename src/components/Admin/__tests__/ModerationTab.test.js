/**
 * ADMIN-003 — the Moderation tab (FR-004, FR-011 Moderation, boards B, J, L):
 * the three state filters with their counts, the queue and the selected
 * item's card, Keep public, Unpublish with the confirmation in place (reason
 * prefilled from the newest report, optional note, the public copies that go
 * too), the re-sign-in and its retry, the answer said in a live region with the
 * next item selected, the Removed view without actions, and the list's states.
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ModerationTab from '../moderation/ModerationTab'

/* The key, then its interpolation values: 'admin.mod.confirm.confirm|count=2'. */
const mockT = (key, options) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key}|${values.map(([name, value]) => `${name}=${value}`).join(',')}` : key
}
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en', getFixedT: () => mockT } }) }))

jest.mock('@nowry/core/api/services/adminModeration.service', () => ({
  MODERATION_QUEUE_LIMIT: 100,
  adminModerationService: { listQueue: jest.fn(), keep: jest.fn(), remove: jest.fn() }
}))
jest.mock('@nowry/core/api/services/auth.service', () => ({
  authService: { signInProviders: jest.fn(), signInTime: jest.fn(), reauthenticate: jest.fn() }
}))
const { adminModerationService: moderation } = require('@nowry/core/api/services/adminModeration.service')
const { authService } = require('@nowry/core/api/services/auth.service')

const HOUR = 3600 * 1000
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const KANJI = {
  content_type: 'deck',
  content_id: 'd1',
  title: 'JLPT N5 kanji (copy)',
  owner_username: 'rin_study',
  is_public: true,
  public_since: '2026-11-02T10:00:00Z',
  size: 214,
  learners: 3,
  public_copies: 1,
  reports: [
    {
      id: 'r1',
      reason: 'copyright',
      note: 'These cards are copied word for word from my paid deck on another site.',
      created_at: ago(3 * HOUR)
    }
  ],
  report_count: 1,
  oldest_report_at: ago(3 * HOUR),
  removal: null
}
const CRYPTO = {
  content_type: 'book',
  content_id: 'b1',
  title: 'Free crypto signals',
  owner_username: 'tradehub22',
  is_public: true,
  public_since: '2026-11-01T10:00:00Z',
  size: 12,
  learners: 0,
  public_copies: 0,
  reports: [
    { id: 'r2', reason: 'spam', note: '', created_at: ago(30 * HOUR) },
    { id: 'r3', reason: 'spam', note: 'Selling signals', created_at: ago(26 * HOUR) }
  ],
  report_count: 2,
  oldest_report_at: ago(30 * HOUR),
  removal: null
}
const TOTALS = { to_review: 2, kept: 5, removed: 1 }
const QUEUE = { items: [KANJI, CRYPTO], totals: TOTALS }
const REAUTH = { response: { status: 401, data: { detail: { code: 'reauth_required' } } } }

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ModerationTab />
    </QueryClientProvider>
  )
}

const listed = () => screen.findByRole('button', { name: /JLPT N5 kanji \(copy\)/ })
const card = () => screen.getByRole('region', { name: 'admin.mod.item.label' })
const unpublishKey = () => within(card()).getByRole('button', { name: 'admin.mod.actions.unpublish' })
const confirmGroup = () => screen.getByRole('group', { name: /admin\.mod\.confirm\.title/ })

beforeEach(() => {
  moderation.listQueue.mockResolvedValue(QUEUE)
  moderation.keep.mockResolvedValue({ dismissed: 2 })
  moderation.remove.mockResolvedValue({
    removed: [
      { content_type: 'deck', content_id: 'd1', title: KANJI.title },
      { content_type: 'deck', content_id: 'd9', title: 'Copy' }
    ],
    copies_removed: 1,
    owners_told: 2,
    owners_not_told: 0
  })
  authService.signInProviders.mockReturnValue(['password'])
  authService.signInTime.mockResolvedValue(null)
  authService.reauthenticate.mockResolvedValue(undefined)
})

describe('filters', () => {
  it('opens on To review, with each state’s count, and asks the API for the state chosen', async () => {
    renderTab()
    await listed()
    expect(moderation.listQueue).toHaveBeenCalledWith({ state: 'to_review', limit: 100 })
    const states = screen.getByRole('group', { name: 'admin.mod.filters' })
    expect(within(states).getByRole('button', { name: 'admin.mod.states.to_review · 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(states).getByRole('button', { name: 'admin.mod.states.kept · 5' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(within(states).getByRole('button', { name: 'admin.mod.states.removed · 1' }))
    await waitFor(() => expect(moderation.listQueue).toHaveBeenLastCalledWith({ state: 'removed', limit: 100 }))
  })
})

describe('the queue and the selected item', () => {
  it('draws each row as the board does, and selects the first', async () => {
    renderTab()
    const kanji = await listed()
    expect(kanji).toHaveAttribute('aria-current', 'true')
    expect(
      within(kanji).getByText(/admin\.mod\.types\.deck · admin\.mod\.list\.by\|owner=rin_study · admin\.mod\.list\.reports\|count=1 · /)
    ).toBeInTheDocument()
    expect(within(kanji).getByText('admin.mod.reasons.copyright')).toBeInTheDocument()
    const crypto = screen.getByRole('button', { name: /Free crypto signals/ })
    expect(crypto).not.toHaveAttribute('aria-current')
    expect(within(crypto).getByText('admin.mod.reasons.spam')).toBeInTheDocument()
  })

  it('shows the item’s card: caption, title, each report quoted with its reason and count, and the actions', async () => {
    renderTab()
    await listed()
    const item = card()
    expect(within(item).getByRole('heading', { name: KANJI.title })).toBeInTheDocument()
    expect(
      within(item).getByText(
        /^admin\.mod\.types\.deck · admin\.mod\.item\.publicSince\|date=.+ · admin\.mod\.item\.cards\|count=214 · admin\.mod\.item\.learners\|count=3$/
      )
    ).toBeInTheDocument()
    expect(within(item).getByText(KANJI.reports[0].note)).toBeInTheDocument()
    expect(within(item).getByText('admin.mod.reasons.copyright · admin.mod.item.reporters|count=1')).toBeInTheDocument()
    const open = within(item).getByRole('link', { name: `admin.mod.actions.openAria|title=${KANJI.title}` })
    expect(open).toHaveAttribute('href', '/public/decks/d1')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveTextContent('admin.mod.actions.openDeck')
    expect(within(item).getByRole('button', { name: 'admin.mod.actions.keep' })).toBeInTheDocument()
    expect(unpublishKey()).toBeInTheDocument()
  })

  it('selects another row, and groups a book’s reports by reason', async () => {
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: /Free crypto signals/ }))
    const item = card()
    expect(within(item).getByRole('heading', { name: CRYPTO.title })).toBeInTheDocument()
    expect(within(item).getByText(/admin\.mod\.item\.pages\|count=12 · admin\.mod\.item\.learners\|count=0$/)).toBeInTheDocument()
    expect(within(item).getByText('admin.mod.reasons.spam · admin.mod.item.reporters|count=2')).toBeInTheDocument()
    expect(within(item).getByText('Selling signals')).toBeInTheDocument()
    expect(within(item).getByRole('link', { name: /openAria/ })).toHaveAttribute('href', '/public/books/b1')
  })
})

describe('Keep public', () => {
  it('keeps the item, says how many reports closed in the live region, reads again and selects the next', async () => {
    renderTab()
    await listed()
    moderation.listQueue.mockResolvedValue({ items: [CRYPTO], totals: { to_review: 1, kept: 6, removed: 1 } })
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'admin.mod.actions.keep' }))
    })
    expect(moderation.keep).toHaveBeenCalledWith('deck', 'd1')
    const status = screen.getByRole('status')
    expect(await within(status).findByText('admin.mod.result.kept|count=2')).toBeInTheDocument()
    await waitFor(() => expect(within(card()).getByRole('heading', { name: CRYPTO.title })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'admin.mod.states.to_review · 1' })).toBeInTheDocument()
  })

  it('asks for the sign-in again, then keeps it', async () => {
    moderation.keep.mockRejectedValueOnce(REAUTH).mockResolvedValueOnce({ dismissed: 1 })
    renderTab()
    await listed()
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'admin.mod.actions.keep' }))
    })
    const dialog = await screen.findByRole('dialog', { name: 'admin.reauth.keep.title' })
    fireEvent.change(within(dialog).getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.reauth.keep.confirm' }))
    })
    expect(moderation.keep).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('admin.mod.result.kept|count=1')).toBeInTheDocument()
  })

  it('says a failure, and nothing changed', async () => {
    moderation.keep.mockRejectedValue(new Error('down'))
    renderTab()
    await listed()
    await act(async () => {
      fireEvent.click(within(card()).getByRole('button', { name: 'admin.mod.actions.keep' }))
    })
    expect(await screen.findByText('admin.mod.result.failed')).toBeInTheDocument()
  })
})

describe('Unpublish', () => {
  it('opens the confirmation in place, with the copies, the reason from the report, and the count on the key', async () => {
    renderTab()
    await listed()
    fireEvent.click(unpublishKey())
    const confirm = confirmGroup()
    expect(within(confirm).getByText(`admin.mod.confirm.title|title=${KANJI.title}`)).toBeInTheDocument()
    expect(
      within(confirm).getByText('admin.mod.confirm.body admin.mod.confirm.copies|count=1 admin.mod.confirm.log|count=2')
    ).toBeInTheDocument()
    expect(within(confirm).getByRole('combobox', { name: 'admin.mod.confirm.reason' })).toHaveTextContent(
      'admin.mod.confirm.fromReport|reason=admin.mod.reasons.copyright'
    )
    expect(within(confirm).getByText('admin.mod.confirm.emailCopies|count=1')).toBeInTheDocument()
    expect(within(confirm).getByRole('button', { name: 'common.cancel' })).toBeInTheDocument()
    expect(within(confirm).getByRole('button', { name: 'admin.mod.confirm.confirm|count=2' })).toBeInTheDocument()
  })

  it('says one item and only the owner when there is no public copy', async () => {
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: /Free crypto signals/ }))
    fireEvent.click(unpublishKey())
    const confirm = confirmGroup()
    expect(within(confirm).getByText('admin.mod.confirm.body admin.mod.confirm.log|count=1')).toBeInTheDocument()
    expect(within(confirm).getByText('admin.mod.confirm.email')).toBeInTheDocument()
    expect(within(confirm).getByRole('button', { name: 'admin.mod.confirm.confirm|count=1' })).toBeInTheDocument()
  })

  it('cancels without a call', async () => {
    renderTab()
    await listed()
    fireEvent.click(unpublishKey())
    fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'common.cancel' }))
    expect(screen.queryByRole('group', { name: /admin\.mod\.confirm\.title/ })).not.toBeInTheDocument()
    expect(moderation.remove).not.toHaveBeenCalled()
  })

  it('unpublishes with the reason chosen and the note, says the answer, and selects the next', async () => {
    renderTab()
    await listed()
    fireEvent.click(unpublishKey())
    const confirm = confirmGroup()
    fireEvent.click(within(confirm).getByRole('combobox', { name: 'admin.mod.confirm.reason' }))
    fireEvent.click(await screen.findByRole('option', { name: 'admin.mod.reasons.inappropriate' }))
    const note = within(confirm).getByRole('textbox', { name: 'admin.mod.confirm.note' })
    fireEvent.change(note, { target: { value: 'Copied from a paid deck' } })
    expect(note).toHaveAttribute('maxlength', '500')
    expect(within(confirm).getByText('23/500')).toBeInTheDocument()
    moderation.listQueue.mockResolvedValue({ items: [CRYPTO], totals: { to_review: 1, kept: 5, removed: 3 } })
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'admin.mod.confirm.confirm|count=2' }))
    })
    expect(moderation.remove).toHaveBeenCalledWith('deck', 'd1', { reason: 'inappropriate', note: 'Copied from a paid deck' })
    const status = screen.getByRole('status')
    expect(
      await within(status).findByText('admin.mod.result.removed|count=2 admin.mod.result.emailed|count=2,notTold=0')
    ).toBeInTheDocument()
    await waitFor(() => expect(within(card()).getByRole('heading', { name: CRYPTO.title })).toBeInTheDocument())
    expect(screen.queryByRole('group', { name: /admin\.mod\.confirm\.title/ })).not.toBeInTheDocument()
  })

  it('says when someone had already removed it, and reads the queue again', async () => {
    moderation.remove.mockRejectedValue({ response: { status: 409, data: { detail: { code: 'already_removed' } } } })
    renderTab()
    await listed()
    fireEvent.click(unpublishKey())
    moderation.listQueue.mockResolvedValue({ items: [CRYPTO], totals: { to_review: 1, kept: 5, removed: 2 } })
    await act(async () => {
      fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'admin.mod.confirm.confirm|count=2' }))
    })
    expect(await within(screen.getByRole('status')).findByText('admin.mod.result.alreadyRemoved')).toBeInTheDocument()
    await waitFor(() => expect(within(card()).getByRole('heading', { name: CRYPTO.title })).toBeInTheDocument())
  })

  it('asks for the sign-in again, then unpublishes', async () => {
    moderation.remove.mockRejectedValueOnce(REAUTH)
    renderTab()
    await listed()
    fireEvent.click(unpublishKey())
    await act(async () => {
      fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'admin.mod.confirm.confirm|count=2' }))
    })
    const dialog = await screen.findByRole('dialog', { name: 'admin.reauth.unpublish.title' })
    fireEvent.change(within(dialog).getByLabelText('reauth.passwordLabel', { exact: false }), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.reauth.unpublish.confirm' }))
    })
    expect(moderation.remove).toHaveBeenCalledTimes(2)
    expect(moderation.remove).toHaveBeenLastCalledWith('deck', 'd1', { reason: 'copyright', note: '' })
  })
})

describe('Kept and Removed', () => {
  it('shows a removed item’s removal and no actions', async () => {
    const removed = {
      ...KANJI,
      is_public: false,
      removal: { removed_at: '2026-11-14T10:00:00Z', reason: 'copyright', note: 'The reporter holds the rights' }
    }
    moderation.listQueue.mockImplementation(({ state }) =>
      Promise.resolve(state === 'removed' ? { items: [removed], totals: TOTALS } : QUEUE)
    )
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: 'admin.mod.states.removed · 1' }))
    const item = await screen.findByRole('region', { name: 'admin.mod.item.label' })
    expect(await within(item).findByText(/^admin\.mod\.item\.removed\|date=.+,reason=admin\.mod\.reasons\.copyright$/)).toBeInTheDocument()
    expect(within(item).getByText('admin.mod.item.removedNote|note=The reporter holds the rights')).toBeInTheDocument()
    expect(within(item).queryByRole('button')).not.toBeInTheDocument()
    expect(within(item).queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers no Keep public on a kept item, which is public already', async () => {
    moderation.listQueue.mockImplementation(({ state }) => Promise.resolve(state === 'kept' ? { items: [KANJI], totals: TOTALS } : QUEUE))
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: 'admin.mod.states.kept · 5' }))
    await waitFor(() => expect(moderation.listQueue).toHaveBeenLastCalledWith({ state: 'kept', limit: 100 }))
    await waitFor(() => expect(within(card()).queryByRole('button', { name: 'admin.mod.actions.keep' })).not.toBeInTheDocument())
    expect(unpublishKey()).toBeInTheDocument()
  })
})

describe('states', () => {
  it('draws skeleton rows while loading', () => {
    moderation.listQueue.mockReturnValue(new Promise(() => {}))
    renderTab()
    expect(screen.getByTestId('moderation-loading')).toHaveAttribute('aria-busy', 'true')
  })

  it('says there is nothing to review, with the hint', async () => {
    moderation.listQueue.mockResolvedValue({ items: [], totals: { to_review: 0, kept: 5, removed: 1 } })
    renderTab()
    expect(await screen.findByText('admin.mod.list.empty.title')).toBeInTheDocument()
    expect(screen.getByText('admin.mod.list.empty.body')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'admin.mod.item.label' })).not.toBeInTheDocument()
  })

  it('says an empty filter plainly', async () => {
    moderation.listQueue.mockImplementation(({ state }) => Promise.resolve(state === 'kept' ? { items: [], totals: TOTALS } : QUEUE))
    renderTab()
    await listed()
    fireEvent.click(screen.getByRole('button', { name: 'admin.mod.states.kept · 5' }))
    expect(await screen.findByText('admin.mod.list.filterEmpty')).toBeInTheDocument()
  })

  it('says it could not load, and tries again', async () => {
    moderation.listQueue.mockRejectedValueOnce(new Error('down')).mockResolvedValue(QUEUE)
    renderTab()
    expect(await screen.findByText('admin.mod.list.error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.tryAgain' }))
    expect(await listed()).toBeInTheDocument()
  })
})
