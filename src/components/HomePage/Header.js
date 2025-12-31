// src/components/Header/Header.js
import * as React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Sheet,
  Stack,
  Avatar,
  Tooltip,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListDivider,
  Snackbar
} from '@mui/joy'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import BugReportIcon from '@mui/icons-material/BugReport'
import { useColorScheme } from '@mui/joy/styles'
import Logo from '../../images/logo.png'
import { useTranslation } from 'react-i18next'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'
import { useAuth } from '../../context/AuthContext'

// 🌗 Theme toggle button
const ModeToggle = () => {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
      <IconButton
        variant='plain'
        size='sm'
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        sx={{
          borderRadius: 'sm',
          color: 'rgba(255, 255, 255, 0.9)',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }
        }}
      >
        {isDark ? <Brightness7Icon fontSize='small' /> : <Brightness4Icon fontSize='small' />}
      </IconButton>
    </Tooltip>
  )
}

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout: contextLogout } = useAuth()
  const isLoggedIn = !!user
  const { t } = useTranslation()

  // Bug report state
  const [bugReportOpen, setBugReportOpen] = React.useState(false)
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', color: 'success' })

  const logout = async () => {
    await contextLogout()
    navigate('/')
    // Window reload is handled by context/state update usually, but if needed for cleaning state:
    // window.location.reload()
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

  const isActive = (path) => location.pathname === path

  return (
    <>
      <Sheet
        component='header'
        sx={(theme) => ({
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 2, md: 4 },
          py: 1.5,
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          backdropFilter: 'blur(12px)',
          // Use theme colors dynamically
          backgroundColor:
            theme.palette.mode === 'dark'
              ? theme.palette.primary.solidHoverBg // Uses #245a63 from your theme
              : theme.palette.primary.solidBg, // Uses #2a6971 from your theme
          opacity: 0.95,
          boxShadow: theme.palette.mode === 'dark' ? 'md' : 'lg',
          color: 'white' // Ensure text is readable on teal background
        })}
      >
        {/* Logo + Title */}
        <Box
          component={Link}
          to={isLoggedIn ? '/' : '/'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 0.8 }
          }}
        >
          <Box component='img' src={Logo} alt='Nowry logo' sx={{ height: 40 }} />
        </Box>

        {/* Navigation */}
        <Stack direction='row' spacing={{ xs: 0.5, md: 1 }} alignItems='center'>
          {!isLoggedIn ? (
            <>
              <Button
                variant='plain'
                component={Link}
                to='/about'
                size='sm'
                sx={{
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }
                }}
              >
                About
              </Button>
              <Button
                variant='plain'
                component={Link}
                to='/contact'
                size='sm'
                sx={{
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }
                }}
              >
                Contact
              </Button>
              <Button variant='solid' color='success' component={Link} to='/login' size='sm' sx={{ ml: 1 }}>
                Sign In
              </Button>
            </>
          ) : (
            <>
              <Button
                variant='plain'
                component={Link}
                to='/study'
                size='sm'
                sx={{
                  fontWeight: isActive('/study') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/study') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('header.study')}
              </Button>
              <Button
                variant='plain'
                component={Link}
                to='/cards'
                size='sm'
                sx={{
                  fontWeight: isActive('/cards') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/cards') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('header.cards')}
              </Button>
              <Button
                variant='plain'
                component={Link}
                to='/books'
                size='sm'
                sx={{
                  fontWeight: isActive('/books') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/books') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('header.books')}
              </Button>

              <Box sx={{ width: 1, height: 24, bgcolor: 'divider', mx: 1 }} />

              <ModeToggle />

              {/* User Menu */}
              <Dropdown>
                <MenuButton
                  slots={{ root: IconButton }}
                  slotProps={{
                    root: {
                      variant: 'plain',
                      color: 'neutral',
                      size: 'sm',
                      sx: { borderRadius: '50%' }
                    }
                  }}
                >
                  <Avatar
                    size='sm'
                    variant='solid'
                    color='primary'
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                </MenuButton>
                <Menu
                  placement='bottom-end'
                  size='sm'
                  sx={{
                    zIndex: '9999', // Ensure it sits on top of everything
                    minWidth: 200,
                    boxShadow: 'lg', // Stronger shadow for depth
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 1
                  }}
                >
                  <Box sx={{ px: 1, py: 0.5, mb: 1 }}>
                    <Typography level='title-sm' fontWeight={700}>
                      {user?.username}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                      Manage account
                    </Typography>
                  </Box>
                  <MenuItem onClick={() => navigate('/profile')} sx={{ borderRadius: 'sm' }}>
                    <PersonIcon fontSize='small' sx={{ mr: 1 }} />
                    {t('common.profile')}
                  </MenuItem>
                  <MenuItem onClick={() => navigate('/settings')} sx={{ borderRadius: 'sm' }}>
                    <SettingsIcon fontSize='small' sx={{ mr: 1 }} />
                    {t('header.settings')}
                  </MenuItem>

                  {/* Dev-only Bug Dashboard */}
                  {(user?.role === 'dev' || user?.role === 'beta') && (
                    <MenuItem onClick={() => navigate('/bugs/dashboard')} sx={{ borderRadius: 'sm' }}>
                      <BugReportIcon fontSize='small' sx={{ mr: 1 }} />
                      Bug Dashboard
                    </MenuItem>
                  )}

                  <ListDivider />
                  <MenuItem onClick={logout} color='danger' variant='soft' sx={{ borderRadius: 'sm', mt: 0.5 }}>
                    <LogoutIcon fontSize='small' sx={{ mr: 1 }} />
                    {t('common.logout')}
                  </MenuItem>
                </Menu>
              </Dropdown>

              {/* Separator */}
              <Box sx={{ width: 1, height: 24, bgcolor: 'divider', mx: 1 }} />

              {/* Bug Report Button */}
              <Tooltip title='Report a Bug'>
                <IconButton
                  variant='soft'
                  color='warning'
                  size='sm'
                  onClick={() => setBugReportOpen(true)}
                  sx={{
                    borderRadius: 'sm',
                    '&:hover': {
                      bgcolor: 'rgba(255, 200, 100, 0.2)'
                    }
                  }}
                >
                  <BugReportIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </>
          )}
          {!isLoggedIn && <ModeToggle />}
        </Stack>
      </Sheet>

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

export default Header
