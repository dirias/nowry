/**
 * ADMIN-003 (FR-005, board M): a deck an admin removed from Browse cannot be
 * published again. The publish sheet and the deck settings section say so with
 * the danger alert and its caption, before asking when the deck carries the
 * removal marker, and after the server's refusal when it does not.
 */
import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }) }))

const mockPublish = jest.fn()
jest.mock('@nowry/core/api/services', () => ({
  decksService: { publish: (...args) => mockPublish(...args), unpublish: jest.fn() }
}))

const DeckPublishSheet = require('../DeckPublishSheet').default
const DeckPublishingSection = require('../deck/DeckPublishingSection').default

const DECK = { _id: 'd1', name: 'JLPT N5 kanji (copy)', is_public: false }
const REMOVED = 'public.publishBlocked.removed_by_moderation'
const refusal = () => ({
  response: { status: 409, data: { detail: { code: 'source_not_publishable', reason: 'removed_by_moderation' } } }
})

const renderSheet = (deck = DECK) => {
  const onClose = jest.fn()
  render(<DeckPublishSheet open onClose={onClose} deckId='d1' deck={deck} onPublished={jest.fn()} />)
  return { onClose }
}

beforeEach(() => {
  mockPublish.mockReset().mockResolvedValue({})
})

describe('the publish sheet', () => {
  it('says the deck was removed, instead of the form, when it carries the marker', () => {
    const { onClose } = renderSheet({ ...DECK, removal: { removed_at: '2026-11-14T10:00:00Z', reason: 'copyright' } })
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(REMOVED)).toBeInTheDocument()
    expect(screen.getByText('public.publishRemovedNote')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'publish.confirm' })).not.toBeInTheDocument()
    expect(screen.queryByText('publish.form.tags')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('turns into the same refusal when the server refuses the publish', async () => {
    mockPublish.mockRejectedValue(refusal())
    renderSheet()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'publish.confirm' }))
    })
    expect(within(screen.getByRole('alert')).getByText(REMOVED)).toBeInTheDocument()
    expect(screen.getByText('public.publishRemovedNote')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'publish.confirm' })).not.toBeInTheDocument()
  })

  it('still says the file-origin refusal as before', async () => {
    mockPublish.mockRejectedValue({
      response: { status: 409, data: { detail: { code: 'source_not_publishable', reason: 'imported_deck' } } }
    })
    renderSheet()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'publish.confirm' }))
    })
    expect(screen.getByText('public.publishBlocked.imported_deck')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'publish.confirm' })).toBeInTheDocument()
    expect(screen.queryByText('public.publishRemovedNote')).not.toBeInTheDocument()
  })
})

describe('the deck settings section', () => {
  it('shows the danger alert in place of the publish control', () => {
    render(<DeckPublishingSection loading={false} deck={{ ...DECK, removal: { reason: 'spam' } }} onManage={jest.fn()} />)
    expect(within(screen.getByRole('alert')).getByText(REMOVED)).toBeInTheDocument()
    expect(screen.getByText('public.publishRemovedNote')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'publish.publishButton' })).not.toBeInTheDocument()
  })

  it('keeps the quiet sentence for an imported deck', () => {
    render(<DeckPublishingSection loading={false} deck={{ ...DECK, source: 'imported' }} onManage={jest.fn()} />)
    expect(screen.getByText('public.publishBlocked.imported_deck')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
