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
  Snackbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemDecorator
} from '@mui/joy'
import LogoutIcon from '@mui/icons-material/Logout'
import {
  AutoStoriesRounded,
  SchoolRounded,
  MenuBookRounded,
  BugReportRounded,
  LogoutRounded,
  MenuRounded,
  CloseRounded,
  PersonRounded,
  SettingsRounded,
  TimelineRounded,
  Timer,
  PlayArrow,
  Pause
} from '@mui/icons-material'
import { usePomodoro } from '../../context/PomodoroContext'
import { useColorScheme } from '@mui/joy/styles'
import Logo from '../../images/logo.png'
import { useTranslation } from 'react-i18next'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'
import { useAuth } from '../../context/AuthContext'

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

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Swipe gesture refs for mobile menu
  const touchStart = React.useRef(null)
  const touchEnd = React.useRef(null)
  const minSwipeDistance = 75 // Minimum swipe distance in px

  // Touch handlers for swipe gestures
  const handleTouchStart = (e) => {
    touchEnd.current = null
    touchStart.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return
    const distance = touchStart.current - touchEnd.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    // Swipe Left (finger moves left) -> Open Menu
    if (isLeftSwipe) {
      setMobileMenuOpen(true)
    }

    // Swipe Right (finger moves right) -> Close Menu (only if open)
    if (isRightSwipe && mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
  }

  // Attach swipe listeners to body on mobile
  React.useEffect(() => {
    const isMobile = window.innerWidth < 900 // md breakpoint
    if (!isMobile) return

    document.body.addEventListener('touchstart', handleTouchStart)
    document.body.addEventListener('touchmove', handleTouchMove)
    document.body.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.body.removeEventListener('touchstart', handleTouchStart)
      document.body.removeEventListener('touchmove', handleTouchMove)
      document.body.removeEventListener('touchend', handleTouchEnd)
    }
  }, [mobileMenuOpen]) // Re-attach when menu state changes

  // Pomodoro
  const { timeLeft, isActive: isTimerActive, showWidget, setShowWidget, settings } = usePomodoro()

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

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
          zIndex: 1100,
          flexShrink: 0,
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
              {/* Pomodoro Timer Button - Desktop */}
              {settings.enabled && (
                <>
                  <IconButton
                    variant='plain'
                    size='sm'
                    onClick={() => setShowWidget(!showWidget)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' },
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      gap: 0.5,
                      px: 1
                    }}
                  >
                    <Timer fontSize='small' />
                    {isTimerActive && formatTime(timeLeft)}
                  </IconButton>
                  {/* Separator */}
                  <Box sx={{ width: 2, height: 24, bgcolor: 'rgba(255,255,255,0.35)', mx: 2 }} />
                </>
              )}

              {[
                { name: t('header.study'), path: '/study', icon: <AutoStoriesRounded /> },
                { name: t('header.cards'), path: '/cards', icon: <SchoolRounded /> },
                { name: t('header.books'), path: '/books', icon: <MenuBookRounded /> },
                { name: t('annualPlanning.title'), path: '/annual-planning', icon: <TimelineRounded /> }
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
          {/* Mobile Menu Button */}
          <IconButton
            variant='plain'
            size='sm'
            onClick={() => setMobileMenuOpen(true)}
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }
            }}
          >
            <MenuRounded />
          </IconButton>

          {user ? (
            <>
              {/* Hide on mobile since we have mobile menu */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                      <PersonRounded sx={{ mr: 1, fontSize: 20 }} />
                      {t('common.profile')}
                    </MenuItem>
                    <MenuItem component={Link} to='/settings'>
                      <SettingsRounded sx={{ mr: 1, fontSize: 20 }} />
                      {t('common.settings')}
                    </MenuItem>
                    <ListDivider />
                    <MenuItem onClick={logout} color='danger'>
                      <LogoutRounded />
                      {t('common.logout')}
                    </MenuItem>
                  </Menu>
                </Dropdown>
              </Box>
            </>
          ) : (
            <>
              {/* Login/Register Buttons - Hide on mobile since we have mobile menu */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
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
              </Box>
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

      {/* Mobile Navigation Drawer */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        anchor='right'
        size='sm'
        sx={{
          '& .MuiDrawer-content': {
            bgcolor: isDark ? 'neutral.900' : 'background.surface'
          }
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography level='title-lg' fontWeight={600}>
            Menu
          </Typography>
          <IconButton variant='plain' size='sm' onClick={() => setMobileMenuOpen(false)}>
            <CloseRounded />
          </IconButton>
        </Box>

        {/* Drawer Content */}
        <Box sx={{ p: 2 }}>
          <List>
            {user ? (
              <>
                {/* Logged-in User Navigation */}
                {[
                  { name: t('header.study'), path: '/study', icon: <AutoStoriesRounded /> },
                  { name: t('header.cards'), path: '/cards', icon: <SchoolRounded /> },
                  { name: t('header.books'), path: '/books', icon: <MenuBookRounded /> },
                  { name: t('annualPlanning.title'), path: '/annual-planning', icon: <TimelineRounded /> }
                ].map((item) => (
                  <ListItem key={item.name}>
                    <ListItemButton component={Link} to={item.path} onClick={() => setMobileMenuOpen(false)} selected={isActive(item.path)}>
                      <ListItemDecorator>{item.icon}</ListItemDecorator>
                      {item.name}
                    </ListItemButton>
                  </ListItem>
                ))}

                <ListDivider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemButton component={Link} to='/profile' onClick={() => setMobileMenuOpen(false)}>
                    <ListItemDecorator>
                      <PersonRounded />
                    </ListItemDecorator>
                    {t('common.profile')}
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton component={Link} to='/settings' onClick={() => setMobileMenuOpen(false)}>
                    <ListItemDecorator>
                      <SettingsRounded />
                    </ListItemDecorator>
                    {t('common.settings')}
                  </ListItemButton>
                </ListItem>

                {/* Pomodoro Timer - Mobile */}
                {settings.enabled && (
                  <>
                    <ListDivider sx={{ my: 1 }} />
                    <ListItem>
                      <ListItemButton
                        onClick={() => {
                          setShowWidget(!showWidget)
                          setMobileMenuOpen(false)
                        }}
                        selected={isTimerActive}
                      >
                        <ListItemDecorator>
                          <Timer />
                        </ListItemDecorator>
                        {isTimerActive ? `Pomodoro (${formatTime(timeLeft)})` : 'Pomodoro Timer'}
                      </ListItemButton>
                    </ListItem>
                  </>
                )}

                <ListDivider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemButton
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                    }}
                    color='danger'
                  >
                    <ListItemDecorator>
                      <LogoutRounded />
                    </ListItemDecorator>
                    {t('common.logout')}
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <>
                {/* Logged-out User Navigation */}
                <ListItem>
                  <ListItemButton component={Link} to='/about' onClick={() => setMobileMenuOpen(false)}>
                    {t('header.about')}
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton component={Link} to='/contact' onClick={() => setMobileMenuOpen(false)}>
                    {t('header.contact')}
                  </ListItemButton>
                </ListItem>
                <ListDivider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemButton component={Link} to='/login' onClick={() => setMobileMenuOpen(false)}>
                    {t('auth.signIn')}
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton component={Link} to='/register' onClick={() => setMobileMenuOpen(false)}>
                    {t('auth.signUp')}
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  )
}

export default Header
