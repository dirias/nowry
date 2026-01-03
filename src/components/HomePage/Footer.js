import * as React from 'react'
import { Box, Typography, Divider, useColorScheme, Stack, Button, Dropdown, MenuButton, Menu, MenuItem, IconButton } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { Language as LanguageIcon, Brightness4, Brightness7 } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { userService } from '../../api/services'

const Footer = () => {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ja', label: '日本語' }
  ]

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = async (langCode) => {
    i18n.changeLanguage(langCode)

    if (user) {
      try {
        await userService.updateGeneralPreferences({ language: langCode })
      } catch (error) {
        console.error('Failed to sync language preference:', error)
      }
    }
  }

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark')
  }

  return (
    <Box
      component='footer'
      sx={{
        py: 3,
        mt: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: isDark ? 'neutral.900' : 'background.level1'
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems='center'
        justifyContent='space-between'
        sx={{ maxWidth: 1200, mx: 'auto', px: 2 }}
      >
        {/* Copyright */}
        <Typography level='body-sm' color='neutral'>
          © {new Date().getFullYear()} Nowry — {t('footer.rights')}
        </Typography>

        {/* Language & Theme Selector */}
        <Stack
          direction='row'
          spacing={1.5}
          alignItems='center'
          divider={
            <Typography level='body-sm' sx={{ color: 'neutral.plainColor' }}>
              |
            </Typography>
          }
        >
          {/* Language Dropdown */}
          <Dropdown>
            <MenuButton
              variant='plain'
              size='sm'
              startDecorator={<LanguageIcon fontSize='small' />}
              sx={{
                fontWeight: 500,
                color: 'neutral.plainColor',
                '&:hover': { bgcolor: isDark ? 'neutral.800' : 'neutral.100' }
              }}
            >
              {currentLanguage.label}
            </MenuButton>
            <Menu
              placement='top-end'
              size='sm'
              sx={{
                minWidth: 160,
                zIndex: 99999
              }}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)} selected={i18n.language === lang.code}>
                  {lang.label}
                </MenuItem>
              ))}
            </Menu>
          </Dropdown>

          {/* Theme Toggle */}
          <Button
            variant='plain'
            size='sm'
            startDecorator={isDark ? <Brightness7 fontSize='small' /> : <Brightness4 fontSize='small' />}
            onClick={toggleTheme}
            sx={{
              fontWeight: 500,
              color: 'neutral.plainColor',
              '&:hover': { bgcolor: isDark ? 'neutral.800' : 'neutral.100' }
            }}
          >
            {isDark ? 'Light' : 'Dark'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default Footer
