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

