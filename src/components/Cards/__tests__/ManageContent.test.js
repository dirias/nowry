/**
 * ManageContent — the library after STUDY-005 (docs/prd-study-center.md D3, D5, US-003).
 *
 * One toolbar row; filters are menus off their segments; decks are tiles or
 * rows of one anatomy; cards are rows. The `t` mock serialises options.
 */
import React, { Profiler } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

let mockSearch = new URLSearchParams()
const mockSetSearchParams = jest.fn()
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearch, mockSetSearchParams]
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))
jest.mock('../CardPreviewModal', () => ({ __esModule: true, default: () => null }))
jest.mock('../DeckAnalysisPanel', () => ({ __esModule: true, default: () => null }))
jest.mock('../MarkToggle', () => ({ __esModule: true, default: () => <button type='button'>mark</button> }))
jest.mock('../TagsView', () => ({ __esModule: true, default: () => <div data-testid='tags-view' /> }))
jest.mock('../../../hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'free' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))

const ManageContent = require('../ManageContent').default

const makeDeck = (overrides = {}) => ({
  _id: 'd1',
  name: 'Spanish Vocabulary',
  tags: ['language'],
  deck_type: 'flashcard',
  total_cards: 5,
  due_cards: 2,
  new_cards: 0,
  mastery: 40,
  ...overrides
})
const makeCard = (overrides = {}) => ({
  _id: 'c1',
  title: 'Card 1',
  content: 'Content 1',
  card_type: 'flashcard',
  deck_id: 'd1',
  tags: ['language'],
  ...overrides
})

const defaultProps = () => ({
  decks: [makeDeck(), makeDeck({ _id: 'd2', name: 'French Grammar', tags: ['grammar'], deck_type: 'quiz', due_cards: 0 })],
  cards: [makeCard(), makeCard({ _id: 'c2', title: 'Card 2' })],
  loading: false,
  onEditDeck: jest.fn(),
  onDeleteDeck: jest.fn(),
  onEditCard: jest.fn(),
  onDeleteCard: jest.fn(),
  onAddCard: jest.fn(),
  onStudy: jest.fn(),
  onBrowse: jest.fn(),
  searchQuery: '',
  availableTags: [{ tag: 'language', count: 3 }],
  selectedTags: [],
  onTagToggle: jest.fn(),
  onClearTags: jest.fn(),
  markedOnly: false,
  onMarkedOnlyToggle: jest.fn(),
  onSearchChange: jest.fn(),
  onImport: jest.fn(),
  onNewCard: jest.fn(),
  onNewDeck: jest.fn(),
  onDeckSettings: jest.fn(),
  onPublishDeck: jest.fn()
})

beforeEach(() => {
  mockSearch = new URLSearchParams()
  mockSetSearchParams.mockReset().mockImplementation((next) => {
    mockSearch = new URLSearchParams(next)
  })
  mockNavigate.mockReset()
  localStorage.clear()
})

describe('the toolbar (PRD D5)', () => {
  it('is one row: a Decks · Cards segment with readouts, search, Type and Tags menus, grid | list, and Add', () => {
    render(<ManageContent {...defaultProps()} />)
    const tabs = within(screen.getByTestId('library-tab')).getAllByRole('button')
    expect(tabs[0]).toHaveTextContent('cards.manage_content.tabs.decksOnly2')
    expect(tabs[0]).toHaveAttribute('aria-pressed', 'true')
    expect(tabs[2]).toHaveTextContent('cards.manage_content.tabs.tagsOnly3')
    expect(screen.getByRole('textbox', { name: 'cards.manage_content.aria.search' })).toBeInTheDocument()
    const filters = screen.getByTestId('library-filters')
    expect(within(filters).getByText('filters.type')).toBeInTheDocument()
    expect(within(filters).getByText('filters.tags')).toBeInTheDocument()
    expect(within(filters).queryByText('filters.marked')).not.toBeInTheDocument()
    expect(screen.getByTestId('library-view')).toBeInTheDocument()
    expect(screen.getByText('cards.add')).toBeInTheDocument()
    expect(screen.queryByText('cards.tags.all')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('filters.toggle')).not.toBeInTheDocument()
  })

  it('puts the tab in the URL and shows the Marked toggle only on Cards', () => {
    const first = render(<ManageContent {...defaultProps()} />)
    fireEvent.click(within(screen.getByTestId('library-tab')).getAllByRole('button')[1])
    expect(mockSearch.get('tab')).toBe('cards')
    first.unmount()

    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} />)
    expect(screen.getAllByTestId('card-row')).toHaveLength(2)
    expect(within(screen.getByTestId('library-filters')).getByText('filters.marked')).toBeInTheDocument()
    expect(screen.queryByTestId('library-view')).not.toBeInTheDocument()
  })

  it('makes the type readout the label — "Type · 1" — and clears from inside the menu, never moving the list', () => {
    render(<ManageContent {...defaultProps()} />)
    fireEvent.click(screen.getByLabelText('filters.typeMenuAria'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'cards.manage_content.filters.quizzes' }))
    expect(screen.getByText('filters.typeReadout:{"count":1}')).toBeInTheDocument()
    expect(screen.getByText('French Grammar')).toBeInTheDocument()
    expect(screen.queryByText('Spanish Vocabulary')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('filters.typeMenuAria'))
    fireEvent.click(screen.getByText('filters.clear'))
    expect(screen.getByText('Spanish Vocabulary')).toBeInTheDocument()
  })

  it('lists the tags from the API with their counts and reports a toggle to its owner', () => {
    const props = defaultProps()
    render(<ManageContent {...props} />)
    fireEvent.click(screen.getByLabelText('cards.tags.filterBy'))
    const item = screen.getByRole('menuitemcheckbox', { name: /language/ })
    expect(item).toHaveTextContent('3')
    fireEvent.click(item)
    expect(props.onTagToggle).toHaveBeenCalledWith('language')
  })
})

describe('the Tags view (PRD D6)', () => {
  it('is the third segment; it mounts the groups index and hides the list filters and the layout toggle', () => {
    mockSearch = new URLSearchParams('tab=tags')
    render(<ManageContent {...defaultProps()} />)
    expect(screen.getByTestId('tags-view')).toBeInTheDocument()
    expect(screen.queryByTestId('library-filters')).not.toBeInTheDocument()
    expect(screen.queryByTestId('library-view')).not.toBeInTheDocument()
  })
})

describe('MARK-005 — the marked filter is a toggle segment on the Cards view', () => {
  it('reports its state on the control and the toggle to its owner rather than filtering locally', () => {
    mockSearch = new URLSearchParams('tab=cards')
    const props = defaultProps()
    render(<ManageContent {...props} />)
    const toggle = screen.getByLabelText('cards.mark.filter.showMarked')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(props.onMarkedOnlyToggle).toHaveBeenCalledTimes(1)
    expect(screen.getAllByTestId('card-row')).toHaveLength(2)
  })

  it('reads as pressed when the owner says it is on', () => {
    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} markedOnly />)
    expect(screen.getByLabelText('cards.mark.filter.showAll')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('decks as tiles and rows (PRD D3)', () => {
  it('searches by name and tag, and a tile click studies a due deck without a modal', () => {
    const props = defaultProps()
    render(<ManageContent {...props} searchQuery='Spanish' />)
    expect(screen.getByText('Spanish Vocabulary')).toBeInTheDocument()
    expect(screen.queryByText('French Grammar')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('deck-tile'))
    expect(props.onStudy).toHaveBeenCalledWith(expect.objectContaining({ _id: 'd1' }))
    expect(document.querySelector('[style*="perspective"]')).toBeNull()
  })

  it('switches to rows of the same anatomy and remembers the choice', () => {
    render(<ManageContent {...defaultProps()} />)
    fireEvent.click(screen.getByLabelText('cards.manage_content.aria.listView'))
    expect(screen.getAllByTestId('deck-row')).toHaveLength(2)
    expect(localStorage.getItem('nowry_deck_view_mode')).toBe('list')
    const quizRow = screen.getByText('French Grammar').closest('[data-testid="deck-row"]')
    expect(quizRow).toHaveTextContent('study.types.quizzes')
    expect(quizRow).toHaveTextContent('study.deck.upToDate')
  })

  it('offers every deck action from one kebab', () => {
    const props = defaultProps()
    render(<ManageContent {...props} />)
    fireEvent.click(screen.getAllByLabelText(/cards\.manage_content\.aria\.deckActions/)[0])
    fireEvent.click(screen.getByText('deckSettings.menuItem'))
    expect(props.onDeckSettings).toHaveBeenCalledWith(expect.objectContaining({ _id: 'd1' }))
    expect(props.onStudy).not.toHaveBeenCalled()
  })
})

describe('cards as rows (PRD US-003)', () => {
  it('shows deck, next review and tags on one meta line with the mark visible and no emoji', () => {
    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} />)
    const row = screen.getAllByTestId('card-row')[0]
    expect(row).toHaveTextContent('Spanish Vocabulary')
    expect(row).toHaveTextContent('cards.manage_content.reviewNew')
    expect(row).toHaveTextContent('#language')
    expect(row).not.toHaveTextContent('📚')
    expect(within(row).getByText('mark')).toBeInTheDocument()
  })

  it('keeps edit and delete behind a kebab that does not open the preview', () => {
    mockSearch = new URLSearchParams('tab=cards')
    const props = defaultProps()
    render(<ManageContent {...props} />)
    fireEvent.click(screen.getAllByLabelText(/cards\.manage_content\.aria\.cardActions/)[0])
    fireEvent.click(screen.getByText('cards.deck.delete'))
    expect(props.onDeleteCard).toHaveBeenCalledWith(expect.objectContaining({ _id: 'c1' }))
  })
})

describe('ManageContent render-count evidence (D-03)', () => {
  it('records Profiler commits while typing in the search input', () => {
    const commits = []
    render(
      <Profiler id='ManageContent' onRender={(id, phase, actualDuration) => commits.push({ phase, actualDuration })}>
        <ManageContent {...defaultProps()} />
      </Profiler>
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'cards.manage_content.aria.search' }), { target: { value: 'Sp' } })
    expect(commits.length).toBeGreaterThan(0)
  })
})
