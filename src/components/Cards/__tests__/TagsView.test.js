/**
 * TagsView — the library's third view (PRD D6, US-004, US-005, ADR-014).
 */
import React from 'react'
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
let mockMobile = false
jest.mock('../../../hooks/useIsMobile', () => ({ useIsMobile: () => mockMobile }))

const GROUPS = {
  system: [
    { key: 'marked', cards: 6, decks: 2, deck_ids: ['d1', 'd2'], due: 2, new: 1 },
    { key: 'struggling', cards: 7, decks: 1, deck_ids: ['d1'], due: 7, new: 0, window_days: 14 }
  ],
  tags: [
    { tag: 'verbs', cards: 46, decks: 2, deck_ids: ['d1', 'd2'], due: 9, new: 2 },
    { tag: 'asia', cards: 140, decks: 1, deck_ids: ['d2'], due: 0, new: 0 }
  ],
  untagged: { cards: 85, due: 6, new: 12 }
}
let mockGroups = GROUPS
jest.mock('../../../hooks/useGroups', () => ({ useGroups: () => ({ groups: mockGroups, loading: false, error: null, reload: jest.fn() }) }))

const mockUseCardData = jest.fn()
jest.mock('../../../hooks/useCardData', () => ({ useCardData: (...args) => mockUseCardData(...args) }))
jest.mock('../MarkToggle', () => ({ __esModule: true, default: () => <button type='button'>mark</button> }))
const mockBulk = jest.fn()
const mockRenameTag = jest.fn()
const mockRemoveTag = jest.fn()
jest.mock('../../../api/services', () => ({
  cardsService: {
    bulk: (...args) => mockBulk(...args),
    renameTag: (...args) => mockRenameTag(...args),
    removeTag: (...args) => mockRemoveTag(...args)
  }
}))
const mockInvalidate = jest.fn()
jest.mock('../../../api/cardCache', () => ({
  patchCardInCache: jest.fn(),
  invalidateCardCaches: (...args) => mockInvalidate(...args)
}))

const TagsView = require('../TagsView').default

const DECKS = [
  { _id: 'd1', name: 'Spanish verbs', deck_type: 'flashcard', total_cards: 48, due_cards: 3, new_cards: 5, mastery: 62 },
  { _id: 'd2', name: 'French idioms', deck_type: 'flashcard', total_cards: 30, due_cards: 0, new_cards: 0, mastery: 88 }
]
const CARDS = [
  { _id: 'c1', title: 'ser vs estar', deck_id: 'd1', next_review: '2026-09-09T00:00:00Z', tags: ['verbs'] },
  { _id: 'c2', title: 'Preterite of ir', deck_id: 'd1', next_review: '2026-09-01T00:00:00Z', tags: ['verbs'], last_grade: 'again' }
]

beforeEach(() => {
  mockSearch = new URLSearchParams()
  mockSetSearchParams.mockReset().mockImplementation((next) => {
    mockSearch = new URLSearchParams(next)
  })
  mockNavigate.mockReset()
  mockMobile = false
  mockGroups = GROUPS
  mockUseCardData.mockReset().mockReturnValue({ cards: CARDS, total: 46, hasMore: true, loading: false, fetchMore: jest.fn() })
  mockBulk.mockReset().mockResolvedValue({ updated: 1 })
  mockRenameTag.mockReset().mockResolvedValue({ cards: 46 })
  mockRemoveTag.mockReset().mockResolvedValue({ cards: 46 })
  mockInvalidate.mockReset().mockResolvedValue(undefined)
})

describe('the index', () => {
  it('lists Struggling and Marked above the tags, sorted as the API sorted them, with due readouts', () => {
    render(<TagsView decks={DECKS} />)
    const rows = screen.getAllByTestId('group-row')
    expect(rows[0]).toHaveTextContent('groups.struggling')
    expect(rows[0]).toHaveTextContent('groups.strugglingMeta:{"days":14}')
    expect(rows[0]).toHaveTextContent('study.dueCount:{"count":7}')
    expect(rows[1]).toHaveTextContent('groups.marked')
    expect(rows[2]).toHaveTextContent('verbs')
    expect(rows[2]).toHaveTextContent('groups.cardsDecks:{"cards":46,"decks":2}')
    expect(rows[3]).toHaveTextContent('groups.upToDate')
    expect(screen.getByText(/groups\.readout:\{"system":2,"tags":2\}/)).toBeInTheDocument()
  })

  it('names the untagged count in the readout as a link that opens Cards with No tag on — never as a row (PRD D15)', () => {
    mockSearch = new URLSearchParams('view=library&tab=tags')
    render(<TagsView decks={DECKS} />)
    expect(screen.getAllByTestId('group-row')).toHaveLength(4)
    expect(screen.queryByText(/groups\.untagged$/)).not.toBeInTheDocument()
    const link = screen.getByRole('button', { name: 'groups.untaggedLinkAria:{"count":85}' })
    expect(link).toHaveTextContent('groups.readoutUntagged:{"count":85}')
    fireEvent.click(link)
    expect(mockSearch.get('tab')).toBe('cards')
    expect(mockSearch.get('untagged')).toBe('1')
    expect(mockSearch.get('view')).toBe('library')
  })

  it('keeps the plain readout when nothing is untagged (§11: no zero counters)', () => {
    mockGroups = { ...GROUPS, untagged: { cards: 0, due: 0, new: 0 } }
    render(<TagsView decks={DECKS} />)
    expect(screen.queryByRole('button', { name: /groups\.untaggedLinkAria/ })).not.toBeInTheDocument()
    expect(screen.getByText('groups.readout:{"system":2,"tags":2}')).toBeInTheDocument()
  })

  it('filters the tags by the toolbar search and never hides the system groups', () => {
    render(<TagsView decks={DECKS} search='asi' />)
    const rows = screen.getAllByTestId('group-row')
    expect(rows).toHaveLength(3)
    expect(rows[2]).toHaveTextContent('asia')
  })

  it('still lists an empty Struggling group with "Nothing yet" — a group is never hidden', () => {
    mockGroups = { system: [], tags: [] }
    render(<TagsView decks={DECKS} />)
    expect(screen.getAllByTestId('group-row')[0]).toHaveTextContent('groups.nothingYet')
    expect(screen.getByText('groups.emptyTags')).toBeInTheDocument()
  })

  it('puts the open group in the URL', () => {
    render(<TagsView decks={DECKS} />)
    fireEvent.click(screen.getByLabelText('groups.selectAria:{"name":"verbs"}'))
    expect(mockSearch.get('group')).toBe('tag:verbs')
  })
})

describe('the open group', () => {
  it('shows a tag with its decks as rows, its cards sorted by next review, and Study · N that opens the narrowed session', () => {
    mockSearch = new URLSearchParams('group=tag:verbs')
    render(<TagsView decks={DECKS} />)
    const detail = screen.getByTestId('group-detail')
    expect(within(detail).getByRole('heading', { level: 3 })).toHaveTextContent('verbs')
    expect(detail).toHaveTextContent('groups.detailReadout:{"cards":46,"decks":2}')
    expect(mockUseCardData).toHaveBeenCalledWith(['verbs'], '', false, null)
    expect(within(detail).getAllByTestId('deck-row')).toHaveLength(2)
    const cards = within(detail).getAllByTestId('card-row')
    expect(cards[0]).toHaveTextContent('Preterite of ir')
    expect(cards[1]).toHaveTextContent('ser vs estar')
    fireEvent.click(screen.getByText('groups.study:{"count":11}'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/daily-review?tags=verbs')
    fireEvent.click(screen.getByText('groups.browse'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/daily-review?tags=verbs&mode=browse')
    expect(screen.getByText('groups.showMore:{"count":44}')).toBeInTheDocument()
  })

  it("opens Struggling on the server-side group and shows each card's last grade", () => {
    mockSearch = new URLSearchParams('group=struggling')
    render(<TagsView decks={DECKS} />)
    expect(mockUseCardData).toHaveBeenCalledWith([], '', false, 'struggling')
    expect(screen.getAllByTestId('card-row')[0]).toHaveTextContent('groups.lastGrade:{"grade":"groups.gradeAgain"}')
    fireEvent.click(screen.getByText('groups.study:{"count":7}'))
    expect(mockNavigate).toHaveBeenCalledWith('/study/daily-review?group=struggling')
  })

  it('gives Marked no Study and no Browse key — the mark may not narrow a study queue (ADR-014)', () => {
    mockSearch = new URLSearchParams('group=marked')
    render(<TagsView decks={DECKS} />)
    expect(mockUseCardData).toHaveBeenCalledWith([], '', false, 'marked')
    expect(screen.queryByText(/groups\.study:/)).not.toBeInTheDocument()
    expect(screen.queryByText('groups.browse')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('card-row')).toHaveLength(2)
  })
})

describe('MGMT-004 — the selection bar inside an open group (PRD D16)', () => {
  it('stands in for the cards head while a selection exists, keeps Study and Browse, and marks the selected ids', async () => {
    mockSearch = new URLSearchParams('group=tag:verbs')
    render(<TagsView decks={DECKS} availableTags={[{ tag: 'verbs', count: 46 }]} />)
    const detail = screen.getByTestId('group-detail')
    expect(within(detail).getByText('groups.cards')).toBeInTheDocument()
    fireEvent.click(within(detail).getByRole('checkbox', { name: 'cards.select.rowAria:{"title":"ser vs estar"}' }))
    const bar = within(detail).getByTestId('selection-bar')
    expect(bar).toHaveTextContent('cards.select.count:{"count":1}')
    expect(within(detail).queryByText('groups.cards')).not.toBeInTheDocument()
    expect(within(detail).getByText('groups.study:{"count":11}')).toBeInTheDocument()
    fireEvent.click(within(bar).getByRole('button', { name: 'cards.mark.action' }))
    await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: ['c1'], action: 'mark' }))
    await waitFor(() => expect(within(detail).queryByTestId('selection-bar')).not.toBeInTheDocument())
  })
})

describe('on a phone', () => {
  it('shows the index alone, then the group alone with a back control that returns to the index', () => {
    mockMobile = true
    const first = render(<TagsView decks={DECKS} />)
    expect(screen.getByTestId('groups-index')).toBeInTheDocument()
    expect(screen.queryByTestId('group-detail')).not.toBeInTheDocument()
    first.unmount()

    mockSearch = new URLSearchParams('group=tag:verbs')
    render(<TagsView decks={DECKS} />)
    expect(screen.queryByTestId('groups-index')).not.toBeInTheDocument()
    expect(screen.getByTestId('group-detail')).toBeInTheDocument()
    fireEvent.click(screen.getByText('groups.back'))
    expect(mockSearch.get('group')).toBeNull()
  })
})
