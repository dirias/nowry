# 🎨 Nowry Color System Documentation

## Overview

Nowry uses a **centralized, dynamic color system** that generates complete, professional color schemes from a single primary color chosen by the user. No colors are hardcoded anywhere in the application.

## Architecture

### Single Source of Truth

```
User Preference (#2a6971) 
    ↓
colorSchemeGenerator.js (Algorithm)
    ↓
Complete Color Palette (Primary, Success, Warning, Danger, etc.)
    ↓
DynamicThemeProvider
    ↓
All Components
```

## Key Files

### 1. `theme/colorSchemeGenerator.js`
**Purpose**: Professional color scheme generator using color theory

**Features**:
- Converts primary color to complete palette
- Generates harmonious accent colors (success, warning, danger)
- Creates proper shades & tints for all states (hover, active, soft, etc.)
- Supports both light and dark modes
- Based on HSL color space for precise control

**Main Functions**:
```javascript
generateColorScheme(primaryColor) // Returns complete theme palette
getColorPresets() // Returns curated color options
getColorName(hex) // Suggests color name based on hue
```

### 2. `theme/DynamicThemeProvider.js`
**Purpose**: React context provider for dynamic theming

**Features**:
- Fetches user's color preference from backend
- Generates theme using `colorSchemeGenerator`
- Provides theme to entire app via Material UI Joy
- Allows runtime color changes

**Default Color**: `#2a6971` (Ocean Teal)

### 3. `theme/theme.js`
**Purpose**: Base theme configuration

**Contains**:
- Typography settings
- Spacing rules
- Border radius values
- Shadow definitions
- **Note**: Color values here are fallbacks only

## Color Theory Implementation

### Primary Color Processing

1. **User selects primary color** (e.g., `#2a6971`)
2. **Algorithm generates variations**:
   - **Darker**: For hover states (`-8%` lightness)
   - **Darkest**: For active states (`-15%` lightness)
   - **Lighter**: For soft backgrounds (`+35%` lightness, reduced saturation)
   - **Lightest**: For hover on soft (`+45%` lightness)
   - **Very Light**: For subtle backgrounds (97% lightness)

### Accent Colors (Color Harmony)

Following professional UI/UX standards:

- **Success**: Green (#4caf50 region) - Universal positive indicator
- **Warning**: Yellow-Orange (#ff9800 region) - Attention without alarm
- **Danger**: Red (#f44336 region) - Clear danger signal

These colors are **independent of primary** to ensure:
- Consistent UX across all themes
- Accessibility (proper contrast ratios)
- Universal color associations

## Usage in Components

### ✅ Correct (Dynamic)
```javascript
// Use theme colors
sx={{ 
  backgroundColor: 'primary.solidBg',
  color: 'primary.solidColor',
  '&:hover': { backgroundColor: 'primary.solidHoverBg' }
}}
```

### ❌ Incorrect (Hardcoded)
```javascript
// Never hardcode colors!
sx={{ 
  backgroundColor: '#2a6971',
  color: 'white',
  '&:hover': { backgroundColor: '#245a63' }
}}
```

## Available Color Tokens

### Primary Palette
- `primary.plainColor` - For text/icons
- `primary.plainHoverBg` - Hover background for plain variant
- `primary.solidBg` - Solid button/component background
- `primary.solidHoverBg` - Hover state for solid
- `primary.solidColor` - Text on solid background (usually white)
- `primary.softBg` - Soft/subtle background
- `primary.softColor` - Text on soft background
- `primary.outlinedBorder` - Border color for outlined variant

### Success, Warning, Danger
Same structure as primary:
- `success.solidBg`, `success.solidHoverBg`, `success.softBg`, etc.
- `warning.solidBg`, `warning.solidHoverBg`, `warning.softBg`, etc.
- `danger.solidBg`, `danger.solidHoverBg`, `danger.softBg`, etc.

### Neutral & Background
- `background.body` - Main page background
- `background.surface` - Card/panel background
- `background.popup` - Modal/dropdown background
- `text.primary` - Main text color
- `text.secondary` - Secondary text color
- `text.tertiary` - Tertiary/muted text color

## User Customization Flow

1. **Onboarding/Settings**: User picks primary color
2. **Save to Backend**: Color stored in user preferences
3. **DynamicThemeProvider**: Fetches and applies on load
4. **Real-time Update**: Changes reflect immediately

## Accessibility

All generated colors ensure:
- **WCAG AA compliance** for text contrast
- **Consistent indicators** (green=success, red=danger)
- **Dark mode support** with proper adjustments

## Future Enhancements

### Planned Features
- ✅ AI-powered color scheme suggestions
- ✅ Color palette validation & accessibility scoring
- ✅ Export/import color schemes
- ✅ Pre-made designer palettes
- ✅ Color scheme marketplace

### AI Integration Ideas
```javascript
// Future: AI-suggested complementary colors
const aiSuggestions = await generateAIColorScheme({
  primary: userColor,
  context: 'learning platform',
  mood: 'calm and focused',
  accessibility: 'AAA'
})
```

## Best Practices

1. **Never hardcode colors** - Always use theme tokens
2. **Test in both modes** - Verify light and dark themes
3. **Use semantic colors** - `success` for positive, `danger` for negative
4. **Check contrast** - Ensure readability on all backgrounds
5. **Document custom colors** - If adding new tokens, document them

## Examples

### Button with Primary Color
```javascript
<Button color="primary" variant="solid">
  Click Me
</Button>
```

### Custom Card with Theme Colors
```javascript
<Card
  sx={{
    backgroundColor: 'primary.softBg',
    borderColor: 'primary.outlinedBorder',
    '&:hover': {
      backgroundColor: 'primary.softHoverBg',
      transform: 'translateY(-2px)'
    }
  }}
>
  Content
</Card>
```

### Header with Dynamic Background
```javascript
<Sheet
  sx={(theme) => ({
    backgroundColor: theme.palette.primary.solidBg,
    color: 'white',
    opacity: 0.95
  })}
>
  Header Content
</Sheet>
```

## Debugging

### Check Current Theme Color
```javascript
// In any component
const { themeColor } = useThemePreferences()
console.log('Current theme color:', themeColor)
```

### View Generated Palette
```javascript
import { generateColorScheme } from './theme/colorSchemeGenerator'

const palette = generateColorScheme('#2a6971')
console.log(palette)
```

---

**Last Updated**: December 2024
**Maintained By**: Nowry Development Team
