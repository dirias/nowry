import * as React from 'react'
import {
  Box,
  Typography,
  Divider,
  useColorScheme,
  Stack,
  Button,
  Dropdown,
  MenuButton,
  Menu,
  MenuItem,
  IconButton,
  Snackbar
} from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { Language as LanguageIcon, Brightness4, Brightness7, BugReportRounded } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { usePomodoro } from '../../context/PomodoroContext'
import { userService } from '../../api/services'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'

const Footer = () => {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { showWidget, settings: pomodoroSettings } = usePomodoro()
  const fabVisible = pomodoroSettings?.enabled && !showWidget

  // Bug report state
  const [bugReportOpen, setBugReportOpen] = React.useState(false)
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', color: 'success' })

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

  const handleBugSubmit = async (bugData) => {
    const response = await bugsService.submitBug(bugData)
    setSnackbar({
      open: true,
      message: response.message || 'Bug report submitted successfully!',
      color: 'success'
    })
    setBugReportOpen(false)
  }

  return (
    <>
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
          sx={{ maxWidth: 1200, mx: 'auto', px: 2, pr: fabVisible ? '88px' : 2 }}
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

            {/* Bug Report - Only for dev users */}
            {user && user.role === 'dev' && (
              <Button
                variant='plain'
                size='sm'
                startDecorator={<BugReportRounded fontSize='small' />}
                onClick={() => setBugReportOpen(true)}
                sx={{
                  fontWeight: 500,
                  color: 'neutral.plainColor',
                  '&:hover': { bgcolor: isDark ? 'neutral.800' : 'neutral.100' }
                }}
              >
                Report Bug
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Bug Report Modal */}
      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} onSubmit={handleBugSubmit} />

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        color={snackbar.color}
        variant='soft'
      >
        {snackbar.message}
      </Snackbar>
    </>
  )
}

export default Footer
