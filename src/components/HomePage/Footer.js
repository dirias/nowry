import * as React from 'react'
import { Box, Typography, Divider, useColorScheme, Stack, Button, Dropdown, MenuButton, Menu, MenuItem } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { Language as LanguageIcon } from '@mui/icons-material'

const Footer = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
  const { t, i18n } = useTranslation()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ja', label: '日本語' }
  ]

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
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

        {/* Language Selector */}
        <Dropdown>
          <MenuButton
            variant='plain'
            size='sm'
            startDecorator={<LanguageIcon fontSize='small' />}
            sx={{
              fontWeight: 500,
              color: 'neutral.600',
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
      </Stack>
    </Box>
  )
}

export default Footer
