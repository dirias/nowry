# Nowry Design and UI/UX Guidelines

## 1. Core Philosophy: "Refined Minimalism"
*   **Less is More:** Every element must have a purpose. Remove redundant labels, borders, or containers that do not add functionality.
*   **Content-First:** The UI should recede, allowing the user's content (books, notes, profile) to be the focal point.
*   **Sophisticated Simplicity:** Simple does not mean plain. Use subtle shadows, smooth transitions, and perfect alignment to achieve a "premium" feel.

---

## 2. Color System & Theming
*   **Theme-Driven:** NEVER hardcode hex values (e.g., `#ffffff`, `#000000`) in components.
*   **No Hardcoded Shade Tokens:** Do NOT use numeric palette shades like `neutral.600`, `primary.50`, `success.400` directly in `sx` props. These break dark mode because they always resolve to specific light-mode values.
    *   *Incorrect:* `color: 'neutral.600'`, `bgcolor: 'primary.50'`, `color: 'success.solidBg'` on body text, `backgroundColor: 'white'`
    *   *Correct:* Use **semantic** tokens that adapt automatically — see table below.
*   **Usage:** Use the application's design tokens or CSS variables.
*   **Mode Compatibility:** All designs MUST work seamlessly in both **Dark** and **Light** modes.
    *   Use usage-based tokens (e.g., `neutral.softBg`) that automatically adjust per mode.
*   **Detailed Documentation:** Refer to [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md) for deeper insights into the dynamic color generation algorithm and full palette tokens.
*   **Palette:**
    *   **Primary:** Used sparingly for main actions (CTAs).
    *   **Neutral:** Used for structural elements, borders, and secondary text.
    *   **Danger:** Reserved strictly for destructive actions (Delete).

### 2.1 Semantic Color Token Quick Reference

Always prefer the **right column** tokens — they adapt automatically to light/dark mode:

| Use Case | ❌ Avoid (shade token) | ✅ Use (semantic token) |
|---|---|---|
| Body / secondary text | `neutral.600`, `neutral.500` | `text.secondary` |
| Hint / caption text | `neutral.400` | `text.tertiary` |
| Heading / primary text | `neutral.800` | `text.primary` |
| Inline link / accent text | `primary.solidBg` on text | `primary.plainColor` |
| Soft container background | `primary.50`, `neutral.50` | `primary.softBg`, `background.level1` |
| Card / surface background | `white`, `#fff` | `background.surface` |
| Subtle lifted background | `neutral.100` | `background.level1` |
| Success text | `success.solidBg` on text | `success.plainColor` |
| Warning text | `warning.600` | `warning.plainColor` |
| Border / divider | `neutral.300` | `divider` |
| Interactive border | `neutral.400` | `neutral.outlinedBorder` |
| Active/focus border | `primary.600` | `primary.outlinedBorder` |

---

## 3. Layout & Spacing
*   **Grid System:** align elements to a 4px/8px baseline grid.
*   **Consistency:**
    *   Standard padding/margins: `1` (8px), `2` (16px), `3` (24px).
    *   Avoid magic numbers (e.g., `margin: 13px`).
*   **Whitespace:** Embrace negative space. It creates breathing room and groups related content visually without needing borders.
*   **Responsiveness (Mandatory):**
    *   **Universal Compatibility:** ALL pages and components MUST function seamlessly on all device sizes (Mobile, Tablet, Desktop).
    *   **Mobile-First approach.**
    *   Use responsive props: `sx={{ flexDirection: { xs: 'column', md: 'row' } }}`.
*   **Page Structure:**
    *   **Main Container:** Wrap all page content in a Joy UI `<Container>`.
    *   **Width Standard:**
        *   **Dashboards / Main Views:** Use `maxWidth='xl'` for immersive, full-width experiences (e.g., Home, Annual Planner, Study Center).
        *   **Forms / Settings:** Use `maxWidth='lg'` or `md` to maintain readability on wide screens.
    *   **Padding:** Default vertical padding is `py: 4` (32px).
    *   *Implementation:* `<Container maxWidth='xl' sx={{ py: 4 }}>`

---

## 4. Typography

### 4.1 Semantic Level Usage Table

Always use the appropriate Joy UI level for the context — never override `fontSize` when the right level exists:

| Level | Size | Weight | Use Case |
|---|---|---|---|
| `h1` | 2rem+ | 700 | Page hero title only |
| `h2` | 1.75rem | 700 | Top section heading |
| `h3` | 1.5rem | 700 | Sub-section heading, modal complete screen |
| `h4` | 1.25rem | 700 | Card heading, dialog heading |
| `title-lg` | 1.125rem | 600 | Modal title, panel header |
| `title-md` | 1rem | 600 | Card title, section heading, list item heading |
| `title-sm` | 0.875rem | 600 | Sub-items, compact card title |
| `body-lg` | 1rem | 400 | Long-form reading text |
| `body-md` | 0.875rem | 400 | Standard body copy |
| `body-sm` | 0.75rem | 400 | Secondary info, field labels |
| `body-xs` | 0.625rem | 400 | Captions, micro-labels, timestamps |

> **Rule of thumb:** Empty state heading → `title-md`. Empty state body → `body-sm` + `color: 'text.tertiary'`. Section header → `h3`/`h4`. Card header → `title-md`/`title-lg`.

### 4.2 Typography Hierarchy
*   *Headings:* Bold/Semi-bold, short, and punchy.
*   *Body:* Readable contrast — NOT pure black (`text.secondary` is often better for detail text).
*   **Text Backgrounds:**
    *   **NEVER apply `backgroundColor` directly to text elements** (Typography, heading tags, span, etc.).
    *   *Incorrect:* `<Typography sx={{ backgroundColor: 'primary.main' }}>Text</Typography>`
    *   *Correct:* `<Box sx={{ bgcolor: 'primary.softBg' }}><Typography>Text</Typography></Box>`
    *   **Exception:** Highlight/mark on inline `<mark>` elements is acceptable, sparingly.

### 4.3 Internationalization (i18n)
*   **Universal Support:** The entire application MUST be fully multilingual. No user-facing text should ever be hardcoded — this includes **tooltips**, **placeholders**, **ARIA labels**, and **error messages**.
*   *Correct:* `{t('books.create')}`
*   *Incorrect:* `Create Book`
*   Account for variable text lengths in different languages (avoid fixed-width text containers).

### 4.4 Capitalization Standards
*   **Sentence case** (most UI text):
    *   **When to use:** Body text, descriptions, helper text, error messages, empty states, notifications, placeholder text, form field labels
    *   **Examples:** "No articles found", "Deck name", "Try adjusting your filters"
*   **Title Case:**
    *   **When to use:** Page titles, section headings, primary navigation, major button labels
    *   **Examples:** "Account Settings", "Study Center", "Create New Account"
*   **ALL CAPS:**
    *   **When to use:** Only UI badges/abbreviations ("NEW", "BETA", "API")
    *   ❌ **NEVER for form labels** — using `textTransform: 'uppercase'` on `<FormLabel>` or helper `<Typography>` is forbidden. Sentence case always.
    *   ```javascript
        // ❌ Forbidden
        <Typography textTransform='uppercase'>DECK NAME</Typography>
        
        // ✅ Correct
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>Deck name</Typography>
        ```
    *   **Quick Reference:**
        ```
        ✅ Sentence case: empty states, form labels, helper text, placeholders, descriptions
        ✅ Title Case: page titles, nav items, major buttons
        ✅ ALL CAPS (sparingly): "NEW" badge, "API KEY" technical label
        ❌ NEVER ALL CAPS: form field labels, body copy, error messages
        ```

---

## 5. Component Design
*   **Sizing:** Avoid "Mega-components" that take up too much screen real estate unrelated to their value. Compact is generally better for lists.
*   **Cards & Surfaces:**
    *   Use flat or subtle borders (`variant="outlined"`) for a clean look.
    *   Elevate (`boxShadow: 'md'`) only on user interaction (Hover) to indicate clickability.
*   **Icons:**
    *   Use simple, outlined, or consistent filled icons.
    *   Icons should always have a purpose and accessible label if standalone.
    *   **Text on Media:** When standardizing text over images or gradients:
        *   Text MUST have a `transparent` background.
        *   Ensure high contrast (e.g., White text with text-shadow on dark gradient).
        *   Never allow default background colors to block the underlying image.
*   **Custom Interactive Components:**
    *   **Principle:** When Joy UI components don't provide sufficient control over dynamic styling (especially with user-defined colors), build custom components using `Box` primitives.
    *   **Checkboxes with Dynamic Colors:**
        *   **Problem:** Joy UI's `Checkbox` component has complex internal styling that makes it difficult to apply dynamic user-preference colors reliably.
        *   **Solution:** Build custom checkboxes using `Box` components with direct CSS control.
        *   **Implementation Pattern:**
            ```javascript
            <Box
              onClick={handleToggle}
              sx={{ cursor: 'pointer' }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  border: `2px solid ${dynamicColor}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isChecked ? dynamicColor : 'transparent',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                {isChecked && (
                  <Box
                    component='svg'
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='white'
                    strokeWidth='3'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </Box>
                )}
              </Box>
            </Box>
            ```
        *   **Benefits:**
            - Direct control over all styling
            - Dynamic colors apply reliably (e.g., `area?.color || '#ef4444'`)
            - Works consistently in dark/light themes
            - No dependency on Joy UI's internal CSS variables
            - Production-stable with no workarounds
        *   **When to Use:** Whenever you need checkboxes, radio buttons, or toggles with user-defined colors (e.g., focus areas, priority tags, custom themes).

*   **Collapsible Read-Only Sections:**
    *   **Purpose:** Display related items (like goals, milestones, or subtasks) in a collapsible section within cards, without edit capabilities, to save space while providing access to detailed information.
    *   **Minimalism Principle:** **Only render the section if items exist** - don't show empty sections or "0" counts. Progressive disclosure applies here too.
    *   **UI Pattern:**
        *   **Trigger:** A `Button` (variant `plain`, size `sm`) with text label showing count and an expand/collapse icon.
        *   **Content:** A `Stack` containing individual items, each with a color dot (matching parent entity color) and text.
        *   **Styling:** Transparent backgrounds, minimal spacing, use color dots (not checkboxes) for visual markers.
    *   **Implementation Pattern:**
        ```javascript
        // State management
        const [expandedItems, setExpandedItems] = useState(new Set())
        const [itemDetails, setItemDetails] = useState({}) // Cache: { itemId: [details] }

        // In fetchData, populate cache immediately
        const details = await Promise.all(items.map((item) => fetchDetails(item._id)))
        const detailsCache = {}
        items.forEach((item, index) => {
          detailsCache[item._id] = details[index] || []
        })
        setItemDetails(detailsCache)

        const handleToggle = (itemId) => {
          const newExpanded = new Set(expandedItems)
          if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId)
          } else {
            newExpanded.add(itemId)
          }
          setExpandedItems(newExpanded)
        }

        // UI - Only render if items exist
        {itemDetails[itemId] && itemDetails[itemId].length > 0 && (
          <Box sx={{ mt: 1.5, bgcolor: 'transparent' }}>
            <Divider sx={{ my: 1 }} />
            <Button
              variant='plain'
              size='sm'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation() // Important: prevent parent click handlers
                handleToggle(itemId)
              }}
              endDecorator={expandedItems.has(itemId) ? <CollapseIcon /> : <ExpandIcon />}
              sx={{
                width: '100%',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'text.secondary',
                bgcolor: 'transparent',
                '&:hover': { bgcolor: 'transparent', opacity: 0.8 }
              }}
            >
              {t('label')} ({itemDetails[itemId].length})
            </Button>

            {expandedItems.has(itemId) && (
              <Stack spacing={0.5} sx={{ mt: 1, pl: 0.5, bgcolor: 'transparent' }}>
                {itemDetails[itemId].map((detail) => (
                  <Box
                    key={detail._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5,
                      px: 1,
                      borderRadius: 'sm',
                      bgcolor: 'transparent'
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: dynamicColor || 'primary.solidBg',
                        flexShrink: 0
                      }}
                    />
                    <Typography
                      level='body-xs'
                      sx={{
                        flex: 1,
                        fontSize: '0.75rem',
                        backgroundColor: 'transparent',
                        color: 'text.primary'
                      }}
                    >
                      {detail.title}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}
        ```
    *   **Key Principles:**
        - **Hide When Empty:** Do NOT render the section at all if there are no items. No "Goals (0)" buttons.
        - **Prevent Event Bubbling:** Use `e.stopPropagation()` in addition to `e.preventDefault()` to prevent parent handlers (especially if inside a clickable card/link).
        - **Eager Loading:** Fetch all data on initial page load and populate cache immediately (avoids loading states and provides instant expand).
        - **No Empty States:** Since section is hidden when empty, no need for "No items yet" messages.
        - **Transparent Backgrounds:** Ensure all containers and text have `bgcolor: 'transparent'` or `backgroundColor: 'transparent'`.
        - **Dynamic Colors:** Use entity colors (e.g., `area.color`, `priority.color`) for dots to maintain visual hierarchy.
    *   **When to Use:** Dashboard cards showing aggregated entities (e.g., focus areas with goals, projects with tasks, books with chapters) **when those entities actually exist**.

*   **Ultra-Compact Components (Dashboard Stats & Metrics):**
    *   **Philosophy:** Dashboard overview components (stat cards, metric tiles) should be **information-dense yet scannable**. Every pixel must earn its place.
    *   **When to Use:**
        - Dashboard stat cards (counts, percentages, streaks)
        - Metric tiles showing single key numbers
        - Overview panels that need to show multiple stats in limited space
        - Mobile views where vertical space is premium
    *   **Padding Guidelines:**
        ```javascript
        // ✅ Ultra-compact pattern
        sx={{
          py: { xs: 1, md: 1.25 },      // 8-10px vertical (minimal)
          px: { xs: 0.5, md: 1 },        // 4-8px horizontal (tight)
          gap: 0.5                        // 4px between elements
        }}
        
        // ❌ Avoid excessive padding
        sx={{
          p: { xs: 2, md: 3 },           // 16-24px (too spacious for stats)
          gap: 2                          // 16px (too much breathing room)
        }}
        ```
    *   **Typography Scaling:**
        - **Number (Hero):** `{ xs: '1.5rem', md: '2rem' }` (24-32px) — Large but not oversized
        - **Label:** `0.625rem` (10px) at 70% opacity — Whisper-quiet, de-emphasized
        - **Line Height:** `lineHeight: 1` for numbers (tight, compact)
    *   **Icon Treatment:**
        - **Size:** 16px (small, not dominant)
        - **Opacity:** 50% (subtle hint, not focal point)
        - **Color:** `text.secondary` (neutral, context-aware)
        - **Optional:** Icons can be removed entirely for even more minimalism
    *   **Label Approach:**
        - **Ultra-short:** 1 word maximum (e.g., "Due", "Total", "Streak")
        - **No redundancy:** Remove contextual words (e.g., "Today", "Cards") if implied
        - **Low visual weight:** Small size + low opacity = whisper-quiet
        - **Purpose:** Context hint only, NOT the primary information
    *   **Spacing Between Cards:**
        ```javascript
        <Grid container spacing={{ xs: 1, md: 1 }}>  // 8px gap (tight)
        ```
    *   **Border Treatment:**
        - **Default:** `border: '1px solid'`, `borderColor: 'divider'` (subtle, neutral)
        - **Avoid:** Colored borders (primary, success, danger) unless interacting
        - **Hover:** Change `borderColor` only, no heavy shadows or transforms
    *   **Background:**
        - **Default:** `bgcolor: 'background.surface'` or `transparent`
        - **Hover:** `bgcolor: 'background.level1'` (subtle lift)
        - **Avoid:** Colored backgrounds that add visual noise
    *   **Complete Example:**
        ```javascript
        <Grid container spacing={{ xs: 1, md: 1 }} sx={{ mb: 2 }}>
          <Grid xs={3}>
            <Box
              sx={{
                py: { xs: 1, md: 1.25 },
                px: { xs: 0.5, md: 1 },
                borderRadius: 'sm',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: 'background.surface',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.outlinedBorder',
                  bgcolor: 'background.level1'
                }
              }}
            >
              {/* Icon: Small, subtle, optional */}
              <TrendingUp sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.5 }} />
              
              {/* Number: Hero element */}
              <Typography
                level='h2'
                sx={{ 
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 700,
                  lineHeight: 1
                }}
              >
                {stats.dueToday}
              </Typography>
              
              {/* Label: Whisper-quiet context */}
              <Typography 
                level='body-xs' 
                sx={{ 
                  fontSize: '0.625rem', 
                  opacity: 0.7,
                  color: 'text.tertiary'
                }}
              >
                {t('study.stats.dueToday')} {/* Translation: "Due" */}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        ```
    *   **Anti-Patterns:**
        - ❌ Large padding (`p: 3` or more) — wastes space
        - ❌ Multi-word labels ("Due Today", "Cards Reviewed") — redundant
        - ❌ Large icons (24px+) — competes with number
        - ❌ High opacity labels (90%+) — too prominent
        - ❌ Colored borders by default — visual noise
        - ❌ Heavy box shadows — not minimal
        - ❌ Large spacing between cards (`spacing: 2+`) — inefficient
        *   **Benefits:**
        - **50% less vertical space** — More content visible without scrolling
        - **Faster scanning** — Numbers immediately jump out
        - **True minimalism** — Every element justified
        - **Professional aesthetic** — Modern, clean dashboard look
        - **Mobile-friendly** — Works well on small screens
    *   **Guideline Compliance:**
        - Section 1: "Less is More" — Minimal padding, no redundant elements
        - Section 3: "Whitespace" — Strategic use, not excessive
        - Section 12: "Ultra-concise messaging" — 1-word labels
        - Section 11: "Dashboard Overview" — Information-dense, scannable

---

## 6. List & Grid View Systems (Dual-View Pattern)

### 6.1 Philosophy: Adaptive Information Density
*   **User Control:** Every list of items (books, decks, goals, tasks, etc.) MUST provide users with **at least two distinct viewing modes** to accommodate different usage contexts and preferences.
*   **Context-Driven:** Dense data work requires compact list views; visual browsing benefits from spacious grid layouts.
*   **Professional Standard:** Following industry best practices (Notion, Airtable, Apple Finder, Google Drive), modern applications empower users to choose their optimal information density.

### 6.2 Required View Modes

#### **Mode 1: Grid View (Visual Browse)**
*   **Purpose:** Visual discovery, browsing, selection based on aesthetics or imagery.
*   **Layout:**
    *   2-column responsive grid on mobile (`Grid xs={6}`)
    *   3-4 column grid on tablet/desktop (`Grid sm={6} md={4} lg={3}`)
    *   Maximum card height: **30% of card width** (approximate 3:10 aspect ratio)
*   **Card Design:**
    *   **Compact but breathable:** Balance between information and whitespace
    *   **Visual hierarchy:** Image/icon → Title → Metadata (author, date, tags)
    *   **Hover elevation:** Subtle shadow lift on hover to indicate interactivity
    *   **Height constraint:** Use `maxHeight` or `aspectRatio` to prevent tall cards
    *   **Example dimensions:** 
        ```javascript
        sx={{
          width: '100%',
          maxHeight: { xs: 140, sm: 160, md: 180 },
          aspectRatio: '10 / 3',
          overflow: 'hidden'
        }}
        ```
*   **Content Priority:**
    1. Visual identifier (cover, icon, color)
    2. Title (1-2 lines, truncated)
    3. Key metadata (1-2 chips/badges max)
    4. Secondary info (author, date) — subtle, small text
*   **Anti-Patterns:**
    *   ❌ Tall cards that waste vertical space
    *   ❌ Excessive metadata crowding the card
    *   ❌ No visual identifier (text-only cards)
    *   ❌ Inconsistent card heights in same row

#### **Mode 2: List View (Data Table)**
*   **Purpose:** Efficient scanning, sorting, filtering, bulk operations, metadata comparison.
*   **Layout:**
    *   Single-column table/list structure
    *   Row-based design with columns for different data points
    *   Fixed row height (e.g., 48-56px) for consistent scanning
    *   Responsive: Hide non-critical columns on mobile
*   **Structure:**
    *   **Left:** Primary identifier (icon/thumbnail + title)
    *   **Center:** Metadata columns (author, category, date, tags, etc.)
    *   **Right:** Actions (edit, delete, more options)
*   **Design Principles:**
    *   **Minimalist dividers:** Use subtle borders or background alternation, not heavy lines
    *   **Consistent spacing:** Uniform padding across all rows/columns
    *   **Sortable headers:** Allow sorting by any column (if applicable)
    *   **Hover highlight:** Subtle background change on row hover
    *   **Mobile adaptation:** Stack metadata vertically or hide secondary info
*   **Typography:**
    *   **Title:** `body-md` or `title-sm`, 600 weight
    *   **Metadata:** `body-xs`, 400 weight, `text.secondary` color
    *   **Alignment:** Left for text, right for numbers, center for icons
*   **Example Implementation:**
    ```javascript
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'background.level1'
        }
      }}
    >
      {/* Icon/Thumbnail */}
      <Avatar size='sm' src={item.image} />
      
      {/* Title */}
      <Typography level='title-sm' sx={{ flex: 1, minWidth: 0 }}>
        {item.title}
      </Typography>
      
      {/* Metadata (hide on mobile) */}
      <Typography level='body-xs' sx={{ display: { xs: 'none', md: 'block' }, width: 120 }}>
        {item.author}
      </Typography>
      
      <Typography level='body-xs' sx={{ display: { xs: 'none', md: 'block' }, width: 100 }}>
        {item.date}
      </Typography>
      
      {/* Actions */}
      <IconButton size='sm' variant='plain'>
        <MoreIcon />
      </IconButton>
    </Box>
    ```
*   **Anti-Patterns:**
    *   ❌ Variable row heights (breaks scanning rhythm)
    *   ❌ Overwhelming metadata (too many columns)
    *   ❌ No hover state (appears static)
    *   ❌ Mobile table overflow (horizontal scroll hell)

### 6.3 View Toggle Control

#### **Placement & Design:**
*   **Location:** Top-right corner of the content area, aligned with filters/search
*   **Component:** Toggle button group or segmented control
*   **Icons:** 
    *   Grid view: `GridViewIcon` or `AppsIcon`
    *   List view: `ListIcon` or `ViewListIcon`
*   **Active State:** Filled icon or underline (consistent with Section 6 — Interaction)
*   **Persistence:** Save user preference in localStorage (`view_mode: 'grid' | 'list'`)

#### **Implementation Pattern:**
```javascript
const [viewMode, setViewMode] = useState(
  localStorage.getItem('content_view_mode') || 'grid'
)

const handleViewChange = (newMode) => {
  setViewMode(newMode)
  localStorage.setItem('content_view_mode', newMode)
}

// UI
<Stack direction='row' spacing={0.5} sx={{ ml: 'auto' }}>
  <IconButton
    size='sm'
    variant={viewMode === 'grid' ? 'solid' : 'plain'}
    onClick={() => handleViewChange('grid')}
  >
    <GridViewIcon />
  </IconButton>
  <IconButton
    size='sm'
    variant={viewMode === 'list' ? 'solid' : 'plain'}
    onClick={() => handleViewChange('list')}
  >
    <ListIcon />
  </IconButton>
</Stack>
```

### 6.4 Integrated Filter & Search Bar

#### **Philosophy:**
*   **Discoverability over Filtering:** Users should find content effortlessly without complex filter UIs.
*   **Minimalist First:** Start with a simple search input. Add filters progressively if needed.
*   **Inline Results:** Show results instantly as user types (debounced, 300ms).

#### **Required Elements:**
1. **Search Input:**
   *   **Placeholder:** Context-specific (e.g., "Search books...", "Find a deck...")
   *   **Icon:** Magnifying glass (left side)
   *   **Clear button:** X icon appears when text is entered
   *   **Size:** `size='sm'` on mobile, `size='md'` on desktop
   *   **Width:** Full width on mobile, 240-320px on desktop

2. **Filter Pills (Optional):**
   *   **Appearance:** Small chips/buttons with icon + label
   *   **Placement:** Below search bar or inline (if space allows)
   *   **Active State:** Filled variant or underline
   *   **Examples:** Category, Tags, Date Range, Status

3. **Sort Dropdown (Optional):**
   *   **Trigger:** Small button ("Sort by: Recent")
   *   **Options:** Recent, Popular, Alphabetical, Custom
   *   **Placement:** Right side, adjacent to view toggle

#### **Layout Pattern:**
```javascript
<Stack spacing={2} sx={{ mb: 3 }}>
  {/* Search + View Toggle Row */}
  <Stack direction='row' spacing={1.5} alignItems='center'>
    <Input
      placeholder={t('search.placeholder')}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      startDecorator={<SearchIcon />}
      endDecorator={
        searchQuery && (
          <IconButton size='sm' onClick={() => setSearchQuery('')}>
            <CloseIcon />
          </IconButton>
        )
      }
      size='md'
      sx={{ flex: 1, maxWidth: { sm: 320 } }}
    />
    
    {/* View Toggle */}
    <Stack direction='row' spacing={0.5} sx={{ ml: 'auto' }}>
      <IconButton
        size='sm'
        variant={viewMode === 'grid' ? 'solid' : 'plain'}
        onClick={() => setViewMode('grid')}
      >
        <GridViewIcon />
      </IconButton>
      <IconButton
        size='sm'
        variant={viewMode === 'list' ? 'solid' : 'plain'}
        onClick={() => setViewMode('list')}
      >
        <ListIcon />
      </IconButton>
    </Stack>
  </Stack>
  
  {/* Optional: Filter Pills Row */}
  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
    {categories.map((cat) => (
      <Chip
        key={cat}
        variant={activeCategory === cat ? 'solid' : 'outlined'}
        onClick={() => setActiveCategory(cat)}
        size='sm'
      >
        {cat}
      </Chip>
    ))}
  </Stack>
</Stack>
```

#### **Responsive Behavior:**
*   **Mobile (`xs`):**
    *   Search bar: Full width
    *   View toggle: Move to second row or omit if not critical
    *   Filters: Collapse into a "Filters" button that opens a modal/drawer
*   **Desktop (`md+`):**
    *   Search bar: Fixed width (240-320px)
    *   View toggle: Always visible, right-aligned
    *   Filters: Inline pills or dropdown

#### **Performance:**
*   **Debounced Search:** Wait 300ms after user stops typing before querying
*   **Optimistic UI:** Show loading skeleton in results area, not over search bar
*   **Pagination:** Load 20-50 items initially, infinite scroll or "Load More" button

### 6.5 Complete Example: Book Library

```javascript
function BookLibrary() {
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('book_view_mode') || 'grid'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [books, setBooks] = useState([])

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Typography level='h1' sx={{ mb: 3 }}>
        {t('books.library')}
      </Typography>

      {/* Search + Controls */}
      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 3 }}>
        <Input
          placeholder={t('books.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startDecorator={<SearchIcon />}
          size='md'
          sx={{ flex: 1, maxWidth: { sm: 320 } }}
        />
        
        <Stack direction='row' spacing={0.5} sx={{ ml: 'auto' }}>
          <IconButton
            size='sm'
            variant={viewMode === 'grid' ? 'solid' : 'plain'}
            onClick={() => {
              setViewMode('grid')
              localStorage.setItem('book_view_mode', 'grid')
            }}
          >
            <GridViewIcon />
          </IconButton>
          <IconButton
            size='sm'
            variant={viewMode === 'list' ? 'solid' : 'plain'}
            onClick={() => {
              setViewMode('list')
              localStorage.setItem('book_view_mode', 'list')
            }}
          >
            <ListIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Content */}
      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {books.map((book) => (
            <Grid key={book._id} xs={6} sm={4} md={3}>
              <Card
                variant='outlined'
                sx={{
                  maxHeight: 180,
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 'md' }
                }}
              >
                {/* Grid card content */}
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack spacing={0}>
          {books.map((book) => (
            <Box
              key={book._id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 1.5,
                px: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              {/* List row content */}
            </Box>
          ))}
        </Stack>
      )}
    </Container>
  )
}
```

### 6.6 Anti-Patterns Summary
*   ❌ Single view mode only (inflexible)
*   ❌ Grid cards exceeding 30% height-to-width ratio
*   ❌ List rows with variable heights
*   ❌ Search bar without clear button
*   ❌ View toggle buried in settings
*   ❌ No user preference persistence
*   ❌ Overwhelming filter UI (10+ options visible at once)
*   ❌ Mobile horizontal scroll tables

### 6.7 Accessibility Notes
*   **Keyboard Navigation:** Both grid and list must be fully navigable via Tab/Arrow keys
*   **Screen Readers:** Announce view mode changes ("Switched to grid view")
*   **Focus Management:** Maintain focus position when switching views
*   **ARIA Labels:** 
    *   View toggle: `aria-label="Switch to grid view"`
    *   Search: `aria-label="Search content"`

---

## 7. Interaction & Feedback
*   **Hover States:** Interactive elements MUST provide visual feedback.
    *   *Button:* Slight background change or lift effect.
    *   *Card:* `transform: translateY(-2px)` or shadow increase.
*   **Loading States (Standard: Skeleton Placeholders):**

    **Rule:** Never use a full-page loading gate (`if (loading) return <LinearProgress>`) for dashboard or data pages. Use **Skeleton placeholders** on the specific elements that depend on async data.

    #### Why Skeleton over LinearProgress gate
    | Approach | UX | Standard |
    |---|---|---|
    | `if (loading) return <LinearProgress>` | Blank page until all API calls finish | ❌ Anti-pattern for dashboards |
    | `<Skeleton loading={loading}>` on each data element | Layout visible immediately, shimmer on pending values | ✅ Required |
    | Show `0` then update to real value | Flash of wrong data (0→14) | ❌ Forbidden |

    #### Implementation Pattern (Stat Numbers)
    Wrap any number/value that depends on async data in a `<Skeleton>`:
    ```javascript
    import { Skeleton } from '@mui/joy'

    // ❌ Anti-pattern — shows 0 then real value (flash of wrong data)
    <Typography level='h2'>{stats.dueToday}</Typography>

    // ❌ Anti-pattern — blocks all rendering until every API call resolves
    if (loading) return <Container><LinearProgress /></Container>

    // ✅ Correct — layout stable, shimmer only on the pending number
    <Typography level='h2'>
      <Skeleton loading={loading} variant='text' width='2ch'>
        {stats.dueToday}
      </Skeleton>
    </Typography>
    ```

    #### Three Approved Patterns
    1. **Skeleton on value** — for stat numbers, text values, counts (most common)
       ```javascript
       <Skeleton loading={loading} variant='text' width='2ch'>{value}</Skeleton>
       ```
    2. **Skeleton on container** — for cards, list items, images not yet loaded
       ```javascript
       <Skeleton loading={loading} variant='rectangular' height={120} />
       ```
    3. **Conditional render** — for optional UI elements that only appear in one state (e.g., a CTA that shows only when `dueCount > 0`). Guard with `!loading &&` so the element appears cleanly after data arrives, never in a wrong-value flash state.
       ```javascript
       {!loading && dueCount > 0 && <Button>Review {dueCount} cards</Button>}
       ```

    #### Home Page Exception
    The Home page (`/`) uses Pattern 3 (conditional render) for its due-cards pill — **this is correct and requires no change**. The pill simply doesn't render during load, then appears with the correct value. No skeleton needed when the element is entirely optional.

    #### Stat Label Rules (same section)
    - **Never** apply `opacity` directly to a Typography that uses a semantic color token (`text.tertiary`, `text.secondary`). The token already encodes the correct contrast.
    - **Never** hardcode `fontSize` on `body-xs` — it's already `0.625rem` by definition.
    ```javascript
    // ❌ Double-dims the label below readable contrast
    <Typography level='body-xs' sx={{ color: 'text.tertiary', opacity: 0.6, fontSize: '0.625rem' }}>

    // ✅ Correct
    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
    ```

*   **Modals:**
    *   **Position:** Always Centered (`display: flex; justify-content: center; align-items: center`).
    *   **Backdrop:** Darkened background (`rgba(0,0,0,0.5)`) to focus attention.
    *   **Z-Index:** Ensure they sit above everything else (`z-index: 1300+`).
*   **Active States (Filters, Tabs, Navigation):**
    *   **Standard Pattern for Chips/Pills:** Use **`variant='solid'` (active) / `variant='plain'` (inactive)** for filter chips and category selectors. This provides clear selection feedback without underline text decoration.
    *   **Chip Filter Pattern (preferred):**
        ```javascript
        {filters.map(({ key, label, color }) => (
          <Chip
            key={key}
            size='sm'
            variant={activeFilter === key ? 'solid' : 'plain'}
            color={activeFilter === key ? color : 'neutral'}
            onClick={() => setActiveFilter(key)}
            sx={{ cursor: 'pointer', fontWeight: activeFilter === key ? 600 : 400 }}
          >
            {label}
          </Chip>
        ))}
        ```
    *   **Underline pattern:** Only use text underline for **inline navigation links** within body text, NOT for filter chips or tab-style controls.
    *   **Examples:** Filter chips for type/category → `solid`/`plain`. Navigation link in text → underline.

### 7.1 Mobile Navigation (Specialized)
*   **Segmented Controls:** For top-level mobile view switching (e.g., "Goals" vs "Priorities"), use a **Segmented Control** instead of standard tabs.
    *   **Appearance:** Pill-shaped container (`background.level1`) with internal pills for items.
    *   **Active State:** `background.surface`, `shadow: 'sm'`, `color: 'primary.main'` (or context color).
    *   **Interaction:** Instant switch, no underline.
    *   **Usage:** Only on `xs` viewports. Desktop should revert to standard Tabs or Grid views.

### 7.2 Mobile Action Buttons
*   **Row-First Layout:** On mobile, place primary actions (e.g., "Create", "Import") in a **single horizontal row** whenever possible.
    *   **Avoid Stacking:** Do not stack buttons vertically unless they have long labels that force a break.
    *   **Compact Width:** Buttons should only be as wide as their content (or flex share), not forced full-width (`width: '100%'`) unless intended as a sticky bottom bar.
    *   **Space Optimization:** "Aprovechar el espacio" — use horizontal space efficiently to show more content above the fold.

### 7.3 Mobile Stats Layout
*   **Horizontal Row:** When displaying high-level statistics (counts, percentages) on mobile, use a **single horizontal row** (Grid `xs={4}` or `xs={6}`) instead of stacking vertical cards.
    *   **Why:** Stacking consumes too much vertical space, pushing content off-screen.
    *   **Hide Elements:** Hide secondary elements (like progress bars or labels) on mobile if space is tight, showing only the key metric.
### 7.4 Horizontal Headers
*   **Avoid Center Stacking:** For clear hierarchical headers (e.g., entity titles like "Health", "Reading"), use a **Left-Aligned Horizontal Row** layout (Icon + Text side-by-side) instead of stacking them vertically in the center.
    *   *Why:* Vertical stacking wastes space and breaks the natural "reading flow" (left-to-right).
    *   *Exception:* Empty states or marketing banners may use center stacking for emphasis.
---

## 8. Modal & Dialog Standards (CRUD Operations)

### 8.1 Philosophy: Premium Form Experience
*   **Purpose-Built:** Modals for creating, editing, and deleting content must feel premium, spacious, and intuitive.
*   **Progressive Disclosure:** Break complex forms into clear visual sections to reduce cognitive load.
*   **Mobile-First Responsive:** Width must adapt gracefully from mobile to desktop, never cramped or excessively wide.
*   **Consistency:** All CRUD modals should follow the same structural and styling patterns for predictable UX.

### 8.2 Modal Width Standards

#### **Width by Complexity:**

| Modal Type | Recommended Width | Use Case |
|------------|------------------|----------|
| **Simple Confirmation** | `520px` | Delete confirmations, simple yes/no dialogs |
| **Basic Form** | `600px` | Login, sign up, single-section forms (2-3 inputs) |
| **Standard Form** | `700px` | Multi-field forms with 4-6 sections |
| **Complex Form** | `760px` | Multi-section forms with image previews, lists, nested content |
| **Rich Content** | `800-900px` | Split-view modals, side-by-side comparisons |

#### **Mobile-First Responsive Pattern:**

```javascript
// Standard Form (700px)
width: { 
  xs: '95%',    // Mobile: Nearly full-width (breathing room on edges)
  sm: '85%',    // Small tablet: More space
  md: '75%',    // Medium tablet: Comfortable reading width
  lg: '700px'   // Desktop: Fixed optimal width
},
maxWidth: '700px'

// Complex Form (760px) - For forms with image previews, milestone lists, activities
width: { 
  xs: '95%',    
  sm: '90%',    
  md: '85%',    
  lg: '760px'   
},
maxWidth: '760px'
```

**Rationale:**
*   **Percentages on mobile/tablet:** Ensures content never gets cramped or requires horizontal scroll
*   **Fixed width on desktop:** Maintains optimal reading line length (45-75 characters)
*   **MaxWidth cap:** Prevents over-expansion on ultra-wide screens
*   **760px for complex forms:** Extra 60px accommodates image previews (16:9 ratio), milestone lists, and side-by-side inputs without feeling cramped

### 8.3 Three-Part Modal Structure

Every CRUD modal MUST follow this consistent structure:

```
┌─────────────────────────────────────┐
│ HEADER (Elevated)                   │
│  • Title (h4, bold)                 │
│  • Optional subtitle/description    │
│  • bgcolor: background.level1       │
│  • Border bottom                    │
├─────────────────────────────────────┤
│ CONTENT (Scrollable)                │
│  • Form sections with dividers      │
│  • Generous padding                 │
│  • Vertical spacing: 3 (24px)       │
│  • overflowY: auto                  │
├─────────────────────────────────────┤
│ FOOTER (Sticky)                     │
│  • Cancel button (left/plain)       │
│  • Primary action (right/solid)     │
│  • bgcolor: background.surface      │
│  • Border top                       │
└─────────────────────────────────────┘
```

#### **Implementation Pattern:**

```javascript
<Modal open={open} onClose={onClose}>
  <ModalDialog
    sx={{
      width: { xs: '95%', sm: '85%', md: '75%', lg: '700px' },
      maxWidth: '700px',
      height: { xs: '95vh', md: 'auto' },
      maxHeight: { xs: '95vh', md: '90vh' },
      overflowY: 'auto',
      p: 0,  // Remove default padding (we control it per section)
      borderRadius: { xs: 'lg', md: 'xl' },
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      border: '1px solid',
      borderColor: 'divider'
    }}
  >
    {/* HEADER */}
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.level1'
      }}
    >
      <DialogTitle level='h4' sx={{ m: 0, fontWeight: 700 }}>
        {isEdit ? t('entity.edit') : t('entity.create')}
      </DialogTitle>
      {isEdit && (
        <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
          Update your details
        </Typography>
      )}
    </Box>

    {/* CONTENT */}
    <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        {/* Sections here */}
      </Stack>
    </DialogContent>

    {/* FOOTER */}
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: 2
      }}
    >
      <Button variant='plain' onClick={onClose} size='lg'>
        Cancel
      </Button>
      <Button onClick={handleSubmit} loading={loading} size='lg'>
        {isEdit ? 'Update' : 'Save'}
      </Button>
    </Box>
  </ModalDialog>
</Modal>
```

### 8.4 Content Sectioning & Visual Hierarchy

#### **Principles:**
*   **Clear Sections:** Group related fields into logical sections (Basic Info, Details, Settings, etc.)
*   **Section Titles:** Use `Typography level='title-md'` with `fontWeight: 700`
*   **Dividers:** Use `<Divider />` between sections for clear visual separation
*   **Spacing:** `spacing={3}` (24px) between sections, `spacing={2}` (16px) within sections
*   **Helper Text:** Add subtle `body-xs` text below section titles to explain purpose

#### **Section Pattern:**

```javascript
<Box>
  {/* Section Header */}
  <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
    Basic Information
  </Typography>
  <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 2, mt: -1 }}>
    Essential details about this item
  </Typography>
  
  {/* Section Content */}
  <Stack spacing={2}>
    <FormControl required>
      <FormLabel sx={{ fontWeight: 600 }}>{t('form.title')}</FormLabel>
      <Input
        value={formData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        placeholder='Enter title...'
        size='lg'
      />
    </FormControl>
    
    <FormControl>
      <FormLabel sx={{ fontWeight: 600 }}>{t('form.description')}</FormLabel>
      <Textarea
        minRows={3}
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder='Add description...'
      />
    </FormControl>
  </Stack>
</Box>

<Divider />

{/* Next section... */}
```

### 8.5 Form Component Standards

#### **Input Sizing:**
*   **Standard inputs:** `size='lg'` for better touch targets (especially on mobile)
*   **Labels:** Always use `<FormLabel>` with `fontWeight: 600` for prominence
*   **Placeholders:** Use sentence case, descriptive prompts ("Enter your email...", not "Email")

#### **Required Fields:**
```javascript
<FormControl required>
  <FormLabel sx={{ fontWeight: 600 }}>{t('field.title')}</FormLabel>
  <Input ... />
</FormControl>
```

#### **Textarea Guidelines:**
*   **Minimum rows:** `minRows={3}` for multi-line inputs (descriptions, notes)
*   **Auto-resize:** Let textarea grow with content (Joy UI default behavior)
*   **Placeholder:** Descriptive and friendly ("Share your thoughts...", "What's the goal?")

#### **Select/Dropdown:**
*   **Size:** `size='lg'` for consistency with inputs
*   **Placeholder:** Clear call-to-action ("Select a category...", "Choose timeframe...")
*   **Icons/Emoji:** Use emojis in options for visual hierarchy (e.g., "📅 All Year", "Q1")

### 8.6 Image Preview Pattern

For forms with image URL inputs (covers, backgrounds, icons):

```javascript
<FormControl>
  <FormLabel sx={{ fontWeight: 600 }}>{t('form.imageUrl')}</FormLabel>
  <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
    Add a visual reminder (optional)
  </Typography>

  {formData.image_url && (
    <AspectRatio 
      ratio='16/9' 
      sx={{ 
        mb: 2, 
        borderRadius: 'md', 
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <img 
        src={formData.image_url} 
        alt='Preview' 
        style={{ objectFit: 'cover' }} 
        loading='lazy'
      />
    </AspectRatio>
  )}

  <Input
    placeholder='https://example.com/image.jpg'
    value={formData.image_url}
    onChange={(e) => handleChange('image_url', e.target.value)}
  />
</AspectRatio>
```

**Best Practices:**
*   Use `AspectRatio` component (16:9 for landscape, 4:3 for portraits, 1:1 for squares)
*   Show preview ABOVE input field
*   Add subtle border to preview container
*   Use `loading='lazy'` for performance
*   Helper text should explain purpose ("motivation", "visual identifier")

### 8.7 List Management Within Modals

For forms that include editable lists (milestones, tags, attachments):

#### **Pattern:**
*   **Header:** Section title + "Add" button (right-aligned, size `sm`, variant `soft`)
*   **Items:** Stack with consistent spacing (`spacing={1.5}`)
*   **Empty State:** Dashed border box with friendly message
*   **Item Layout:** Icon/Checkbox + Input + Delete button

#### **Implementation:**

```javascript
<Box>
  <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={2}>
    <Box>
      <Typography level='title-md' sx={{ fontWeight: 700 }}>
        Key Results & Milestones
      </Typography>
      <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
        Break down your goal into measurable steps
      </Typography>
    </Box>
    <Button 
      size='sm' 
      startDecorator={<AddIcon />} 
      variant='soft' 
      onClick={handleAddItem}
    >
      Add
    </Button>
  </Stack>

  <Stack spacing={1.5}>
    {items.map((item, index) => (
      <Stack key={index} direction='row' spacing={1.5} alignItems='center'>
        {/* Custom checkbox or icon */}
        <Box sx={{ width: 20, height: 20 }}>...</Box>
        
        {/* Input field */}
        <Input
          fullWidth
          value={item.title}
          onChange={(e) => handleItemChange(index, e.target.value)}
          placeholder='Item title...'
        />
        
        {/* Delete button */}
        <IconButton 
          size='sm' 
          variant='plain' 
          color='danger' 
          onClick={() => handleDeleteItem(index)}
        >
          <DeleteIcon />
        </IconButton>
      </Stack>
    ))}

    {items.length === 0 && (
      <Box
        sx={{
          py: 3,
          textAlign: 'center',
          bgcolor: 'background.level1',
          borderRadius: 'md',
          border: '1px dashed',
          borderColor: 'divider'
        }}
      >
        <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
          No items yet. Add your first item above.
        </Typography>
      </Box>
    )}
  </Stack>
</Box>
```

### 8.8 Contained Sections (Premium Pattern)

For secondary content like "Recurring Activities", "Tags", or "Settings", use a contained background:

```javascript
<Box
  sx={{
    bgcolor: 'background.level1',
    borderRadius: 'lg',
    p: { xs: 2, md: 3 },
    border: '1px solid',
    borderColor: 'divider'
  }}
>
  {/* Section title */}
  <Typography level='title-md' sx={{ mb: 2, fontWeight: 700 }}>
    {t('activities.title')}
  </Typography>
  
  {/* Content here (use Cards for individual items) */}
  <Stack spacing={1.5}>
    {activities.map((activity) => (
      <Card variant='outlined' sx={{ p: 2, bgcolor: 'background.surface' }}>
        {/* Activity content */}
      </Card>
    ))}
  </Stack>
</Box>
```

**Benefits:**
*   Visual grouping of related but secondary content
*   Clear hierarchy (level1 container → surface cards)
*   Maintains consistency with dashboard card patterns

### 8.9 Context Headers (Edit Mode)

When editing an entity with fixed context (e.g., Q1 Goal, Yearly Objective):

```javascript
<Stack
  direction='row'
  spacing={1}
  alignItems='center'
  sx={{
    px: 2,
    py: 1.5,
    borderRadius: 'md',
    bgcolor: isQuarterly ? 'primary.softBg' : 'neutral.softBg',
    border: '1px solid',
    borderColor: isQuarterly ? 'primary.outlinedBorder' : 'neutral.outlinedBorder'
  }}
>
  {/* Color dot indicator */}
  <Box
    sx={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      bgcolor: isQuarterly ? 'primary.solidBg' : 'neutral.solidBg'
    }}
  />
  
  {/* Context label */}
  <Typography 
    level='body-sm' 
    sx={{ 
      fontWeight: 600, 
      color: isQuarterly ? 'primary.solidBg' : 'text.primary' 
    }}
  >
    {isQuarterly ? `Q${quarter} Goal` : 'Yearly Objective'}
  </Typography>
  
  {/* Optional: Parent reference */}
  {parentId && (
    <>
      <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>•</Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        ↳ {parentTitle}
      </Typography>
    </>
  )}
</Stack>
```

### 8.10 Delete Confirmation Dialogs

Destructive actions require explicit confirmation with a **refined minimalist** approach.

#### **Design Principles:**
*   **Clean & Minimal:** White/surface backgrounds, subtle borders (no heavy red coloring)
*   **Icon + Title in Row:** Horizontal layout for better alignment
*   **Clear Hierarchy:** Visual weight through size and color, not backgrounds
*   **Danger Color:** Only on Delete button and icon, not entire modal

#### **Implementation:**

```javascript
<Modal open={deleteOpen} onClose={onDeleteClose}>
  <ModalDialog
    variant='outlined'
    sx={{
      width: { xs: '90%', sm: 440 },
      maxWidth: 440,
      borderRadius: 'xl',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      p: 0,
      border: '1px solid',
      borderColor: 'divider'  // Neutral border, not danger
    }}
  >
    {/* Header - Icon + Title in Horizontal Row */}
    <Box
      sx={{
        px: 3,
        py: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack direction='row' spacing={1.5} alignItems='center'>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'danger.softBg',
            color: 'danger.solidBg',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <WarningIcon sx={{ fontSize: 22 }} />
        </Box>
        <Typography
          level='title-lg'
          sx={{
            m: 0,
            fontWeight: 700,
            fontSize: '1.125rem',
            color: 'text.primary',
            lineHeight: 1  // Critical for alignment
          }}
        >
          {t('dialog.delete.title')}
        </Typography>
      </Stack>
    </Box>

    {/* Content - Minimal & Clear */}
    <DialogContent sx={{ px: 3, py: 3 }}>
      <Typography level='body-md' sx={{ mb: 1.5, color: 'text.primary', lineHeight: 1.6 }}>
        {t('dialog.delete.message', { itemName: entity.title })}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
        This action cannot be undone
      </Typography>
    </DialogContent>

    {/* Footer - Clean Actions */}
    <Box
      sx={{
        px: 3,
        py: 2.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface'
      }}
    >
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent='flex-end'>
        <Button
          variant='outlined'
          color='neutral'
          onClick={onDeleteClose}
          size='lg'
          fullWidth={{ xs: true, sm: false }}
          sx={{ minWidth: { sm: 100 } }}
        >
          Cancel
        </Button>
        <Button
          variant='solid'
          color='danger'
          onClick={handleConfirmDelete}
          loading={deleting}
          size='lg'
          fullWidth={{ xs: true, sm: false }}
          sx={{ minWidth: { sm: 100 } }}
        >
          Delete
        </Button>
      </Stack>
    </Box>
  </ModalDialog>
</Modal>
```

#### **Key Design Elements:**

1. **Horizontal Icon + Title Layout:**
   - Use `Stack direction='row'` with `alignItems='center'`
   - Icon in 40px circle with soft danger background
   - Title with `lineHeight: 1` for perfect vertical alignment
   - `flexShrink: 0` on icon prevents squishing

2. **Clean Backgrounds:**
   - Header: Clean white/surface (not colored)
   - Modal border: Neutral divider (not danger.outlinedBorder)
   - Only icon circle and Delete button use danger colors

3. **Minimal Warning Text:**
   - Italic, tertiary color text (not a box or banner)
   - No emoji, no borders, no backgrounds
   - Simply states "This action cannot be undone"

4. **Button Hierarchy:**
   - Cancel: Outlined neutral (secondary)
   - Delete: Solid danger (primary action)
   - Right-aligned on desktop, stacked on mobile

#### **Why This Approach:**

✅ **Refined Minimalism (Section 1):** Clean, elegant, no visual clutter
✅ **Color System (Section 2):** Theme-aware tokens, no hardcoded colors
✅ **Typography (Section 4):** No backgrounds on text elements
✅ **Component Design (Section 5):** Subtle borders, appropriate elevation
✅ **Alignment:** Icon and title on same baseline for natural reading flow

#### **Common Mistakes to Avoid:**

❌ Heavy colored backgrounds (red header)
❌ Colored modal borders (danger theme on entire dialog)
❌ Warning text in colored boxes with emojis
❌ Center-aligned content (breaks natural flow)
❌ Using `DialogTitle` (has default margins that break alignment)
❌ Omitting `lineHeight: 1` on title (causes vertical misalignment)

### 8.11 Responsive Adaptations

#### **Mobile (xs):**
*   Width: 95% (breathing room on edges)
*   Height: 95vh (near-fullscreen)
*   Padding: `px: 2, py: 2` (16px)
*   Button layout: Stack vertically (`flexDirection: 'column'`)
*   Font size: Slightly smaller titles (`fontSize: '1.25rem'`)

#### **Tablet (sm, md):**
*   Width: 85-90% (comfortable)
*   Padding: `px: 3, py: 2` (24px horizontal, 16px vertical)
*   Button layout: Horizontal row

#### **Desktop (lg+):**
*   Width: Fixed (700px or 760px)
*   Padding: `px: 4, py: 3` (32px horizontal, 24px vertical)
*   Border radius: `xl` (more rounded)
*   Shadow: Deeper (`0 25px 50px -12px`)

### 8.12 Anti-Patterns

❌ **Avoid:**
*   Fixed width on mobile (causes cramping or overflow)
*   No visual sections (wall of fields)
*   Unclear button hierarchy (same style for Cancel and Save)
*   Missing empty states for lists
*   No helper text for complex fields
*   All content in one long scroll (no sections)
*   Footer buttons floating in content area
*   No loading states on submit
*   Hardcoded text (violates i18n requirement)
*   Background colors on text elements

✅ **Do:**
*   Mobile-first responsive widths
*   Clear three-part structure (header, content, footer)
*   Sectioning with dividers
*   Helper text for context
*   Empty states for lists
*   Custom components for dynamic styling
*   Image previews where relevant
*   Loading states on buttons
*   Translation keys for all text
*   Theme-aware colors

### 8.13 Accessibility Notes

*   **Focus Management:** Auto-focus first input field on modal open
*   **Keyboard Navigation:** Tab order should be logical (top to bottom)
*   **ESC to Close:** Always allow ESC key to cancel/close modal
*   **Required Fields:** Use `required` prop and validate on submit
*   **Error Messages:** Show inline validation errors below fields
*   **Screen Reader:** Use semantic HTML (FormLabel, FormControl)
*   **ARIA Labels:** Add to icon-only buttons (`aria-label="Delete item"`)

---

## 9. Code Quality for UI
*   **Clean JSX:** Extract repeated inline `sx` styles into reusable definition objects or styled components if they exceed 3-4 properties.
*   **No Orphans:** Ensure conditional rendering is robust. Use boolean casting `!!value` or `{value && ...}` carefully to avoid printing `0` or empty artifacts.

---

## 10. Access Control & Features
*   **Subscription Enforcement:** 
    *   All core features must verify user subscription limits (e.g., max books, max storage) before execution.
    *   **Source of Truth:** Limits are defined in `Nowry-API/app/config/subscription_plans.py`.
    *   **documentation:** See `nowry/docs/SUBSCRIPTION_SYSTEM_PLAN.md`.
    *   UI should reflect these limits (e.g., disable "Create" buttons if limit reached, or show a premium badge).
    *   Always utilize the central subscription hooks or services to check permissions.

---

## 11. Smart Empty States (Reduction of Clutter)
*   **Hide Zero-State Dashboards:** Do NOT show dashboard statistics or "0" counters when a user has not yet created any content.
    *   *Incorrect:* Showing "Total Goals: 0", "Completion: 0%" on a blank dashboard.
    *   *Correct:* Hide the stats row entirely and show a prominent "Start Planning" call-to-action (CTA).
*   **Progressive Disclosure:** Only reveal complex controls or statistics once there is data to populate them.
    *   *Goal:* Reduce cognitive load for new users and provide a cleaner "First Run Experience" (FRE).

*   **Single Primary Action:** Avoid showing multiple buttons that perform the exact same action on the same screen (e.g., in the header AND in an empty state card). 
    *   *Rule:* If a prominent "Empty State" CTA exists, hide the corresponding toolbar/header action until the user has created their first item.

*   **Dashboard vs Detail View:**
    *   **Dashboard/Homepage:** Show **overview data only** (progress, counts, key metrics). Do NOT include expandable sections, nested lists, or inline CRUD operations.
        *   *Purpose:* Quick glance at status, navigation to details.
        *   *Principle:* Maximum simplicity, minimum interaction.
        *   *Example:* Focus Area cards should show icon, name, description, and progress bar ONLY.
    *   **Detail View:** Show **comprehensive data** (full lists, expandable sections, edit controls).
        *   *Purpose:* Deep dive, management, CRUD operations.
        *   *Principle:* Full functionality, comprehensive information.
        *   *Example:* Focus Area detail page shows goals with milestones, add/edit/delete controls, etc.
    *   **Anti-Pattern:** Adding "Goals (N)" dropdowns to dashboard cards. This adds noise and violates the overview-only principle. Users should click into the entity to see related items.

---

## 12. Microcopy & Messaging (UX Writing)
*   **Clarity Over Cleverness:** Every word should serve a purpose. Avoid redundant messaging that forces users to process the same information twice.
    
*   **No Redundancy:**
    *   **Anti-Pattern:** Multiple messages conveying identical information
        *   ❌ "4 cards due" + "Ready to review" (both say the same thing)
        *   ❌ "No results found" + "Try searching for something else" (second line is implicit)
    *   **Best Practice:** Single, clear message that combines context and action
        *   ✅ "Review 4 cards"
        *   ✅ "No results found"
    *   **Why:** Reduces cognitive load, faster comprehension, cleaner UI

*   **Action-Oriented Language:**
    *   **Prefer verbs over nouns** for interactive elements:
        *   ❌ Passive: "4 cards due"
        *   ✅ Active: "Review 4 cards"
    *   **Lead with the action** when possible:
        *   ✅ "Review 4 cards" (verb first)
        *   ✅ "Create your first book"
        *   ✅ "Start studying"
    *   **Benefits:** 
        - Users immediately understand what they can do
        - Clear call-to-action
        - More engaging and directive

*   **Message Hierarchy:**
    *   **Primary Message:** Should stand alone and be fully understandable without additional context
    *   **Secondary Message:** Only add if it provides NEW information (e.g., status, count, time remaining)
    *   **Test:** If you can remove a line without losing meaning, remove it
    
*   **Clickable Elements:**
    *   Interactive components should **look** interactive AND have **clear intent**:
        *   ❌ "4 cards due" (ambiguous - is this just info or clickable?)
        *   ✅ "Review 4 cards →" (clear action + visual indicator)
    *   **Visual affordances required:**
        - Subtle border or background
        - Hover state that changes appearance
        - Optional arrow or icon suggesting action
        - Active/press state for feedback
    *   **Minimalist approach:**
        - Start with `transparent` background + `divider` border
        - Enhance border color on hover
        - Add subtle background lift on hover
        - Keep decorative elements minimal (simple arrow, not heavy badges)

*   **Contextual Clarity:**
    *   **Good microcopy answers:** "What is this?" and "What happens when I click?"
    *   **Examples:**
        ```
        ✅ Good:
        - "Review 4 cards" (what + action)
        - "Save changes" (clear outcome)
        - "Delete account" (specific action)
        
        ❌ Needs improvement:
        - "Continue" (continue to what?)
        - "Submit" (submit what?)
        - "Cards" (what about cards?)
        ```

*   **Consistency Across Languages:**
    *   Ensure action-oriented phrasing works in all supported languages
    *   Test that translated text doesn't become too long for UI constraints
    *   Some languages prefer different structures (e.g., Japanese often places action at end)
    *   **Example translations for "Review 4 cards":**
        - 🇺🇸 English: "Review 4 cards" (verb-first)
        - 🇫🇷 French: "Réviser 4 cartes" (verb-first, imperative)
        - 🇪🇸 Spanish: "Repasar 4 tarjetas" (verb-first, infinitive)
        - 🇩🇪 German: "4 Karten wiederholen" (count-first, infinitive)
        - 🇯🇵 Japanese: "4枚を復習" (count-first, action particle)

*   **Dashboard Microcopy Principles:**
    *   **Overview dashboards** = Ultra-concise messaging
    *   **Detail views** = More descriptive, helpful text
    *   **Empty states** = Encouraging, action-oriented
    *   **Error messages** = Specific problem + suggested solution (see Section 4 - Typography)

*   **Quick Checklist for Microcopy:**
    - [ ] Is there any redundancy? Can I remove a line without losing meaning?
    - [ ] Does it clearly state the action (for interactive elements)?
    - [ ] Would a new user understand this without additional context?
    - [ ] Does it work in all supported languages?
    - [ ] Is it sentence case (not Title Case or UPPERCASE)?
    - [ ] Does it follow the brand tone (friendly, clear, professional)?

---

## 13. Loading States, Empty States, Tabs & Feedback Patterns

### 13.1 Loading States

**Rule:** NEVER use a bare `<Typography>` string as a loading indicator. Always use `CircularProgress` with a descriptive caption.

#### Standard Loading Pattern
```javascript
// ✅ Correct — centered spinner with caption
<Stack alignItems='center' justifyContent='center' sx={{ py: 8 }} spacing={2}>
  <CircularProgress size='md' />
  <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
    {t('common.loading')}
  </Typography>
</Stack>

// ❌ Forbidden — bare loading text
<Typography>Loading...</Typography>
<Typography>{t('cards.loading')}</Typography>
```

#### When to Use What
| Context | Component | Notes |
|---|---|---|
| Initial page/section load | `CircularProgress` + caption | Centered in content area, `py: 8` |
| Button async action | `loading={true}` prop on `<Button>` | Joy UI built-in |
| First-time content skeleton | `<Skeleton />` | Prevents layout shift for known structures |

> **Never** use `LinearProgress` as a page loading indicator — reserve it for determinate progress bars (e.g., study session progress, card intervals).

---

### 13.2 Empty State Pattern

Every empty state MUST follow this exact structure to maintain visual consistency across the application:

```javascript
// ✅ Standard empty state — always this structure
<Box sx={{ py: 8, textAlign: 'center' }}>
  {/* Optional: illustrative icon */}
  <SomeIcon sx={{ fontSize: 48, color: 'text.tertiary', opacity: 0.5, mb: 2 }} />

  {/* Heading */}
  <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
    {t('section.empty.title')}    {/* e.g. "No decks yet" */}
  </Typography>

  {/* Sub-text — explains why or what to do */}
  <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
    {t('section.empty.body')}     {/* e.g. "Create your first deck to get started" */}
  </Typography>

  {/* Optional: primary action CTA */}
  <Button size='sm' sx={{ mt: 2 }} onClick={onCreate}>
    {t('section.empty.cta')}
  </Button>
</Box>
```

#### Rules
- **`title-md`** for heading, **`body-sm`** for sub-text — never `h4` or `body-md`
- Always `color: 'text.tertiary'` for the sub-text (not `text.secondary`)
- Icon: 40-48px, optional, `opacity: 0.5`, `color: 'text.tertiary'`
- Distinguish between **filter empty** ("No results — try adjusting your filters") and **true empty** ("Create your first deck")
- Never show an empty state WITH a `CircularProgress` — wait for loading to finish first

---

### 13.3 Pill-Style Tabs (Standard Tab Pattern)

The application uses **pill-style tabs** (not Joy UI's default underline tabs) for all view-switching controls.

```javascript
// ✅ Correct — pill tabs, consistent with CardHome
<Tabs
  value={activeTab}
  onChange={(e, val) => setActiveTab(val)}
  sx={{ bgcolor: 'transparent', '--Tabs-gap': '0px' }}
>
  <TabList
    disableUnderline
    sx={{
      p: 0.5,
      gap: 0.5,
      borderRadius: 'xl',
      bgcolor: 'background.level1',
      display: 'inline-flex'
    }}
  >
    <Tab
      disableIndicator
      sx={{
        borderRadius: 'lg',
        fontSize: '0.85rem',
        fontWeight: 500,
        px: 2,
        py: 0.75,
        '&.Mui-selected': {
          bgcolor: 'background.surface',
          boxShadow: 'sm',
          fontWeight: 600
        }
      }}
    >
      {t('tabs.one')}
    </Tab>
    {/* more tabs... */}
  </TabList>
</Tabs>

// ❌ Forbidden — default underline tab style
<Tabs><TabList><Tab>Decks</Tab></TabList></Tabs>
```

**Key props required:** `disableUnderline` on `<TabList>`, `disableIndicator` on each `<Tab>`.

---

### 13.4 Button Icon Rules (No Emoji in Buttons)

**Rule:** Never use emoji characters as button content or pseudo-icons. Always use Material Icons via `startDecorator` or `endDecorator`.

```javascript
// ❌ Forbidden — emoji as icon
<Button>💾  Save</Button>
<Button>✨  Create</Button>
<Button>🗑  Delete</Button>

// ✅ Correct — proper icon decorator
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteIcon from '@mui/icons-material/Delete'

<Button startDecorator={<SaveRoundedIcon />}>{t('action.save')}</Button>
<Button startDecorator={<AddRoundedIcon />}>{t('action.create')}</Button>
<Button startDecorator={<DeleteIcon />} color='danger'>{t('action.delete')}</Button>
```

**Icon size guidelines in buttons:**
- `size='sm'` button → `sx={{ fontSize: 14 }}` on icon
- `size='md'` button → `sx={{ fontSize: 16 }}` on icon (default, no override needed)
- `size='lg'` button → `sx={{ fontSize: 20 }}` on icon

**Standalone IconButtons** (no text): Always add a `<Tooltip>` with the action name for accessibility.

---

### 13.5 Error Feedback Patterns

**Rule:** NEVER use `window.confirm()` or `window.alert()` in application code. These are native browser dialogs that break the application's design language and are inaccessible.

#### Confirmations (Destructive Actions)
Use the existing `<DeleteConfirmationModal>` pattern (documented in Section 8.10) for all destructive actions:

```javascript
// ❌ Forbidden
if (window.confirm('Are you sure?')) { await deleteItem() }

// ✅ Correct
const [deletingItem, setDeletingItem] = useState(null)

const handleDelete = (item) => setDeletingItem(item)

const confirmDelete = async () => {
  await service.delete(deletingItem._id)
  setDeletingItem(null)
  fetchData()
}

// In JSX:
<DeleteConfirmationModal
  open={!!deletingItem}
  onClose={() => setDeletingItem(null)}
  onConfirm={confirmDelete}
  title={t('section.delete.title')}
  description={t('section.delete.description', { name: deletingItem?.name })}
  confirmText={t('action.delete')}
/>
```

#### Non-Destructive Error / Success Feedback
Use Joy UI `<Snackbar>` for transient notifications (errors, success), never `alert()`:

```javascript
// ❌ Forbidden
alert(error.response?.data?.detail || 'Something went wrong')

// ✅ Correct
const [errorMsg, setErrorMsg] = useState(null)

// In error handler:
setErrorMsg(error.response?.data?.detail || t('errors.generic'))

// In JSX:
<Snackbar
  open={!!errorMsg}
  autoHideDuration={4000}
  onClose={() => setErrorMsg(null)}
  color='danger'
  variant='soft'
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
>
  {errorMsg}
</Snackbar>
```

#### Quick Decision Guide

| Scenario | Component |
|---|---|
| Destructive action (delete, unpublish) | `<DeleteConfirmationModal>` |
| Async error (API failure) | `<Snackbar color='danger'>` |
| Success feedback | `<Snackbar color='success'>` |
| Warning before continue | `<Modal>` with custom content |
| `window.confirm()` | ❌ Never |
| `window.alert()` | ❌ Never |
