import * as React from 'react'
import { Box, Typography, Stack, Button, IconButton, Snackbar, Tooltip, Select, Option, Divider, SvgIcon } from '@mui/joy'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BugReportRounded, Brightness4, Brightness7, LanguageRounded } from '@mui/icons-material'
import { useColorScheme } from '@mui/joy/styles'
import { useAuth } from '../../context/AuthContext'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'

const InstagramIcon = () => (
  <SvgIcon sx={{ fontSize: 18 }}>
    <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
  </SvgIcon>
)

const XIcon = () => (
  <SvgIcon sx={{ fontSize: 18 }}>
    <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
  </SvgIcon>
)

const FacebookIcon = () => (
  <SvgIcon sx={{ fontSize: 18 }}>
    <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
  </SvgIcon>
)

const TikTokIcon = () => (
  <SvgIcon sx={{ fontSize: 18 }}>
    <path d='M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' />
  </SvgIcon>
)

const Footer = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { mode, setMode } = useColorScheme()

  const [bugReportOpen, setBugReportOpen] = React.useState(false)
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', color: 'success' })

  const handleBugSubmit = async (bugData) => {
    const response = await bugsService.submitBug(bugData)
    setSnackbar({ open: true, message: response.message || 'Bug report submitted successfully!', color: 'success' })
    setBugReportOpen(false)
  }

  const navLinks = [
    { label: t('footer.links.browse'), path: '/browse' },
    { label: t('footer.links.about'), path: '/about' },
    { label: t('footer.support.contact'), path: '/contact' },
    { label: t('footer.links.privacy'), path: '/privacy' },
    { label: t('footer.links.terms'), path: '/terms' }
  ]

  const socialLinks = [
    { key: 'tiktok', icon: <TikTokIcon />, href: 'https://www.tiktok.com/@nowry_app' },
    { key: 'instagram', icon: <InstagramIcon />, href: 'https://www.instagram.com/nowry_app/' },
    { key: 'x', icon: <XIcon />, href: 'https://x.com/Nowry_app' },
    { key: 'facebook', icon: <FacebookIcon />, href: 'https://www.facebook.com/profile.php?id=61575408886765' }
  ]

  return (
    <>
      <Box
        component='footer'
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.level1'
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent='space-between'
          flexWrap='wrap'
          gap={1}
          sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 2 }}
        >
          {/* Left: copyright */}
          <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </Typography>

          {/* Center: nav + support links */}
          <Stack direction='row' spacing={0} alignItems='center' flexWrap='wrap'>
            {navLinks.map((link) => (
              <Button
                key={link.path}
                component={Link}
                to={link.path}
                variant='plain'
                color='neutral'
                size='sm'
                sx={{ color: 'text.secondary', fontWeight: 400, px: 1, '&:hover': { color: 'text.primary', bgcolor: 'background.level2' } }}
              >
                {link.label}
              </Button>
            ))}
            <Button
              component='a'
              href='mailto:support@nowry.app'
              variant='plain'
              color='neutral'
              size='sm'
              sx={{ color: 'text.secondary', fontWeight: 400, px: 1, '&:hover': { color: 'text.primary', bgcolor: 'background.level2' } }}
            >
              {t('footer.support.email')}
            </Button>
          </Stack>

          {/* Right: language + theme + social icons + optional bug report */}
          <Stack direction='row' spacing={0} alignItems='center'>
            {/* Language switcher */}
            <Tooltip title={t('footer.language')} placement='top'>
              <Select
                size='sm'
                variant='plain'
                value={i18n.language?.split('-')[0] || 'en'}
                onChange={(_, val) => val && i18n.changeLanguage(val)}
                startDecorator={<LanguageRounded sx={{ fontSize: 16 }} />}
                indicator={null}
                slotProps={{
                  listbox: { placement: 'top', sx: { minWidth: 140 } }
                }}
                aria-label={t('footer.language')}
                sx={{
                  color: 'text.secondary',
                  fontSize: 'sm',
                  px: 0.5,
                  '&:hover': { bgcolor: 'background.level1' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                }}
              >
                <Option value='en'>English</Option>
                <Option value='es'>Español</Option>
                <Option value='fr'>Français</Option>
                <Option value='de'>Deutsch</Option>
                <Option value='ja'>日本語</Option>
              </Select>
            </Tooltip>

            {/* Theme toggle */}
            <Tooltip title={t('footer.toggleTheme')} placement='top'>
              <IconButton
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                aria-label={t('footer.toggleTheme')}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'background.level1' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                }}
              >
                {mode === 'dark' ? <Brightness7 sx={{ fontSize: 18 }} /> : <Brightness4 sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            <Divider orientation='vertical' sx={{ height: 16, mx: 0.5 }} />

            {/* Social icons */}
            {socialLinks.map(({ key, icon, href }) => (
              <Tooltip key={key} title={t(`footer.social.${key}`)} placement='top'>
                <IconButton
                  component='a'
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                  variant='plain'
                  color='neutral'
                  size='sm'
                  aria-label={t(`footer.social.${key}`)}
                  sx={{
                    color: 'text.tertiary',
                    '&:hover': { color: 'text.primary', bgcolor: 'background.level1' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                  }}
                >
                  {icon}
                </IconButton>
              </Tooltip>
            ))}

            {user?.role === 'dev' && (
              <Tooltip title={t('footer.bugReport')} placement='top'>
                <IconButton
                  variant='plain'
                  color='neutral'
                  size='sm'
                  onClick={() => setBugReportOpen(true)}
                  aria-label={t('footer.bugReport')}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'background.level2', color: 'text.primary' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                  }}
                >
                  <BugReportRounded fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} onSubmit={handleBugSubmit} />

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
