import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Input,
  Select,
  Option,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  IconButton,
  Skeleton,
  Avatar,
  Sheet,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem
} from '@mui/joy'
import {
  Search as SearchIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  CallSplit as ForkIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  MenuBook as MenuBookIcon,
  Add as AddIcon,
  Check as CheckIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  PublicRounded as PublicRoundedIcon
} from '@mui/icons-material'
import { focusRing, oneLine, segment, segmentedGroup, tabularNums, touchTarget } from '../components/Common/Form/formStyles'
import { tabClasses } from '@mui/joy/Tab'
import { publicContentService } from '../api/services'
import Book from '../components/Books/Book'

const CATEGORIES = [
  'science',
  'math',
  'languages',
  'history',
  'literature',
  'technology',
  'art',
  'music',
  'business',
  'health',
  'design',
  'programming',
  'technical',
  'documentation',
  'planning',
  'features',
  'deployment'
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'sortOptions.recent' },
  { value: 'popular', label: 'sortOptions.popular' },
  { value: 'most_liked', label: 'sortOptions.mostLiked' },
  { value: 'most_forked', label: 'sortOptions.mostForked' }
]

const PublicBrowse = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(0) // 0=Books, 1=Decks
  const [viewMode, setViewMode] = useState(localStorage.getItem('public_view_mode') || 'grid')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false) // Separate state for "load more"
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sort_by: 'recent',
    skip: 0,
    limit: 12
  })
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [deckCards, setDeckCards] = useState({}) // Store cards for each deck

  const handleViewChange = (newMode) => {
    setViewMode(newMode)
    localStorage.setItem('public_view_mode', newMode)
  }

  const fetchContent = useCallback(async () => {
    const isLoadingMore = filters.skip > 0

    if (isLoadingMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const service = activeTab === 0 ? publicContentService.browseBooks : publicContentService.browseDecks
      const result = await service(filters)

      // If skip > 0, we're loading more - append items
      // If skip === 0, we're doing a fresh search - replace items
      if (isLoadingMore) {
        setItems((prevItems) => [...prevItems, ...(result.items || [])])
      } else {
        setItems(result.items || [])
      }

      setTotal(result.total || 0)

      // If fetching decks, also fetch preview cards for each deck
      if (activeTab === 1 && result.items) {
        fetchDeckCards(result.items)
      }
    } catch (error) {
      console.error('Error fetching public content:', error)
      if (!isLoadingMore) {
        setItems([])
      }
    } finally {
      if (isLoadingMore) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [activeTab, filters])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const fetchDeckCards = async (decks) => {
    const cardsData = {}
    for (const deck of decks) {
      try {
        const data = await publicContentService.getPublicDeckCards(deck._id, 6)
        cardsData[deck._id] = data.cards || []
      } catch (error) {
        console.error(`Error fetching cards for deck ${deck._id}:`, error)
        cardsData[deck._id] = []
      }
    }
    setDeckCards(cardsData)
  }

  const handleSearch = (value) => {
    setFilters({ ...filters, search: value, skip: 0 })
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, skip: 0 })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      sort_by: 'recent',
      skip: 0,
      limit: 12
    })
  }

  const handleLoadMore = () => {
    // Update filters to load more items
    setFilters({ ...filters, skip: filters.skip + filters.limit })
  }

  // Publishing happens from the user's own library — there is no standalone
  // publish page — so the invitation sends them where the action lives.
  const handlePublish = () => {
    navigate(activeTab === 0 ? '/books' : '/study')
  }

  const handleItemClick = (item) => {
    const contentType = activeTab === 0 ? 'books' : 'decks'
    navigate(`/public/${contentType}/${item._id}`)
  }

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction='row' alignItems='center' sx={{ gap: 1.5, mb: 2 }}>
        <PublicRoundedIcon
          sx={{
            // Matched to the h3 font-size (the theme's xl2 token, 20->24px fluid)
            // rather than left larger: the glyph is a filled disc spanning 20 of
            // its 24 viewBox units, so at 28px it rendered 23.3px tall against a
            // 16.9px cap-height and read as a heavy blob.
            fontSize: 'xl2',
            color: 'text.secondary',
            opacity: 0.8
          }}
          aria-hidden='true'
        />
        <Typography
          level='h3'
          sx={{
            fontWeight: 'xl',
            // Explicit zero (not the Typography default) — LexicalEditor.css used to leak a
            // bare `h3 { margin }` rule onto this heading before its selectors were scoped to
            // `.editor-content`. Kept explicit as a guard against that class of regression.
            marginBlock: 0
          }}
        >
          {t('public.library')}
        </Typography>
      </Stack>

      {/* Tabs */}
      {/* `bgcolor: transparent` is load-bearing, not tidying. Joy paints Tabs
          with `background.surface`, and since LIB-004 moved the toolbar inside
          <Tabs> so the tabs precede the controls that act on them, that surface
          became a slab behind the whole toolbar — a container the design never
          asked for, and one that reads as a grouping that is not there.

          The tab strip is a RULE with a marker on it, not a row of filled
          boxes: Joy's selected Tab takes `background.level2`, which on this
          page collides with the meaning §15.1 gives that ground everywhere else
          (engaged), and would say the tab is a toggle like the ones below it. A
          2px primary underline says "you are here" without borrowing it. */}
      <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)} sx={{ bgcolor: 'transparent' }}>
        <TabList
          disableUnderline
          sx={{
            bgcolor: 'transparent',
            borderBottom: '1px solid',
            borderColor: 'divider',
            [`& .${tabClasses.root}`]: {
              bgcolor: 'transparent',
              borderRadius: 0,
              borderBottom: '2px solid transparent',
              mb: '-1px',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
              [`&.${tabClasses.selected}`]: {
                bgcolor: 'transparent',
                color: 'text.primary',
                fontWeight: 'lg',
                // `plainColor`, not `solidBg`: the generator derives solidBg
                // from the darkest variation of the user's accent, which on the
                // dark page ground is all but invisible (measured at
                // #153438 on #0d1117). `plainColor` is the one token corrected
                // for legibility against the page in BOTH schemes.
                borderBottomColor: 'primary.plainColor'
              }
            }
          }}
        >
          {/* The count belongs to the tab, not to a centred note under the
              list: the tab is what selects the set, so it is what should say
              how big the set is. Only the ACTIVE tab can carry one honestly —
              the browse endpoints return `total` for the set they were asked
              about, and fetching the other tab's count would be a second
              request for a number nobody has asked to see yet. */}
          <Tab>
            {t('public.books')}
            {activeTab === 0 && !loading && (
              <Typography level='body-xs' sx={{ ml: 0.75, color: 'text.tertiary', ...tabularNums }}>
                {total}
              </Typography>
            )}
          </Tab>
          <Tab>
            {t('public.decks')}
            {activeTab === 1 && !loading && (
              <Typography level='body-xs' sx={{ ml: 0.75, color: 'text.tertiary', ...tabularNums }}>
                {total}
              </Typography>
            )}
          </Tab>
        </TabList>

        {/* The controls act on the set the tabs select, so they sit BELOW the
            tabs. Shipped the other way round, the page asked you to sort and
            filter a set you had not chosen yet.

            Two segmented objects on the shared §15 grammar: sort and Filters
            are one (both narrow the list), the view toggle is another (it
            changes presentation, not content). Search stays a bare input —
            it is data entry, not a toggle. */}
        <Box sx={{ mt: 2.5, mb: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <Input
              placeholder={t('public.searchIn', { set: activeTab === 0 ? t('public.books') : t('public.decks') })}
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              startDecorator={<SearchIcon />}
              sx={{ flex: 1 }}
              size='md'
              slotProps={{ input: { 'aria-label': t('public.searchPlaceholder'), sx: focusRing } }}
            />

            <Stack direction='row' spacing={1.5}>
              <Sheet variant='outlined' sx={segmentedGroup}>
                <Dropdown>
                  <MenuButton
                    variant='plain'
                    color='neutral'
                    endDecorator={<KeyboardArrowDownIcon sx={{ fontSize: 'md', opacity: 0.65 }} />}
                    sx={segment(false, true)}
                  >
                    {t(`public.${(SORT_OPTIONS.find((o) => o.value === filters.sort_by) || SORT_OPTIONS[0]).label}`)}
                  </MenuButton>
                  <Menu placement='bottom-end' sx={{ minWidth: 190, borderRadius: 'md', p: 0.5 }}>
                    {SORT_OPTIONS.map((option) => (
                      <MenuItem
                        key={option.value}
                        role='menuitemradio'
                        aria-checked={filters.sort_by === option.value}
                        onClick={() => handleFilterChange('sort_by', option.value)}
                        sx={{ borderRadius: 'sm', ...focusRing }}
                      >
                        <Typography
                          level='body-sm'
                          sx={{
                            color: filters.sort_by === option.value ? 'text.primary' : 'text.secondary',
                            fontWeight: filters.sort_by === option.value ? 'lg' : 'md'
                          }}
                        >
                          {t(`public.${option.label}`)}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Menu>
                </Dropdown>

                <Button
                  variant='plain'
                  color='neutral'
                  onClick={() => setShowFilters(!showFilters)}
                  aria-pressed={showFilters}
                  startDecorator={<FilterIcon sx={{ fontSize: 'md' }} />}
                  sx={segment(showFilters, false)}
                >
                  {t('public.filterBy')}
                </Button>
              </Sheet>

              <Sheet variant='outlined' sx={segmentedGroup}>
                <IconButton
                  variant='plain'
                  color='neutral'
                  onClick={() => handleViewChange('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label={t('public.listView', { defaultValue: 'List view' })}
                  sx={{ ...segment(viewMode === 'list', true), minWidth: { xs: 44, sm: 40 } }}
                >
                  <ViewListIcon sx={{ fontSize: 'lg' }} />
                </IconButton>
                <IconButton
                  variant='plain'
                  color='neutral'
                  onClick={() => handleViewChange('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label={t('public.gridView', { defaultValue: 'Grid view' })}
                  sx={{ ...segment(viewMode === 'grid', false), minWidth: { xs: 44, sm: 40 } }}
                >
                  <GridViewIcon sx={{ fontSize: 'lg' }} />
                </IconButton>
              </Sheet>
            </Stack>
          </Stack>

          {/* Expandable Filters */}
          {showFilters && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.level1',
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography level='body-sm' sx={{ mb: 1, fontWeight: 600 }}>
                    {t('public.category')}
                  </Typography>
                  <Select
                    value={filters.category}
                    onChange={(e, value) => handleFilterChange('category', value)}
                    placeholder={t('public.all')}
                    size='sm'
                  >
                    <Option value=''>{t('public.all')}</Option>
                    {CATEGORIES.map((cat) => (
                      <Option key={cat} value={cat}>
                        {t(`public.categories.${cat}`)}
                      </Option>
                    ))}
                  </Select>
                </Box>

                <Button variant='plain' size='sm' startDecorator={<ClearIcon />} onClick={clearFilters} sx={{ alignSelf: 'flex-start' }}>
                  {t('public.clearFilters')}
                </Button>
              </Stack>
            </Box>
          )}
        </Box>

        <TabPanel value={0} sx={{ p: 0, pt: 3 }}>
          <ContentGrid
            items={items}
            loading={loading}
            onItemClick={handleItemClick}
            onPublish={handlePublish}
            contentType='book'
            viewMode={viewMode}
          />
        </TabPanel>

        <TabPanel value={1} sx={{ p: 0, pt: 3 }}>
          <ContentGrid
            items={items}
            loading={loading}
            onItemClick={handleItemClick}
            onPublish={handlePublish}
            contentType='deck'
            deckCards={deckCards}
            viewMode={viewMode}
          />
        </TabPanel>
      </Tabs>

      {/* Load more, and the only count that still earns its space.
          `public.showingResults` used to render here unconditionally and said
          "Showing 1 results" — it had no plural forms. Rather than give a
          redundant line better grammar, the line is gone: the tab above states
          the total, so a progress count is worth showing only while some of it
          is still unloaded, where it pairs with the button that loads it. */}
      {!loading && items.length > 0 && items.length < total && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2, ...tabularNums }}>
            {t('public.showingOf', { count: items.length, total })}
          </Typography>

          <Button variant='outlined' onClick={handleLoadMore} size='sm' loading={loadingMore} disabled={loadingMore}>
            {t('public.loadMore')}
          </Button>
        </Box>
      )}

      {/* Loading More Indicator */}
      {loadingMore && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('public.loadingMore')}
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography level='h4' sx={{ mb: 1 }}>
            {t('public.noResults')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('public.tryFilters')}
          </Typography>
        </Box>
      )}
    </Container>
  )
}

/**
 * How long a thing gets to be new. Long enough that a weekend publish is still
 * marked on Monday; short enough that the chip keeps meaning something.
 */
const NEW_WINDOW_DAYS = 30

/** Whole days since an ISO timestamp; Infinity when there isn't one. */
const daysSince = (iso) => {
  if (!iso) return Infinity
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Infinity
  return (Date.now() - then) / 86400000
}

/**
 * What a public item is allowed to claim about itself.
 *
 * The rule this exists to enforce (ADR-012): **a metric renders only above
 * zero.** A zero is not a small number, it is the absence of evidence, and the
 * shipped design rendered all three unconditionally — so on a young catalogue
 * every row led with `0 likes, 0 forks`, in the row's heaviest slot, as an
 * argument against the thing it was selling.
 *
 * Silence is the honest report for an item nobody has reacted to yet. An item
 * that is ALSO recent gets `isNew` instead, which is a reason to look rather
 * than a verdict — but only for a while, or the chip would be on everything and
 * would mean nothing.
 *
 * `"Other"` is treated as no category at all, because that is what it is: the
 * option people pick when none of the seventeen real ones fit. It does not earn
 * the row's second-strongest position.
 */
const evidenceFor = (item) => {
  const meta = item?.public_metadata || {}
  const views = Number(meta.views) || 0
  const likes = Number(meta.likes) || 0
  const forks = Number(meta.forks) || 0
  const raw = typeof meta.category === 'string' ? meta.category.trim() : ''
  const uncategorised = !raw || raw.toLowerCase() === 'other'

  return {
    views,
    likes,
    forks,
    showViews: views > 0,
    showLikes: likes > 0,
    showForks: forks > 0,
    category: raw,
    showCategory: !uncategorised,
    isNew: views === 0 && likes === 0 && forks === 0 && daysSince(item?.published_at || item?.created_at) <= NEW_WINDOW_DAYS
  }
}

/**
 * At or below this many visible results, the list stops being a list.
 *
 * A table with one row in it reads as a dead product rather than a young one:
 * a search bar, a sort menu, two tabs, a header and a footer count wrapped
 * around a single item is chrome outnumbering content roughly six to one. The
 * threshold is the VISIBLE count, not the catalogue size, so a filter that
 * narrows to two gets the same treatment as a library that only has two.
 */
const SPARSE_THRESHOLD = 3

/**
 * One item, shown properly: the cover at a size that can sell it, the
 * description the list view has no room for, and the same evidence rules and
 * acquire action every other surface uses.
 */
const FeatureCard = ({ item, contentType, onItemClick, t }) => {
  const isBook = contentType === 'book'
  return (
    <Card
      variant='outlined'
      onClick={() => onItemClick(item)}
      sx={{ p: 0, overflow: 'hidden', cursor: 'pointer', borderRadius: 'lg', '&:hover': { borderColor: 'primary.outlinedBorder' } }}
    >
      <Box
        sx={{
          height: 168,
          bgcolor: item.cover_color || item.color || 'primary.solidBg',
          backgroundImage: item.cover_image ? `url(${item.cover_image})` : item.image_url ? `url(${item.image_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {!item.cover_image && !item.image_url && (
          <MenuBookIcon sx={{ fontSize: 'xl4', color: 'common.white', opacity: 0.8 }} aria-hidden='true' />
        )}
      </Box>

      <CardContent sx={{ p: 2, gap: 1 }}>
        <Typography level='title-sm' sx={{ fontWeight: 'lg' }}>
          {isBook ? item.title : item.name}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {item.author_name || t('public.unknownAuthor')}
        </Typography>
        {item.description && (
          <Typography
            level='body-sm'
            sx={{
              color: 'text.tertiary',
              ...oneLine,
              whiteSpace: 'normal',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {item.description}
          </Typography>
        )}
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mt: 0.5, gap: 1, flexWrap: 'wrap' }}>
          <Evidence item={item} t={t} />
          <Box onClick={(event) => event.stopPropagation()}>
            <AddToLibrary item={item} contentType={contentType} t={t} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

/**
 * The other half of the sparse state, and the honest form of a growth loop: a
 * visitor who finds nothing to take is the best moment to ask them to give.
 * They already came looking, and declining costs them nothing.
 *
 * It routes to the user's own library, which is where publishing actually
 * happens — there is no standalone publish page to send them to.
 */
const PublishInvitation = ({ onPublish, t }) => (
  <Card
    variant='outlined'
    sx={{
      borderRadius: 'lg',
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 1.5,
      p: 3,
      bgcolor: 'background.level1'
    }}
  >
    <Typography level='title-sm' sx={{ fontWeight: 'lg' }}>
      {t('public.sparse.title')}
    </Typography>
    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
      {t('public.sparse.body')}
    </Typography>
    <Button variant='solid' color='primary' size='sm' onClick={onPublish} sx={{ borderRadius: 'md', ...touchTarget, ...focusRing }}>
      {t('public.sparse.cta')}
    </Button>
  </Card>
)

/**
 * Take a public item into your own library — the action this surface exists for
 * and has never had.
 *
 * **Always visible, never hover-revealed.** Hover does not exist on touch, and
 * hiding the conversion behind a pointer state hides the conversion (ADR-012).
 *
 * **Plain weight, on purpose.** A bordered button on every row is four
 * identical boxes marching down the page for what is, relative to the item, a
 * secondary element — the row itself is the primary target. The label and the
 * glyph name it; the ground arrives only on hover and press (§15.1). Pinned
 * `minWidth` so the right rule does not shift when "Add" becomes "Added".
 *
 * **Optimistic, with rollback,** exactly as `MarkToggle`: the label flips
 * first, and reverts if the request fails. No local toast — the API client's
 * interceptor already reports failures globally.
 *
 * `stopPropagation` because the row is itself a navigation target; without it
 * adding an item would also open it.
 *
 * KNOWN GAP (LIB-007): the browse endpoints do not say whether the viewer
 * already owns a fork, so "Added" is a confirmation of what just happened
 * rather than a persisted state, and it resets on reload. Pressing again is
 * harmless — `forkBook`/`forkDeck` are idempotent and answer an already-owned
 * item with `created: false` rather than an error, which is exactly why a
 * row-level button is safe here at all.
 */
const AddToLibrary = ({ item, contentType, t }) => {
  const id = item?._id || item?.id
  const [added, setAdded] = useState(false)
  const [pending, setPending] = useState(false)

  const handleAdd = useCallback(
    async (event) => {
      event.stopPropagation()
      if (!id || pending || added) return

      setAdded(true)
      setPending(true)
      try {
        const fork = contentType === 'book' ? publicContentService.forkBook : publicContentService.forkDeck
        // `created: false` means the user already owns it. That is a success:
        // the library ends up holding the thing, which is what was asked for.
        await fork(id)
      } catch (error) {
        setAdded(false)
      } finally {
        setPending(false)
      }
    },
    [id, pending, added, contentType]
  )

  if (!id) return null

  return (
    <Button
      size='sm'
      variant='plain'
      color={added ? 'primary' : 'neutral'}
      onClick={handleAdd}
      disabled={pending}
      data-testid='add-to-library'
      startDecorator={added ? <CheckIcon sx={{ fontSize: 'lg' }} /> : <AddIcon sx={{ fontSize: 'lg' }} />}
      sx={{
        borderRadius: 'md',
        // WCAG 2.5.5 at xs, relaxing for pointer devices; the label supplies
        // the width, so this is the height-only `touchTarget` case.
        minHeight: { xs: 44, sm: 36 },
        // Pinned so the right rule holds when the label changes length.
        minWidth: { xs: 92, sm: 96 },
        px: 1.5,
        fontWeight: 'lg',
        color: added ? 'primary.plainColor' : 'text.secondary',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
      }}
    >
      {added ? t('public.added') : t('public.add')}
    </Button>
  )
}

/**
 * The evidence cluster, shared by the list row and the grid card so the rules
 * above are applied in exactly one place.
 *
 * Deliberately monochrome. The shipped version painted likes `danger.solidBg`
 * and forks `success.solidBg` — two of the four colours ADR-010 reserves for
 * Again / Hard / Good / Easy. §15.5: a semantic colour that is load-bearing
 * anywhere cannot be borrowed for decoration.
 */
const Evidence = ({ item, t }) => {
  const e = evidenceFor(item)
  const metric = (Icon, value, label) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} aria-label={label}>
      <Icon sx={{ fontSize: 'md', color: 'text.tertiary' }} aria-hidden='true' />
      <Typography level='body-sm' sx={{ color: 'text.secondary', ...tabularNums }}>
        {value}
      </Typography>
    </Box>
  )

  return (
    <Stack direction='row' spacing={1.5} alignItems='center' sx={{ flexWrap: 'wrap', gap: 1 }}>
      {e.showLikes && metric(FavoriteIcon, e.likes, t('public.likes'))}
      {e.showForks && metric(ForkIcon, e.forks, t('public.forks'))}
      {e.showViews && !e.showLikes && !e.showForks && metric(ViewIcon, e.views, t('public.views'))}

      {e.isNew && (
        <Chip size='sm' variant='soft' color='neutral' sx={{ borderRadius: 'sm', fontWeight: 'lg' }}>
          {t('public.newBadge')}
        </Chip>
      )}

      {e.showCategory && (
        <Chip size='sm' variant='soft' color='neutral' sx={{ borderRadius: 'sm' }}>
          {t(`public.categories.${e.category.toLowerCase()}`, {
            defaultValue: e.category.charAt(0).toUpperCase() + e.category.slice(1)
          })}
        </Chip>
      )}
    </Stack>
  )
}

// ContentGrid Component
const ContentGrid = ({ items, loading, onItemClick, onPublish, contentType, deckCards = {}, viewMode = 'grid' }) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[...Array(6)].map((_, i) => (
          <Grid xs={12} sm={6} md={4} lg={3} key={i}>
            <Skeleton variant='rectangular' height={viewMode === 'grid' ? 340 : 80} sx={{ borderRadius: 'md' }} />
          </Grid>
        ))}
      </Grid>
    )
  }

  const isBook = contentType === 'book'

  // GRID VIEW
  // A thin result set stops pretending to be a table (LIB-005). This runs
  // BEFORE the view-mode branch on purpose: at two or three items, list vs grid
  // is not a meaningful choice, and the sparse layout is the better answer to
  // both. The empty case is handled by the caller's `public.noResults`.
  if (items.length > 0 && items.length <= SPARSE_THRESHOLD) {
    return (
      <Box
        data-testid='sparse-library'
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
          gap: { xs: 2, md: 3 }
        }}
      >
        {items.map((item) => (
          <FeatureCard key={item._id} item={item} contentType={contentType} onItemClick={onItemClick} t={t} />
        ))}
        {onPublish && <PublishInvitation onPublish={onPublish} t={t} />}
      </Box>
    )
  }

  if (viewMode === 'grid') {
    return (
      <Grid container spacing={2} sx={{ justifyContent: { xs: 'center', sm: 'flex-start' } }}>
        {items.map((item) => (
          <Grid key={item._id} xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            {isBook ? (
              // Reuse Book.js component for consistency. It is the same card the
              // user's own library renders, so it knows nothing about public
              // metadata — the evidence and the acquire action are added
              // underneath rather than pushed into a component shared with a
              // surface that has neither.
              <Box sx={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Book
                  book={{
                    ...item,
                    author: item.author_name // Map author_name to author for Book component
                  }}
                  handleBookClick={onItemClick}
                />
                <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ gap: 1, flexWrap: 'wrap' }}>
                  <Evidence item={item} t={t} />
                  <Box onClick={(event) => event.stopPropagation()}>
                    <AddToLibrary item={item} contentType={contentType} t={t} />
                  </Box>
                </Stack>
              </Box>
            ) : (
              // ✨ PREMIUM DECK DESIGN - Shows actual card previews
              <Card
                variant='outlined'
                sx={{
                  width: '100%',
                  maxWidth: 280,
                  height: 340,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  position: 'relative',
                  bgcolor: 'background.surface',
                  borderRadius: 'md',
                  '&:hover': {
                    borderColor: 'primary.outlinedBorder',
                    transform: 'translateY(-8px)',
                    boxShadow: 'lg'
                  }
                }}
                onClick={() => onItemClick(item)}
              >
                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Deck Cover Preview - TOP */}
                  <Box
                    sx={{
                      height: 160,
                      mb: 2,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {deckCards[item._id] && deckCards[item._id].length > 0 ? (
                      // Show deck cover with card count badge
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          background: item.image_url
                            ? 'none'
                            : item.cover_color ||
                              item.color ||
                              'linear-gradient(135deg, var(--joy-palette-primary-solidBg) 0%, var(--joy-palette-primary-900) 100%)',
                          borderRadius: 'sm',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: item.image_url ? 'none' : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.2) 100%)'
                          }
                        }}
                      >
                        {item.image_url ? (
                          <Box
                            component='img'
                            src={item.image_url}
                            alt={item.name || item.title}
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 'sm'
                            }}
                          />
                        ) : (
                          <>
                            <Typography level='h1' sx={{ fontSize: '4rem', opacity: 0.9, color: 'common.white', zIndex: 1, mb: 1 }}>
                              🎴
                            </Typography>
                            <Chip
                              variant='solid'
                              size='lg'
                              sx={{
                                bgcolor: 'background.surface',
                                color: item.cover_color || item.color || 'primary.solidBg',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                zIndex: 1
                              }}
                            >
                              {deckCards[item._id].length} {t('public.cards')}
                            </Chip>
                          </>
                        )}
                      </Box>
                    ) : (
                      // Fallback: Elegant placeholder
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: 'background.level1',
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 'sm',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Typography level='h3' sx={{ opacity: 0.3 }}>
                          🎴
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Deck Info - BOTTOM */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      {/* Deck name */}
                      <Typography
                        level='title-md'
                        sx={{
                          fontWeight: 700,
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          color: 'text.primary',
                          letterSpacing: '-0.01em',
                          bgcolor: 'transparent'
                        }}
                      >
                        {item.name}
                      </Typography>

                      {/* Author */}
                      {item.author_name && (
                        <Typography
                          level='body-xs'
                          sx={{
                            color: 'text.tertiary',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            mb: 1,
                            letterSpacing: '0.05em',
                            bgcolor: 'transparent'
                          }}
                        >
                          {t('public.byAuthor', { name: item.author_name })}
                        </Typography>
                      )}

                      {item.description && (
                        <Typography
                          level='body-xs'
                          sx={{
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mb: 1,
                            lineHeight: 1.4,
                            bgcolor: 'transparent'
                          }}
                        >
                          {item.description}
                        </Typography>
                      )}

                      {/* Card count badge */}
                      <Stack direction='row' spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          size='sm'
                          variant='soft'
                          color='primary'
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem'
                          }}
                        >
                          {item.total_cards || 0} {t('public.cards', { defaultValue: 'cards' })}
                        </Chip>
                        {item?.forked_from && (
                          <Chip
                            size='sm'
                            variant='soft'
                            color='neutral'
                            startDecorator={<ForkIcon sx={{ fontSize: 11 }} />}
                            sx={{ height: 'auto', py: 0.25 }}
                          >
                            {t('public.forkBadge')}
                          </Chip>
                        )}
                      </Stack>
                    </Box>

                    {/* Evidence and the acquire action, on the same rules the
                        list row uses — one implementation, so the two views can
                        never disagree about when a metric is worth showing. */}
                    <Stack
                      direction='row'
                      alignItems='center'
                      justifyContent='space-between'
                      spacing={1}
                      sx={{ mt: 1.5, gap: 1, flexWrap: 'wrap' }}
                    >
                      <Evidence item={item} t={t} />
                      <Box onClick={(event) => event.stopPropagation()}>
                        <AddToLibrary item={item} contentType={contentType} t={t} />
                      </Box>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>
    )
  }

  // LIST VIEW
  //
  // Four columns on fixed rules — cover, identity, evidence, action — and only
  // the identity column flexes, so a long title absorbs the slack instead of
  // leaving a hole in the middle of the row (§15.4). The shipped version was
  // flex-based with a `minWidth: 200` stats block, which on a wide screen left
  // roughly 900px of nothing between the author and the first number.
  return (
    <Stack spacing={0}>
      {items.map((item) => (
        <Box
          key={item._id}
          onClick={() => onItemClick(item)}
          data-testid='public-row'
          sx={{
            display: 'grid',
            alignItems: 'center',
            columnGap: { xs: 1.5, md: 2.5 },
            rowGap: 1,
            gridTemplateColumns: { xs: 'auto 1fr auto', md: 'auto 1fr auto auto' },
            gridTemplateAreas: {
              xs: '"cover identity action" "cover evidence evidence"',
              md: '"cover identity evidence action"'
            },
            py: 1.5,
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'background 140ms ease',
            '&:hover': { bgcolor: 'background.level1' }
          }}
        >
          <Box
            sx={{
              gridArea: 'cover',
              width: { xs: 46, md: 52 },
              height: isBook ? { xs: 62, md: 70 } : { xs: 46, md: 52 },
              borderRadius: 'sm',
              overflow: 'hidden',
              flexShrink: 0,
              bgcolor: item.cover_color || item.color || 'primary.solidBg',
              backgroundImage: item.cover_image ? `url(${item.cover_image})` : item.image_url ? `url(${item.image_url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {!item.cover_image && <MenuBookIcon sx={{ fontSize: 'lg', color: 'common.white', opacity: 0.8 }} aria-hidden='true' />}
          </Box>

          <Box sx={{ gridArea: 'identity', minWidth: 0 }}>
            <Stack direction='row' spacing={0.75} alignItems='center' sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Typography level='title-sm' sx={{ fontWeight: 'lg' }} noWrap>
                {isBook ? item.title : item.name}
              </Typography>
              {item?.forked_from && (
                <Chip
                  size='sm'
                  variant='soft'
                  color='neutral'
                  startDecorator={<ForkIcon sx={{ fontSize: 'sm' }} />}
                  sx={{ borderRadius: 'sm' }}
                >
                  {t('public.forkBadge')}
                </Chip>
              )}
            </Stack>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }} noWrap>
              {item.author_name || t('public.unknownAuthor')}
            </Typography>
          </Box>

          {/* Often empty, by design — see `evidenceFor`. */}
          <Box sx={{ gridArea: 'evidence', justifySelf: { xs: 'start', md: 'end' } }}>
            <Evidence item={item} t={t} />
          </Box>

          <Box sx={{ gridArea: 'action', justifySelf: 'end' }} onClick={(event) => event.stopPropagation()}>
            <AddToLibrary item={item} contentType={contentType} t={t} />
          </Box>
        </Box>
      ))}
    </Stack>
  )
}

export default PublicBrowse
