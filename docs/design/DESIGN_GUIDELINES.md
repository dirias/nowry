# Nowry Design and UI/UX Guidelines

## 1. Core Philosophy: "Refined Minimalism"
*   **Less is More:** Every element must have a purpose. Remove redundant labels, borders, or containers that do not add functionality.
*   **Content-First:** The UI should recede, allowing the user's content (books, notes, profile) to be the focal point.
*   **Sophisticated Simplicity:** Simple does not mean plain. Use subtle shadows, smooth transitions, and perfect alignment to achieve a "premium" feel.

---

## 2. Color System & Theming
*   **Theme-Driven:** NEVER hardcode hex values (e.g., `#ffffff`, `#000000`) in components.
*   **Usage:** Use the application's design tokens or CSS variables.
    *   *Correct:* `backgroundColor: 'background.surface'`, `color: 'text.secondary'`
    *   *Incorrect:* `backgroundColor: 'white'`, `color: 'gray'`
*   **Mode Compatibility:** All designs MUST work seamlessly in both **Dark** and **Light** modes.
    *   Test high contrast areas.
    *   Use usage-based tokens (e.g., `neutral.softBg`) that automatically adjust per mode.
*   **Detailed Documentation:** Refer to [`COLOR_SYSTEM.md`](./COLOR_SYSTEM.md) for deeper insights into the dynamic color generation algorithm and full palette tokens.
*   **Palette:**
    *   **Primary:** Used sparingly for main actions (CTAs).
    *   **Neutral:** Used for structural elements, borders, and secondary text.
    *   **Danger:** Reserved strictly for destructive actions (Delete).

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
*   **Hierarchy:** Use semantic levels (`h1`, `h2`, `body-md`, `body-sm`).
    *   *Headings:* Bold/Semi-bold, short, and punchy.
    *   *Body:* Readable contrast not pure black (`text.secondary` is often better for detailed text).
*   **Text Backgrounds:**
    *   **NEVER apply `backgroundColor` directly to text elements** (Typography, heading tags, span, etc.).
    *   *Correct:* Apply background colors to **container elements** (Box, Card, etc.) and let text inherit transparency.
    *   *Incorrect:* `<Typography sx={{ backgroundColor: 'primary.main' }}>Text</Typography>`
    *   *Correct:* `<Box sx={{ bgcolor: 'primary.softBg' }}><Typography>Text</Typography></Box>`
    *   **Exception:** Highlight/mark effect using `background-color` on inline `<mark>` elements or text selection states is acceptable, but use sparingly.
*   **Internationalization (i18n):**
    *   **Universal Support:** The entire application MUST be fully multilingual. No user-facing text should ever be hardcoded.
    *   **NO Hardcoded Text:** All text must use translation keys.
    *   *Correct:* `{t('books.create')}`
    *   *Incorrect:* `Create Book`
    *   Account for variable text lengths in different languages (avoid fixed-width text containers).
    *   **Tooltips:** MUST use translation keys. Never hardcode tooltip text.
*   **Capitalization Standards:**
    *   Follow modern UI/UX best practices for consistent capitalization across the application.
    *   **Sentence case** (recommended for most UI text):
        *   **When to use:** Body text, descriptions, helper text, error messages, empty states, notifications, toast messages
        *   **Examples:** "No articles found", "You're all caught up", "Try searching for something else"
        *   **Tone:** Conversational, friendly, easier to read
        *   **Reference:** Google Material Design, Apple HIG, Microsoft Fluent Design
    *   **Title Case:**
        *   **When to use:** Page titles, section headings, primary navigation items, major button labels
        *   **Examples:** "Account Settings", "Study Center", "Create New Account", "Learn More"
        *   **Tone:** More formal, emphatic
        *   **Rule:** Capitalize first letter of major words (nouns, verbs, adjectives, adverbs)
    *   **ALL CAPS:**
        *   **When to use:** Rarely - only for specific UI badges, labels, or abbreviations (e.g., "NEW", "BETA", "API")
        *   **Warning:** Use sparingly as it reduces readability and can feel aggressive
    *   **Quick Reference Guide:**
        ```
        ✅ Sentence case:
        - "No tasks yet" (empty state)
        - "Password must be at least 8 characters" (validation)
        - "Successfully saved your changes" (success message)
        - "Try adjusting your filters" (helper text)

        ✅ Title Case:
        - "Dashboard" (navigation)
        - "Create Account" (primary button)
        - "Study Center" (page title)
        - "Account Settings" (section header)

        ✅ ALL CAPS (minimal use):
        - "NEW" (badge)
        - "API KEY" (technical label)
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
        - Section 8: "Ultra-concise messaging" — 1-word labels
        - Section 9: "Dashboard Overview" — Information-dense, scannable

---

## 6. Interaction & Feedback
*   **Hover States:** Interactive elements MUST provide visual feedback.
    *   *Button:* Slight background change or lift effect.
    *   *Card:* `transform: translateY(-2px)` or shadow increase.
*   **Loading:**
    *   Use **Skeletons** (`<Skeleton />`) instead of generic spinners for initial content loads to prevent layout shifts.
    *   Loading states on buttons (`loading={true}`) for async actions.
*   **Modals:**
    *   **Position:** Always Centered (`display: flex; justify-content: center; align-items: center`).
    *   **Backdrop:** Darkened background (`rgba(0,0,0,0.5)`) to focus attention.
    *   **Z-Index:** Ensure they sit above everything else (`z-index: 1300+`).
*   **Active States (Filters, Tabs, Navigation):**
    *   **Standard Pattern:** Use **underline** to indicate active state instead of changing background colors.
    *   **Implementation:**
        ```javascript
        sx={{
          textDecoration: isActive ? 'underline' : 'none',
          textUnderlineOffset: '4px',
          textDecorationThickness: '2px'
        }}
        ```
    *   **Benefits:** Maintains visual consistency, avoids contrast issues, follows minimalist principles.
    *   **Examples:** Filter chips, navigation tabs, category selectors.

### 6.1 Mobile Navigation (Specialized)
*   **Segmented Controls:** For top-level mobile view switching (e.g., "Goals" vs "Priorities"), use a **Segmented Control** instead of standard tabs.
    *   **Appearance:** Pill-shaped container (`background.level1`) with internal pills for items.
    *   **Active State:** `background.surface`, `shadow: 'sm'`, `color: 'primary.main'` (or context color).
    *   **Interaction:** Instant switch, no underline.
    *   **Usage:** Only on `xs` viewports. Desktop should revert to standard Tabs or Grid views.

### 6.2 Mobile Action Buttons
*   **Row-First Layout:** On mobile, place primary actions (e.g., "Create", "Import") in a **single horizontal row** whenever possible.
    *   **Avoid Stacking:** Do not stack buttons vertically unless they have long labels that force a break.
    *   **Compact Width:** Buttons should only be as wide as their content (or flex share), not forced full-width (`width: '100%'`) unless intended as a sticky bottom bar.
    *   **Space Optimization:** "Aprovechar el espacio" — use horizontal space efficiently to show more content above the fold.

### 6.3 Mobile Stats Layout
*   **Horizontal Row:** When displaying high-level statistics (counts, percentages) on mobile, use a **single horizontal row** (Grid `xs={4}` or `xs={6}`) instead of stacking vertical cards.
    *   **Why:** Stacking consumes too much vertical space, pushing content off-screen.
    *   **Hide Elements:** Hide secondary elements (like progress bars or labels) on mobile if space is tight, showing only the key metric.
### 6.4 Horizontal Headers
*   **Avoid Center Stacking:** For clear hierarchical headers (e.g., entity titles like "Health", "Reading"), use a **Left-Aligned Horizontal Row** layout (Icon + Text side-by-side) instead of stacking them vertically in the center.
    *   *Why:* Vertical stacking wastes space and breaks the natural "reading flow" (left-to-right).
    *   *Exception:* Empty states or marketing banners may use center stacking for emphasis.
---

## 7. Code Quality for UI
*   **Clean JSX:** Extract repeated inline `sx` styles into reusable definition objects or styled components if they exceed 3-4 properties.
*   **No Orphans:** Ensure conditional rendering is robust. Use boolean casting `!!value` or `{value && ...}` carefully to avoid printing `0` or empty artifacts.

---

## 8. Access Control & Features
*   **Subscription Enforcement:** 
    *   All core features must verify user subscription limits (e.g., max books, max storage) before execution.
    *   **Source of Truth:** Limits are defined in `Nowry-API/app/config/subscription_plans.py`.
    *   **documentation:** See `nowry/docs/SUBSCRIPTION_SYSTEM_PLAN.md`.
    *   UI should reflect these limits (e.g., disable "Create" buttons if limit reached, or show a premium badge).
    *   Always utilize the central subscription hooks or services to check permissions.

---

## 9. Smart Empty States (Reduction of Clutter)
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

## 8. Microcopy & Messaging (UX Writing)
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

