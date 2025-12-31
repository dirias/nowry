import { extendTheme } from '@mui/joy/styles'

const primaryMain = '#2a6971'
const primaryHover = '#245a63'
const primaryActive = '#1e4c54'

const yellowAccent = '#ffcc00'
const yellowHover = '#ffdb4d'

const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          plainColor: primaryMain,
          plainHoverBg: '#edf7f8',
          plainActiveBg: '#d9eff1',
          solidBg: primaryMain,
          solidHoverBg: primaryHover,
          solidActiveBg: primaryActive,
          solidColor: '#fff',
          softBg: '#e6f3f4',
          softHoverBg: '#d3ebed',
          softActiveBg: '#c0e3e6',
          softColor: primaryMain,
          outlinedBorder: '#a9d2d5',
          outlinedHoverBg: '#e1eff0'
        },
        success: {
          solidBg: yellowAccent,
          solidHoverBg: yellowHover,
          solidColor: '#000'
        },
        neutral: {
          plainHoverBg: yellowHover
        },
        background: {
          body: '#ffffff',
          surface: '#f9f9f9',
          popup: '#ffffff'
        },
        text: {
          primary: '#1c1c1c',
          secondary: '#444',
          tertiary: '#777'
        }
      }
    },
    dark: {
      palette: {
        primary: {
          plainColor: '#88c9d1',
          plainHoverBg: '#1c444a',
          solidBg: '#1e4c54',
          solidHoverBg: '#245a63',
          solidActiveBg: '#347f8a',
          solidColor: '#fff',
          softBg: '#17393d',
          softHoverBg: '#1c444a',
          softColor: '#bde4e9'
        },
        background: {
          body: '#0d1117',
          surface: '#161b22',
          popup: '#1e242c'
        },
        text: {
          primary: '#e6edf3',
          secondary: '#9ba9b4',
          tertiary: '#7d8590'
        }
      }
    }
  },
  // 🔥 This stops MUI Joy from merging its built-in blue palette
  shouldSkipGeneratingVar: (keys) => keys[0] === 'colorSchemes'
})

export default theme
