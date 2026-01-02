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
import { AutoStoriesRounded, SchoolRounded, MenuBookRounded, BugReportRounded, LogoutRounded } from '@mui/icons-material'
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
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

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
          to='/'
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

        {/* Spacer to push navigation to the right */}
        <Box sx={{ flex: 1 }} />

        {/* Navigation Links - Right aligned */}
        <Stack direction='row' spacing={1} alignItems='center' sx={{ display: { xs: 'none', md: 'flex' } }}>
          {user ? (
            <>
              {[
                { name: t('header.study'), path: '/study', icon: <AutoStoriesRounded /> },
                { name: t('header.cards'), path: '/cards', icon: <SchoolRounded /> },
                { name: t('header.books'), path: '/books', icon: <MenuBookRounded /> }
              ].map((item) => (
                <Button
                  key={item.name}
                  component={Link}
                  to={item.path}
                  variant='plain'
                  size='sm'
                  startDecorator={item.icon}
                  sx={{
                    fontWeight: isActive(item.path) ? 600 : 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                    textDecoration: isActive(item.path) ? 'underline' : 'none',
                    textUnderlineOffset: '4px',
                    textDecorationThickness: '2px',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }
                  }}
                >
                  {item.name}
                </Button>
              ))}
            </>
          ) : (
            <>
              <Button
                variant='plain'
                component={Link}
                to='/about'
                size='sm'
                sx={{
                  fontWeight: isActive('/about') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/about') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('header.about')}
              </Button>
              <Button
                variant='plain'
                component={Link}
                to='/contact'
                size='sm'
                sx={{
                  fontWeight: isActive('/contact') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/contact') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('header.contact')}
              </Button>
            </>
          )}
        </Stack>

        {/* Right Section */}
        <Stack direction='row' spacing={1.5} alignItems='center'>
          {user ? (
            <>
              <Dropdown>
                <MenuButton
                  variant='plain'
                  size='sm'
                  sx={{
                    maxWidth: '32px',
                    maxHeight: '32px',
                    borderRadius: '9999999px',
                    p: 0,
                    minHeight: 'unset',
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <Avatar
                    src={user.avatar}
                    sx={{
                      maxWidth: '32px',
                      maxHeight: '32px'
                    }}
                  />
                </MenuButton>
                <Menu
                  placement='bottom-end'
                  size='sm'
                  sx={{
                    zIndex: '99999',
                    p: 1,
                    gap: 1,
                    '--ListItem-radius': 'var(--joy-radius-sm)'
                  }}
                >
                  <MenuItem>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar src={user.avatar} sx={{ mr: 2 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography level='title-sm'>{user.name}</Typography>
                        <Typography level='body-xs' noWrap>
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <ListDivider />
                  <MenuItem component={Link} to='/profile'>
                    {t('common.profile')}
                  </MenuItem>
                  <MenuItem component={Link} to='/settings'>
                    {t('common.settings')}
                  </MenuItem>
                  <ListDivider />
                  <MenuItem onClick={logout} color='danger'>
                    <LogoutRounded />
                    {t('common.logout')}
                  </MenuItem>
                </Menu>
              </Dropdown>
              <ModeToggle />
            </>
          ) : (
            <>
              {/* Login/Register Buttons */}
              <Button
                component={Link}
                to='/login'
                variant='plain'
                size='sm'
                sx={{
                  fontWeight: isActive('/login') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/login') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('auth.signIn')}
              </Button>
              <Button
                component={Link}
                to='/register'
                variant='plain'
                size='sm'
                sx={{
                  fontWeight: isActive('/register') ? 600 : 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textDecoration: isActive('/register') ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                  textDecorationThickness: '2px',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }
                }}
              >
                {t('auth.signUp')}
              </Button>
              <ModeToggle />
            </>
          )}

          {/* Bug Report Button - Only for logged dev users */}
          {user && user.role === 'dev' && (
            <>
              {/* Separator */}
              <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(255,255,255,0.2)', mx: 1 }} />

              <Tooltip title='Report a Bug'>
                <IconButton
                  variant='plain'
                  size='sm'
                  onClick={() => setBugReportOpen(true)}
                  sx={{
                    borderRadius: 'sm',
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }
                  }}
                >
                  <BugReportRounded fontSize='small' />
                </IconButton>
              </Tooltip>
            </>
          )}
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
