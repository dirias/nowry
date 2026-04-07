import * as React from 'react'
import { Box, Typography, Stack, Button, IconButton, Snackbar } from '@mui/joy'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BugReportRounded } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import { usePomodoro } from '../../context/PomodoroContext'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'
import Logo from '../../images/logo.png'

const Footer = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showWidget, settings: pomodoroSettings } = usePomodoro()
  const fabVisible = pomodoroSettings?.enabled && !showWidget

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
    { label: t('footer.support.contact'), path: '/contact' }
  ]

  const socialLinks = [
    { label: t('footer.social.tiktok'), href: 'https://www.tiktok.com/@nowry_app', text: 'TT' },
    { label: t('footer.social.instagram'), href: 'https://www.instagram.com/nowry_app/', text: 'IG' },
    { label: t('footer.social.x'), href: 'https://x.com/Nowry_app', text: '𝕏' },
    { label: t('footer.social.facebook'), href: 'https://www.facebook.com/profile.php?id=61575408886765', text: 'FB' }
  ]

  return (
    <>
      <Box
        component='footer'
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.level1',
          pr: fabVisible ? '88px' : 0
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
          {/* Left: logo + copyright */}
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box component='img' src={Logo} alt='Nowry' sx={{ height: 22 }} />
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              © {new Date().getFullYear()} Nowry
            </Typography>
          </Stack>

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

          {/* Right: social icons + optional bug report */}
          <Stack direction='row' spacing={0} alignItems='center'>
            {socialLinks.map((social) => (
              <IconButton
                key={social.label}
                component='a'
                href={social.href}
                target='_blank'
                rel='noopener noreferrer'
                variant='plain'
                color='neutral'
                size='sm'
                aria-label={social.label}
                sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.level2', color: 'text.primary' } }}
              >
                <Typography level='body-xs' fontWeight={700}>
                  {social.text}
                </Typography>
              </IconButton>
            ))}
            {user?.role === 'dev' && (
              <IconButton
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => setBugReportOpen(true)}
                aria-label={t('footer.bugReport')}
                sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.level2', color: 'text.primary' } }}
              >
                <BugReportRounded fontSize='small' />
              </IconButton>
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
