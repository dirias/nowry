import React, { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import CssBaseline from '@mui/joy/CssBaseline'

import { generateColorScheme } from './colorSchemeGenerator'
import baseTheme from './theme'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

// Context to allow other components to update theme settings
export const ThemePreferencesContext = createContext({
  themeColor: '#2a6971', // Match base theme teal
  setThemeColor: () => { }
})

export const useThemePreferences = () => useContext(ThemePreferencesContext)

export const DynamicThemeProvider = ({ children }) => {
  const [themeColor, setThemeColor] = useState('#2a6971')
  const { user } = useAuth()
  const { i18n } = useTranslation()

  // Update theme when user changes
  useEffect(() => {
    if (user?.preferences) {
      // Set theme color
      if (user.preferences.theme_color) {
        setThemeColor(user.preferences.theme_color)
      }

      // Set language
      if (user.preferences.language && i18n.language !== user.preferences.language) {
        console.log('🌐 Setting language to:', user.preferences.language)
        i18n.changeLanguage(user.preferences.language)
      }
    }
  }, [user, i18n])

  // Generate dynamic theme based on color
  const dynamicTheme = useMemo(() => {
    const colorScheme = generateColorScheme(themeColor)

    // Merge dynamic palette with base theme
    return extendTheme({
      ...baseTheme,
      colorSchemes: {
        light: {
          palette: {
            ...baseTheme.colorSchemes.light.palette,
            primary: colorScheme.light.primary,
            success: colorScheme.light.success,
            warning: colorScheme.light.warning,
            danger: colorScheme.light.danger,
            neutral: colorScheme.light.neutral,
            background: colorScheme.light.background,
            text: colorScheme.light.text
          }
        },
        dark: {
          palette: {
            ...baseTheme.colorSchemes.dark.palette,
            primary: colorScheme.dark.primary,
            success: colorScheme.dark.success,
            warning: colorScheme.dark.warning,
            danger: colorScheme.dark.danger,
            background: colorScheme.dark.background,
            text: colorScheme.dark.text
          }
        }
      }
    })
  }, [themeColor])

  // Context value
  const contextValue = useMemo(
    () => ({
      themeColor,
      setThemeColor
    }),
    [themeColor]
  )

  return (
    <ThemePreferencesContext.Provider value={contextValue}>
      <CssVarsProvider theme={dynamicTheme} defaultMode='light' disableNestedContext>
        <CssBaseline />
        {children}
      </CssVarsProvider>
    </ThemePreferencesContext.Provider>
  )
}
