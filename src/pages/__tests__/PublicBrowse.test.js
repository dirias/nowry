/**
 * LIB-006 — the Public Library's evidence rules, pinned.
 *
 * These guard decisions rather than markup. The defect this page shipped with
 * was not a layout mistake: it rendered `views / likes / forks` unconditionally,
 * so a young catalogue led every row with "0 likes, 0 forks" — an argument
 * against the thing it was selling, in the row's heaviest slot (ADR-012).
 *
 * A note on the colour guard. The original bug painted the metric GLYPHS via
 * `sx={{ color: 'danger.solidBg' }}`, which emotion compiles to a generated
 * class — so a class-name assertion could never have caught it, and one here
 * would be theatre. What is checkable, and what actually prevents a recurrence,
 * is that both views render through ONE `Evidence` implementation: the tests
 * below assert the same rule holds in the list and in the grid, so the two
 * cannot drift apart and there is only one place left to get the colour wrong.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => (opts ? `${k}:${JSON.stringify(opts)}` : k) })
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

jest.mock('../../components/Books/Book', () => ({ __esModule: true, default: () => null }))

jest.mock('../../api/services', () => ({
  publicContentService: {
    browseBooks: jest.fn(),
    browseDecks: jest.fn(),
    getPublicDeckCards: jest.fn(),
    forkBook: jest.fn(),
    forkDeck: jest.fn()
  }
}))

const { publicContentService } = require('../../api/services')
const PublicBrowse = require('../PublicBrowse').default

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

/** A book with everything switched off; spread over it to vary one thing. */
const book = (over = {}) => ({
  _id: 'b1',
  title: 'Alpha',
  author_name: 'Ada',
  published_at: daysAgo(400),
  public_metadata: { views: 0, likes: 0, forks: 0 },
  ...over
})

/** Four books, because three or fewer takes the sparse branch by design. */
const fourBooks = (first = {}) => [
  book(first),
  book({ _id: 'b2', title: 'Beta' }),
  book({ _id: 'b3', title: 'Gamma' }),
  book({ _id: 'b4', title: 'Delta' })
]

const renderBrowse = async (items, { view = 'list', total } = {}) => {
  window.localStorage.setItem('public_view_mode', view)
  publicContentService.browseBooks.mockResolvedValue({ items, total: total ?? items.length })
  publicContentService.browseDecks.mockResolvedValue({ items: [], total: 0 })
  const utils = render(<PublicBrowse />)
  await waitFor(() => expect(publicContentService.browseBooks).toHaveBeenCalled())
  return utils
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
  publicContentService.forkBook.mockResolvedValue({ created: true, content: {} })
  publicContentService.forkDeck.mockResolvedValue({ created: true, content: {} })
})

describe('a metric renders only when it is evidence', () => {
  it('renders no zero at all when nothing has happened yet', async () => {
    await renderBrowse(fourBooks())
    const row = (await screen.findAllByTestId('public-row'))[0]

    // Not "0 likes", not a dimmed zero: nothing. A zero is the absence of
    // evidence, and three of them were the row's heaviest element.
    expect(within(row).queryByText('0')).not.toBeInTheDocument()
  })

  it('renders a non-zero metric without dragging its zero siblings along', async () => {
    await renderBrowse(fourBooks({ public_metadata: { views: 402, likes: 9, forks: 0 } }))
    const row = (await screen.findAllByTestId('public-row'))[0]

    expect(within(row).getByText('9')).toBeInTheDocument()
    expect(within(row).queryByText('0')).not.toBeInTheDocument()
  })

  it('applies the same rule in grid view, because both views share one implementation', async () => {
    await renderBrowse(fourBooks({ public_metadata: { views: 0, likes: 12, forks: 0 } }), { view: 'grid' })

    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

describe('an item with nothing to show yet', () => {
  it('is called new while it is still new', async () => {
    await renderBrowse(fourBooks({ published_at: daysAgo(3) }))
    const row = (await screen.findAllByTestId('public-row'))[0]

    expect(within(row).getByText('public.newBadge')).toBeInTheDocument()
  })

  it('says nothing once it is not, rather than wearing a chip that would mean nothing', async () => {
    await renderBrowse(fourBooks({ published_at: daysAgo(400) }))
    const row = (await screen.findAllByTestId('public-row'))[0]

    expect(within(row).queryByText('public.newBadge')).not.toBeInTheDocument()
  })

  it('is not called new merely because it is recent, if it already has evidence', async () => {
    await renderBrowse(fourBooks({ published_at: daysAgo(3), public_metadata: { views: 0, likes: 4, forks: 0 } }))
    const row = (await screen.findAllByTestId('public-row'))[0]

    expect(within(row).getByText('4')).toBeInTheDocument()
    expect(within(row).queryByText('public.newBadge')).not.toBeInTheDocument()
  })
})

describe('a category renders only when it is one', () => {
  it('shows a real category', async () => {
    await renderBrowse(fourBooks({ public_metadata: { views: 0, likes: 0, forks: 0, category: 'science' } }))
    const row = (await screen.findAllByTestId('public-row'))[0]

    expect(within(row).getByText(/public\.categories\.science/)).toBeInTheDocument()
  })

  it('treats "Other" as the absence of one', async () => {
    await renderBrowse(fourBooks({ public_metadata: { views: 0, likes: 0, forks: 0, category: 'Other' } }))
    const row = (await screen.findAllByTestId('public-row'))[0]

    expect(within(row).queryByText(/public\.categories\.other/i)).not.toBeInTheDocument()
  })
})

describe('the acquire action', () => {
  it('is on every row without anyone hovering anything', async () => {
    await renderBrowse(fourBooks())
    expect(await screen.findAllByTestId('add-to-library')).toHaveLength(4)
  })

  it('forks through the existing endpoint and reports back', async () => {
    await renderBrowse(fourBooks())
    fireEvent.click((await screen.findAllByTestId('add-to-library'))[0])

    await waitFor(() => expect(publicContentService.forkBook).toHaveBeenCalledWith('b1'))
    expect((await screen.findAllByTestId('add-to-library'))[0]).toHaveTextContent('public.added')
  })

  it('does not open the row it sits in', async () => {
    await renderBrowse(fourBooks())
    fireEvent.click((await screen.findAllByTestId('add-to-library'))[0])

    await waitFor(() => expect(publicContentService.forkBook).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('still opens the row when the row itself is clicked', async () => {
    await renderBrowse(fourBooks())
    fireEvent.click((await screen.findAllByTestId('public-row'))[0])

    expect(mockNavigate).toHaveBeenCalledWith('/public/books/b1')
  })

  it('treats an already-owned item as success, not an error', async () => {
    publicContentService.forkBook.mockResolvedValue({ created: false, content: null })
    await renderBrowse(fourBooks())

    fireEvent.click((await screen.findAllByTestId('add-to-library'))[0])

    await waitFor(() => expect(screen.getAllByTestId('add-to-library')[0]).toHaveTextContent('public.added'))
  })

  it('goes back to resting when the fork fails', async () => {
    publicContentService.forkBook.mockRejectedValue(new Error('network'))
    await renderBrowse(fourBooks())

    fireEvent.click((await screen.findAllByTestId('add-to-library'))[0])

    await waitFor(() => expect(screen.getAllByTestId('add-to-library')[0]).toHaveTextContent('public.add'))
  })
})

describe('a thin result set', () => {
  it('stops pretending to be a table, and asks for a contribution instead', async () => {
    await renderBrowse([book()])

    expect(await screen.findByTestId('sparse-library')).toBeInTheDocument()
    expect(screen.queryByTestId('public-row')).not.toBeInTheDocument()
    expect(screen.getByText('public.sparse.title')).toBeInTheDocument()
  })

  it('sends the invitation where publishing actually happens', async () => {
    await renderBrowse([book()])

    fireEvent.click(await screen.findByText('public.sparse.cta'))
    expect(mockNavigate).toHaveBeenCalledWith('/books')
  })

  it('goes back to a list once there is enough to scan', async () => {
    await renderBrowse(fourBooks())

    expect(await screen.findAllByTestId('public-row')).toHaveLength(4)
    expect(screen.queryByTestId('sparse-library')).not.toBeInTheDocument()
  })

  it('leaves an empty result to the empty state, not to the invitation', async () => {
    await renderBrowse([])

    expect(await screen.findByText('public.noResults')).toBeInTheDocument()
    expect(screen.queryByTestId('sparse-library')).not.toBeInTheDocument()
    expect(screen.queryByText('public.sparse.title')).not.toBeInTheDocument()
  })
})

describe('the count', () => {
  it('rides on the tab that selects the set, and never says "1 results"', async () => {
    await renderBrowse(fourBooks())

    const tab = await screen.findByRole('tab', { name: /public\.books/ })
    await waitFor(() => expect(within(tab).getByText('4')).toBeInTheDocument())
    expect(screen.queryByText(/showingResults/)).not.toBeInTheDocument()
  })

  it('reports progress only while some of the set is still unloaded', async () => {
    await renderBrowse(fourBooks(), { total: 40 })

    expect(await screen.findByText(/public\.showingOf/)).toBeInTheDocument()
    expect(screen.getByText('public.loadMore')).toBeInTheDocument()
  })
})
