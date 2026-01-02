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
*   **Responsiveness:**
    *   Mobile-First approach.
    *   Use responsive props: `sx={{ flexDirection: { xs: 'column', md: 'row' } }}`.

---

## 4. Typography
*   **Hierarchy:** Use semantic levels (`h1`, `h2`, `body-md`, `body-sm`).
    *   *Headings:* Bold/Semi-bold, short, and punchy.
    *   *Body:* Readable contrast not pure black (`text.secondary` is often better for detailed text).
*   **Internationalization (i18n):**
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

