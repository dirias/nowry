/**
 * `GeneratedCards` makes no upgrade offer while the beta has upgrades closed (QA-015).
 *
 * A free account in the beta saw "upgrade to Pro for smarter AI" with "View
 * Plans & Upgrade" under its generated cards, though nothing could be bought.
 * PlansPage and UpgradePrompt already read `upgrades_open`; this surface did not.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    i18n: { language: 'en' }
  })
}))

jest.mock('@nowry/core/api/services', () => ({
  cardsService: { create: () => Promise.resolve({ _id: 'card-1' }), getTags: () => Promise.resolve([]) },
  decksService: { create: () => Promise.resolve({ _id: 'deck-2' }) }
}))

jest.mock('@nowry/core/hooks/useDeckData', () => ({
  useDeckData: () => ({
    decks: [{ _id: 'deck-1', name: 'Biology', deck_type: 'flashcard' }],
    loading: false,
    error: null,
    reload: () => {}
  })
}))

jest.mock('@nowry/core/hooks/useSubscription', () => ({
  useSubscription: () => ({ tier: 'free', flashcardLimit: 100, flashcardCount: 0 })
}))

jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({
    upgradeDismissed: false,
    dismissUpgrade: () => {},
    isUpgradeModalOpen: false,
    openUpgradeModal: () => {},
    closeUpgradeModal: () => {}
  })
}))

let mockBeta = { active: true, invite_required: false, upgrades_open: false }
jest.mock('@nowry/core/context/BetaContext', () => ({ useBeta: () => ({ config: mockBeta, loading: false }) }))

import GeneratedCards from '../GeneratedCards'

const CARDS = [{ title: 'Mitosis', content: 'Cell division producing two identical nuclei.' }]

const renderModal = async () => {
  await act(async () => {
    render(<GeneratedCards cards={CARDS} onCancel={() => {}} />)
  })
}

it('shows no upgrade offer while upgrades are closed', async () => {
  mockBeta = { active: true, invite_required: false, upgrades_open: false }
  await renderModal()
  expect(screen.queryByText('upgrade.inlineCtaText')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'upgrade.modal.cta' })).not.toBeInTheDocument()
})

it('offers the upgrade to a free account while upgrades are open', async () => {
  mockBeta = { active: true, invite_required: false, upgrades_open: true }
  await renderModal()
  expect(screen.getByText('upgrade.inlineCtaText')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'upgrade.modal.cta' })).toBeInTheDocument()
})
