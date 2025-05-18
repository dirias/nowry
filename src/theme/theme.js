// src/theme/theme.js
import { extendTheme } from '@mui/joy/styles'

const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          500: '#096871',
          solidBg: '#096871',
          solidColor: '#fff',
          plainColor: '#096871'
        },
        success: {
          500: '#fbdb6b',
          softBg: '#fbdb6b',
          softColor: '#000'
        },
        neutral: {
          plainHoverBg: '#facf39'
        },
        background: {
          body: '#ffffff'
        }
      }
    },
    dark: {
      palette: {
        primary: {
          500: '#50e5dc',
          solidBg: '#50e5dc',
          solidColor: '#000',
          plainColor: '#50e5dc'
        },
        success: {
          500: '#ffd966',
          softBg: '#ffd966',
          softColor: '#000'
        },
        neutral: {
          plainHoverBg: '#facf39'
        },
        background: {
          body: '#121212'
        }
      }
    }
  },
  typography: {
    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif'
  }
})

export default theme
