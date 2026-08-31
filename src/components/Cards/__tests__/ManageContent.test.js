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

/*
 * MARK-005 — the marked filter in the Content Library.
 *
 * The filter itself is server-side (MARK-001) and the query lives in CardHome,
 * so what is pinned here is the wiring: that the chip reports its state, that
 * it counts as an active filter, and that clearing filters clears it too — the
 * last of which had four duplicated implementations before this task
 * consolidated them onto one `clearAllFilters`.
 */
const MARK_CHIP_ON = 'cards.mark.filter.showMarked'
const MARK_CHIP_OFF = 'cards.mark.filter.showAll'

const renderManageContent = (overrides = {}) => render(<ManageContent {...defaultProps} {...overrides} />)

/** The Cards view, with the filter panel open — where the mark chip lives. */
const openCardsFilterPanel = () => {
  // The Cards tab passes a defaultValue to t(), which this file's i18n mock
  // renders as `key:"default"` — hence the regex rather than an exact match.
  fireEvent.click(screen.getByLabelText(/cards\.manage_content\.aria\.cards/))
  fireEvent.click(screen.getByLabelText('filters.toggle'))
}

describe('MARK-005 — the marked filter', () => {
  it('offers the filter on the Cards view even when nothing is marked yet', () => {
    renderManageContent()
    openCardsFilterPanel()

    // The panel is the only place this can be discovered, so it is shown
    // unconditionally rather than gated on a mark already existing.
    expect(screen.getByLabelText(MARK_CHIP_ON)).toBeInTheDocument()
  })

  it('reports its state as a toggle', () => {
    renderManageContent({ markedOnly: true })
    openCardsFilterPanel()

    expect(screen.getByLabelText(MARK_CHIP_OFF)).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports the toggle to its owner rather than filtering locally', () => {
    const onMarkedOnlyToggle = jest.fn()
    renderManageContent({ onMarkedOnlyToggle })
    openCardsFilterPanel()

    fireEvent.click(screen.getByLabelText(MARK_CHIP_ON))

    expect(onMarkedOnlyToggle).toHaveBeenCalled()
  })

  it('counts as an active filter', () => {
    // The clear-all affordance renders only when activeFilterCount > 0, so its
    // presence with no tags and no type filter is the count itself.
    renderManageContent({ markedOnly: true })
    openCardsFilterPanel()

    expect(screen.getAllByText('filters.clearAll').length).toBeGreaterThan(0)
  })

  it('is not counted when it is off', () => {
    renderManageContent({ markedOnly: false })
    openCardsFilterPanel()

    expect(screen.queryByText('filters.clearAll')).not.toBeInTheDocument()
  })

  it('is cleared by clear-all, along with the other dimensions', () => {
    const onClearTags = jest.fn()
    const onMarkedOnlyToggle = jest.fn()
    renderManageContent({ markedOnly: true, onClearTags, onMarkedOnlyToggle })
    openCardsFilterPanel()

    fireEvent.click(screen.getAllByText('filters.clearAll')[0])

    expect(onClearTags).toHaveBeenCalled()
    expect(onMarkedOnlyToggle).toHaveBeenCalled()
  })

  it('clear-all does not switch the mark filter ON when it was already off', () => {
    const onMarkedOnlyToggle = jest.fn()
    renderManageContent({
      markedOnly: false,
      selectedTags: ['language'],
      availableTags: [{ tag: 'language', count: 1 }],
      onMarkedOnlyToggle
    })
    openCardsFilterPanel()

    fireEvent.click(screen.getAllByText('filters.clearAll')[0])

    // Toggling an inactive dimension would turn the filter on, which is the
    // opposite of clearing — the reason clearAllFilters guards on `markedOnly`.
    expect(onMarkedOnlyToggle).not.toHaveBeenCalled()
  })
})

/**
 * DEBT-006 — toggle state must live on something a user can operate.
 *
 * Joy's `Chip` renders its clickable element in the `action` slot; the root is
 * a plain `div`. `aria-pressed` on that root describes nothing operable, and —
 * the part that actually bites — a click dispatched at it never reaches the
 * handler. The mark chip hit exactly this during MARK-005: the label resolved,
 * the test looked right, and nothing happened.
 */
describe('DEBT-006 — filter chips expose their state on the control, not the wrapper', () => {
  const pressedElements = () => Array.from(document.querySelectorAll('[aria-pressed]'))

  it('puts aria-pressed on a real button for every filter chip', () => {
    renderManageContent({
      markedOnly: true,
      selectedTags: ['language'],
      availableTags: [{ tag: 'language', count: 1 }]
    })
    openCardsFilterPanel()

    const pressed = pressedElements()
    expect(pressed.length).toBeGreaterThan(0)

    for (const element of pressed) {
      // A div carrying aria-pressed is the defect; every one must be operable.
      expect(element.tagName.toLowerCase()).toBe('button')
    }
  })

  it('reports a type-filter click, proving the handler is reachable', () => {
    renderManageContent()
    openCardsFilterPanel()

    // Joy's action button is an overlay sibling of the label, named through
    // `aria-labelledby` — so the label text is not itself the click target.
    fireEvent.click(screen.getByRole('button', { name: 'cards.manage_content.filters.quizzes' }))

    // Selecting a type narrows the active filters, which surfaces clear-all.
    expect(screen.getAllByText('filters.clearAll').length).toBeGreaterThan(0)
  })
})
