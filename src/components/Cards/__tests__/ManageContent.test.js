/**
 * ManageContent — the library after STUDY-005 (docs/prd-study-center.md D3, D5, US-003).
 *
 * One toolbar row; filters are menus off their segments; decks are tiles or
 * rows of one anatomy; cards are rows. The `t` mock serialises options.
 */
import React, { Profiler } from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

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
const mockUseGroups = jest.fn()
jest.mock('../../../hooks/useGroups', () => ({ useGroups: (...args) => mockUseGroups(...args) }))
const mockUseDeckData = jest.fn()
jest.mock('../../../hooks/useDeckData', () => ({ useDeckData: (...args) => mockUseDeckData(...args) }))
jest.mock('../../../hooks/useSubscription', () => ({ useSubscription: () => ({ tier: 'free' }) }))
jest.mock('../../../context/SubscriptionContext', () => ({ useSubscriptionContext: () => ({ openUpgradeModal: jest.fn() }) }))
const mockBulk = jest.fn()
jest.mock('../../../api/services', () => ({ cardsService: { bulk: (...args) => mockBulk(...args) } }))
const mockInvalidate = jest.fn()
jest.mock('../../../api/cardCache', () => ({
  patchCardInCache: jest.fn(),
  invalidateCardCaches: (...args) => mockInvalidate(...args)
}))

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
  onArchiveDeck: jest.fn(),
  onRestoreDeck: jest.fn(),
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
  untagged: false,
  onUntaggedToggle: jest.fn(),
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
  mockUseGroups.mockReset().mockReturnValue({
    groups: { system: [], tags: [], untagged: { cards: 85, due: 6, new: 12 } },
    untagged: { cards: 85, due: 6, new: 12 },
    loading: false,
    error: null,
    reload: jest.fn()
  })
  mockUseDeckData.mockReset().mockReturnValue({ decks: [], loading: false, error: null, reload: jest.fn() })
  mockBulk.mockReset().mockResolvedValue({ updated: 1 })
  mockInvalidate.mockReset().mockResolvedValue(undefined)
  localStorage.clear()
  sessionStorage.clear()
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

describe('MGMT-003 — the No tag filter (PRD D15, US-008)', () => {
  it('ends the Tags menu with a hairline and "No tag · N", and reports a toggle to its owner', () => {
    mockSearch = new URLSearchParams('tab=cards')
    const props = defaultProps()
    render(<ManageContent {...props} />)
    fireEvent.click(screen.getByLabelText('cards.tags.filterBy'))
    const items = screen.getAllByRole('menuitemcheckbox')
    const noTag = items[items.length - 1]
    expect(noTag).toHaveTextContent('filters.noTag')
    expect(noTag).toHaveTextContent('85')
    expect(noTag).toHaveAttribute('aria-checked', 'false')
    expect(noTag.previousElementSibling).toHaveAttribute('role', 'separator')
    fireEvent.click(noTag)
    expect(props.onUntaggedToggle).toHaveBeenCalledTimes(1)
    expect(props.onTagToggle).not.toHaveBeenCalled()
  })

  it('counts No tag in the readout like any tag — "Tags · 1" — and clears it with the rest', () => {
    mockSearch = new URLSearchParams('tab=cards')
    const props = defaultProps()
    render(<ManageContent {...props} untagged />)
    expect(screen.getByText('filters.tagsReadout:{"count":1}')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('cards.tags.filterBy'))
    expect(screen.getByTestId('no-tag-filter')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByText('filters.clear'))
    expect(props.onClearTags).toHaveBeenCalledTimes(1)
  })

  it('still offers the row when the user has no tags at all, and never loads the index for Decks', () => {
    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} availableTags={[]} />)
    expect(mockUseGroups).toHaveBeenLastCalledWith({ enabled: true })
    fireEvent.click(screen.getByLabelText('cards.tags.filterBy'))
    expect(screen.getByTestId('no-tag-filter')).toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('does not pay for the groups index on the Decks view', () => {
    render(<ManageContent {...defaultProps()} />)
    expect(mockUseGroups).toHaveBeenLastCalledWith({ enabled: false })
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

describe('MGMT-006 — Archive and the Archived section (PRD D18, US-010)', () => {
  const archived = [
    { _id: 'a1', name: 'Old Kanji', deck_type: 'flashcard', total_cards: 48, mastery: 62, archived_at: '2026-08-12T10:00:00Z' }
  ]

  it('offers Archive from the kebab and reports it to the owner without a confirm', () => {
    const props = defaultProps()
    render(<ManageContent {...props} />)
    fireEvent.click(screen.getAllByLabelText(/cards\.manage_content\.aria\.deckActions/)[0])
    fireEvent.click(screen.getByText('cards.deck.archive'))
    expect(props.onArchiveDeck).toHaveBeenCalledWith(expect.objectContaining({ _id: 'd1' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows no Archived row while nothing is archived, and never on the Cards view', () => {
    const first = render(<ManageContent {...defaultProps()} />)
    expect(screen.queryByTestId('archived-decks')).not.toBeInTheDocument()
    first.unmount()

    mockUseDeckData.mockReturnValue({ decks: archived, loading: false })
    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} />)
    expect(screen.queryByTestId('archived-decks')).not.toBeInTheDocument()
  })

  it('puts the Archived row at the foot of both layouts, and Restore reaches the owner', () => {
    mockUseDeckData.mockReturnValue({ decks: archived, loading: false })
    const props = defaultProps()
    const first = render(<ManageContent {...props} />)
    const section = screen.getByTestId('archived-decks')
    expect(mockUseDeckData).toHaveBeenCalledWith(undefined, { archived: true })
    const tiles = screen.getAllByTestId('deck-tile')
    expect(tiles[tiles.length - 1].compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    first.unmount()

    render(<ManageContent {...props} />)
    fireEvent.click(screen.getByLabelText('cards.manage_content.aria.listView'))
    const rows = screen.getAllByTestId('deck-row')
    expect(rows).toHaveLength(2) // the active rows only; the archived list is closed
    const foot = screen.getByTestId('archived-decks')
    expect(rows[1].compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(within(foot).getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: 'study.deck.restoreAria:{"name":"Old Kanji"}' }))
    expect(props.onRestoreDeck).toHaveBeenCalledWith(expect.objectContaining({ _id: 'a1' }))
  })
})

describe('MGMT-004 — selection and the bulk verbs (PRD D16, US-009)', () => {
  const rowCheckbox = (title) => screen.getByRole('checkbox', { name: `cards.select.rowAria:{"title":"${title}"}` })
  const selectFirst = () => {
    mockSearch = new URLSearchParams('tab=cards')
    const props = defaultProps()
    render(<ManageContent {...props} />)
    fireEvent.click(rowCheckbox('Card 1'))
    return props
  }

  it('offers a checkbox in every row, and the first check swaps the toolbar for the bar', () => {
    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} />)
    expect(screen.getByTestId('library-tab')).toBeInTheDocument()
    expect(rowCheckbox('Card 2')).not.toBeChecked()
    fireEvent.click(rowCheckbox('Card 1'))
    expect(rowCheckbox('Card 1')).toBeChecked()
    const bar = screen.getByTestId('selection-bar')
    expect(bar).toHaveTextContent('cards.select.count:{"count":1}')
    expect(bar).toHaveTextContent('cards.select.all:{"count":2}')
    expect(screen.queryByTestId('library-tab')).not.toBeInTheDocument()
    expect(bar.querySelector('.MuiButton-variantSolid')).toBeNull()
    expect(screen.getAllByTestId('card-row')).toHaveLength(2)
  })

  it('brings the toolbar back from ✕ and from Escape', () => {
    selectFirst()
    fireEvent.click(screen.getByRole('button', { name: 'cards.select.clear' }))
    expect(screen.getByTestId('library-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('selection-bar')).not.toBeInTheDocument()

    fireEvent.click(rowCheckbox('Card 2'))
    expect(screen.getByTestId('selection-bar')).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.getByTestId('library-tab')).toBeInTheDocument()
  })

  it('while selecting, a row click toggles instead of previewing, and Select all takes every loaded card', () => {
    selectFirst()
    fireEvent.click(screen.getAllByTestId('card-row')[1])
    expect(screen.getByTestId('selection-bar')).toHaveTextContent('cards.select.count:{"count":2}')
    fireEvent.click(screen.getAllByTestId('card-row')[1])
    expect(screen.getByTestId('selection-bar')).toHaveTextContent('cards.select.count:{"count":1}')
    fireEvent.click(screen.getByRole('button', { name: 'cards.select.all:{"count":2}' }))
    expect(rowCheckbox('Card 2')).toBeChecked()
  })

  it('Move to opens the deck sheet and moves the selected ids in one call, then clears', async () => {
    selectFirst()
    fireEvent.click(screen.getByRole('button', { name: 'cards.select.moveTo' }))
    const sheet = screen.getByRole('dialog')
    expect(sheet).toHaveTextContent('cards.move.title:{"count":1}')
    const confirm = within(sheet).getByRole('button', { name: 'cards.move.confirm:{"count":1}' })
    expect(confirm).toBeDisabled()
    fireEvent.click(within(sheet).getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'French Grammar' }))
    fireEvent.click(confirm)
    await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: ['c1'], action: 'move', deckId: 'd2' }))
    await waitFor(() => expect(screen.queryByTestId('selection-bar')).not.toBeInTheDocument())
    expect(mockInvalidate).toHaveBeenCalled()
  })

  it('Mark marks every selected id; Tag ▾ adds a tag and keeps the selection for the next pick', async () => {
    selectFirst()
    fireEvent.click(screen.getByRole('button', { name: 'cards.mark.action' }))
    await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: ['c1'], action: 'mark' }))
    await waitFor(() => expect(screen.queryByTestId('selection-bar')).not.toBeInTheDocument())

    fireEvent.click(rowCheckbox('Card 2'))
    fireEvent.click(screen.getByRole('button', { name: 'cards.select.tagAria' }))
    expect(screen.getByRole('menuitemcheckbox', { name: /language/ })).toHaveAttribute('aria-checked', 'true')
    const field = screen.getByRole('textbox', { name: 'cards.select.newTag' })
    fireEvent.change(field, { target: { value: 'kanji' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: ['c2'], action: 'tag', tags: ['kanji'] }))
    expect(screen.getByTestId('selection-bar')).toBeInTheDocument()
  })

  it('Delete asks once, then deletes the selected ids in one call', async () => {
    selectFirst()
    fireEvent.click(screen.getByRole('button', { name: 'cards.deck.delete' }))
    expect(mockBulk).not.toHaveBeenCalled()
    const ask = screen.getByRole('alertdialog')
    expect(ask).toHaveTextContent('cards.select.deleteTitle:{"count":1}')
    fireEvent.click(within(ask).getByRole('button', { name: 'cards.select.deleteConfirm:{"count":1}' }))
    await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: ['c1'], action: 'delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it("orders the row's kebab Edit, Move to…, Tags…, then Delete after a hairline", () => {
    mockSearch = new URLSearchParams('tab=cards')
    const props = defaultProps()
    props.onEditTags = jest.fn()
    render(<ManageContent {...props} />)
    fireEvent.click(screen.getAllByLabelText(/cards\.manage_content\.aria\.cardActions/)[0])
    const items = screen.getAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'cards.deck.edit',
      'cards.select.moveOne',
      'cards.select.editTags',
      'cards.deck.delete'
    ])
    expect(items[3].previousElementSibling).toHaveAttribute('role', 'separator')
    fireEvent.click(items[2])
    expect(props.onEditTags).toHaveBeenCalledWith(expect.objectContaining({ _id: 'c1' }))
    expect(screen.queryByTestId('selection-bar')).not.toBeInTheDocument()
  })

  it("a row's Move to… opens the same sheet for that one card", async () => {
    mockSearch = new URLSearchParams('tab=cards')
    render(<ManageContent {...defaultProps()} />)
    fireEvent.click(screen.getAllByLabelText(/cards\.manage_content\.aria\.cardActions/)[1])
    fireEvent.click(screen.getByText('cards.select.moveOne'))
    const sheet = screen.getByRole('dialog')
    fireEvent.click(within(sheet).getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'Spanish Vocabulary' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'cards.move.confirm:{"count":1}' }))
    await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: ['c2'], action: 'move', deckId: 'd1' }))
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
