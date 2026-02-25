# Slash Commands Feature

## Overview
Production-ready slash command system for the Lexical editor, inspired by Notion and following Nowry's design guidelines.

## Features

### ✅ User Experience
- **Type `/`** to trigger the command menu
- **Filter commands** by typing after `/` (e.g., `/h1`, `/title`, `/list`)
- **Keyboard navigation**: Arrow Up/Down to navigate, Enter to select, Esc to dismiss
- **Mouse selection**: Click any command to apply it
- **Auto-cleanup**: The `/` and query text are automatically removed after selection
- **Smart positioning**: Menu appears below cursor with proper z-index

### ✅ Available Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| **Text** | `p`, `text`, `normal`, `paragraph` | Plain text paragraph |
| **Heading 1** | `h1`, `heading1`, `title`, `title1` | Large section heading |
| **Heading 2** | `h2`, `heading2`, `title2`, `subtitle` | Medium section heading |
| **Heading 3** | `h3`, `heading3`, `title3`, `subheading` | Small section heading |
| **Bullet list** | `ul`, `bullet`, `list`, `unordered` | Unordered list |
| **Numbered list** | `ol`, `number`, `numbered`, `ordered`, `1` | Ordered list |
| **Quote** | `quote`, `blockquote`, `citation` | Blockquote |
| **Divider** | `hr`, `divider`, `separator`, `line`, `---` | Horizontal line |

### ✅ Design Guidelines Compliance

#### Theme-Aware
- ✅ Uses design tokens: `background.surface`, `neutral.softBg`, `text.primary`, etc.
- ✅ Works seamlessly in both Dark and Light modes
- ✅ No hardcoded colors

#### Typography
- ✅ Fully internationalized (i18n) - all text uses translation keys
- ✅ Sentence case for descriptions ("Plain text paragraph")
- ✅ Title Case for command labels ("Heading 1")

#### Layout & Spacing
- ✅ Consistent padding/margins following 8px grid
- ✅ Proper whitespace and breathing room
- ✅ Clean, minimal design

#### Component Design
- ✅ Icons for visual recognition (from `lucide-react`)
- ✅ Compact menu (280-320px width)
- ✅ Subtle borders and shadows
- ✅ Smooth transitions

#### Interaction & Feedback
- ✅ Hover states with `neutral.softHoverBg`
- ✅ Active state highlighting with `primary.500` color
- ✅ Helper text at bottom of menu
- ✅ ARIA labels for accessibility

## Usage Examples

### Basic Usage
1. Type `/` in the editor
2. See all available commands
3. Use arrow keys or mouse to select
4. Press Enter or click to apply

### Filtered Search
- Type `/h1` → Shows only Heading 1
- Type `/title` → Shows Heading 1, Heading 2, Heading 3
- Type `/list` → Shows Bullet list and Numbered list
- Type `/h` → Shows all heading options

### Keyboard Shortcuts
- `↑` / `↓` - Navigate through commands
- `Enter` - Select highlighted command
- `Esc` - Close menu without selecting

## Technical Implementation

### Architecture
- **Plugin-based**: Integrates seamlessly with Lexical's plugin system
- **React Portal**: Menu renders outside editor DOM for proper z-index layering
- **Command registration**: Uses Lexical's command system for keyboard events
- **State management**: React hooks for menu visibility, position, and selection

### Key Files
- `/nowry/src/components/Editor/SlashCommandPlugin.js` - Main plugin
- `/nowry/src/locales/en/translation.json` - Translation keys (English)
- `/nowry/src/components/Books/Editor.js` - Plugin registration

### Code Quality
- ✅ Fully commented with JSDoc
- ✅ Clean, readable JSX
- ✅ Proper error handling
- ✅ Performance optimized (useCallback, proper effect dependencies)
- ✅ No orphaned conditionals or artifacts

## Future Enhancements (Optional)
- [ ] Add more commands (code block, table, image, columns)
- [ ] Command history (recently used)
- [ ] Custom keyboard shortcuts
- [ ] Command favorites/pinning
- [ ] Search highlighting in filtered results

## Translation Support
The feature is fully ready for multi-language support. To add a new language:

1. Copy the `editor.slashCommands` section from `en/translation.json`
2. Paste into your language file (e.g., `fr/translation.json`)
3. Translate all values (keep keys the same)

Example for French:
```json
"editor": {
  "slashCommands": {
    "menuLabel": "Commandes de formatage",
    "heading1": "Titre 1",
    "heading1Desc": "Grand titre de section",
    ...
  }
}
```

## Testing Checklist
- ✅ Menu appears when typing `/`
- ✅ Menu filters when typing after `/`
- ✅ Keyboard navigation works (arrows, enter, esc)
- ✅ Mouse click selection works
- ✅ Slash text is cleaned up after selection
- ✅ Menu positioned correctly
- ✅ Works in Dark mode
- ✅ Works in Light mode
- ✅ All commands execute correctly
- ✅ No console errors
- ✅ Respects pagination (doesn't break SmartPaginationPlugin)

## Production Ready ✅
This feature is fully production-ready:
- Real solution (not a workaround)
- Follows all design guidelines
- Fully internationalized
- Theme-aware
- Accessible
- Well-documented
- Performance optimized
