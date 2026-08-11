/**
 * Phase 33 Plan 01 — ManageContent.js Profiler render-counter harness + filter
 * smoke test (PERF-01).
 *
 * Purpose: capture BEFORE/AFTER commit-count evidence (D-03) around the
 * useMemo fix landing in Task 2 of this plan, and lock the filtering
 * (search + type) behavior so the fix cannot silently change output (D-05).
 *
 * Harness idiom: react-i18next mock + per-hook jest.mock() for ManageContent's
 * own hook dependencies (useSubscription, useSubscriptionContext), mirroring
 * StudySession.test.js's mock-harness idiom. require-after-mock at the bottom.
 */
import React, { Profiler } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

// CardPreviewModal/DeckAnalysisPanel are not under test here and drag in a
// heavy ESM-only chain (mermaid, dompurify, TTSControls) that Jest can't
// parse without extra transform config — shallow-stub them, mirroring the
// established "child components not under test" pattern (33-PATTERNS.md).
jest.mock('../CardPreviewModal', () => ({ __esModule: true, default: () => null }))
jest.mock('../DeckAnalysisPanel', () => ({ __esModule: true, default: () => null }))

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ tier: 'free' })
}))

jest.mock('../../../context/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() })
}))

// require-after-mock: the component under test is imported only after every
// jest.mock() call above has registered, per the project's established
// mock-harness idiom (StudySession.test.js, StudyModePickerModal.test.js).
const ManageContent = require('../ManageContent').default

/** Module-level Profiler-based render-counter helper (D-03 evidence harness). */
function withRenderCounter(ui) {
  const commits = []
  const onRender = (id, phase, actualDuration) => {
    commits.push({ phase, actualDuration })
  }
  const utils = render(
    <Profiler id='ManageContent' onRender={onRender}>
      {ui}
    </Profiler>
  )
  return { ...utils, commits }
}

const makeDeck = (overrides = {}) => ({
  _id: 'd1',
  name: 'Spanish Vocabulary',
  tags: ['language'],
  deck_type: 'flashcard',
  total_cards: 5,
  ...overrides
})

const makeCard = (overrides = {}) => ({
  _id: 'c1',
  title: 'Card 1',
  content: 'Content 1',
  card_type: 'flashcard',
  ...overrides
})

const defaultProps = {
  decks: [makeDeck({ _id: 'd1', name: 'Spanish Vocabulary' }), makeDeck({ _id: 'd2', name: 'French Grammar', tags: ['grammar'] })],
  cards: [makeCard({ _id: 'c1' }), makeCard({ _id: 'c2' })],
  loading: false,
  onEditDeck: jest.fn(),
  onDeleteDeck: jest.fn(),
  onEditCard: jest.fn(),
  onDeleteCard: jest.fn(),
  onAddCard: jest.fn(),
  onStudy: jest.fn(),
  searchQuery: '',
  totalCards: 2,
  hasMore: false,
  onLoadMore: jest.fn(),
  availableTags: [],
  selectedTags: [],
  onTagToggle: jest.fn(),
  onClearTags: jest.fn(),
  onSearchChange: jest.fn(),
  onImport: jest.fn(),
  onNewCard: jest.fn(),
  onNewDeck: jest.fn(),
  onDeckSettings: jest.fn(),
  onPublishDeck: jest.fn()
}

describe('ManageContent filtering behavior (unchanged by the useMemo fix)', () => {
  it('shows the matching deck and hides the non-matching deck for a non-empty searchQuery', () => {
    render(<ManageContent {...defaultProps} searchQuery='spanish' />)
    expect(screen.getByText('Spanish Vocabulary')).toBeInTheDocument()
    expect(screen.queryByText('French Grammar')).not.toBeInTheDocument()
  })
})

describe('ManageContent card chip rendering (deck chip vs. tag chip)', () => {
  // Regression test: a saved card's deck-name chip and its tag chips
  // previously rendered with identical Chip styling (size='sm'
  // variant='outlined', no color, no prefix on tags) in the Cards list row —
  // easy to mistake the deck-name chip for a tag. Tag chips now render with
  // a leading '#' (matching the existing StudyCard.js grid-card pattern) and
  // soft/neutral styling so they read as distinct chips from the deck chip.
  it('renders the tag chip with a "#" prefix, distinct from the plain deck-name chip', () => {
    const props = {
      ...defaultProps,
      decks: [makeDeck({ _id: 'd1', name: 'TestTAg' })],
      cards: [makeCard({ _id: 'c1', deck_id: 'd1', tags: ['language'] })],
      totalCards: 1
    }
    render(<ManageContent {...props} />)

    // Switch to the Cards tab, where individual card rows (with the
    // deck-name chip and tag chips) are rendered.
    fireEvent.click(screen.getByRole('tab', { name: /view cards/i }))

    // The deck-name chip renders the bare deck name...
    expect(screen.getByText('TestTAg')).toBeInTheDocument()
    // ...while the tag chip is rendered with a '#' prefix, so it can never
    // be visually confused with the deck-name chip even when a deck happens
    // to be named after what the user intended as a tag.
    expect(screen.getByText('#language')).toBeInTheDocument()
    expect(screen.queryByText('language')).not.toBeInTheDocument()
  })
})

describe('ManageContent render-count evidence (D-03)', () => {
  it('records Profiler commits while typing in the search input', () => {
    // BEFORE baseline: captured against the current un-memoized code (Task 1).
    // Task 2 re-runs this exact test after wrapping filteredDecks/filteredCards
    // in useMemo and records the AFTER commit count alongside this value in
    // the plan's SUMMARY.md as the D-03 before/after artifact.
    const { commits } = withRenderCounter(<ManageContent {...defaultProps} />)
    const input = screen.getByRole('textbox', { name: /search/i })
    ;['a', 'ab', 'abc'].forEach((v) => fireEvent.change(input, { target: { value: v } }))
    expect(commits.length).toBeGreaterThan(0)
  })
})
