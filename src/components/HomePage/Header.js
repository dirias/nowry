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
  Pause,
  Brightness4,
  Brightness7,
  LoginRounded,
  PersonAddRounded
} from '@mui/icons-material'
import { usePomodoro } from '../../context/PomodoroContext'
import { useColorScheme } from '@mui/joy/styles'
import Logo from '../../images/logo.png'
import { useTranslation } from 'react-i18next'
import BugReportModal from '../Bugs/BugReportModal'
import { bugsService } from '../../api/services/bugs.service'
import { useAuth } from '../../context/AuthContext'

const HeaderUtils = ({ variant = 'header' }) => {
  const { mode, setMode } = useColorScheme()
  const { i18n, t } = useTranslation()
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' },
    { code: 'de', label: 'DE' },
    { code: 'ja', label: 'JA' }
  ]

  const isDrawer = variant === 'drawer'
  const colorSx = isDrawer
    ? {
        color: 'text.secondary',
        '&:hover': { bgcolor: 'background.level2', color: 'text.primary' }
      }
    : {
        color: 'rgba(255, 255, 255, 0.9)',
        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
      }

  return (
    <Stack direction='row' spacing={0.5} alignItems='center'>
      <Dropdown>
        <MenuButton variant='plain' size='sm' sx={{ minWidth: 'unset', px: 1, ...colorSx }}>
          {(languages.find((l) => l.code === i18n.language) || languages[0]).label}
        </MenuButton>
        <Menu size='sm' sx={{ zIndex: 99999, minWidth: 100 }}>
          {languages.map((lang) => (
            <MenuItem key={lang.code} onClick={() => i18n.changeLanguage(lang.code)} selected={i18n.language === lang.code}>
              {lang.label}
            </MenuItem>
          ))}
        </Menu>
      </Dropdown>
      <IconButton
        variant='plain'
        size='sm'
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        sx={colorSx}
        aria-label={t('common.toggleTheme')}
      >
        {mode === 'dark' ? <Brightness7 fontSize='small' /> : <Brightness4 fontSize='small' />}
      </IconButton>
    </Stack>
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

    if (isLeftSwipe) {
      setMobileMenuOpen(true)
    }

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
  }, [mobileMenuOpen])

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

  const navLinkSx = (path) => ({
    fontWeight: isActive(path) ? 600 : 400,
    color: isActive(path) ? 'white' : 'rgba(255, 255, 255, 0.72)',
    bgcolor: isActive(path) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
    borderRadius: 'md',
    px: 1.5,
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.10)',
      color: 'white'
    }
  })

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
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.solidHoverBg : theme.palette.primary.solidBg,
          opacity: 0.95,
          boxShadow: theme.palette.mode === 'dark' ? 'md' : 'lg',
          color: 'white'
        })}
      >
        {/* Logo */}
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

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Desktop Navigation */}
        <Stack direction='row' spacing={1} alignItems='center' sx={{ display: { xs: 'none', md: 'flex' } }}>
          {user ? (
            <>
              {/* Browse - logged nav, with icon */}
              <Button component={Link} to='/browse' variant='plain' size='sm' startDecorator={<SchoolRounded />} sx={navLinkSx('/browse')}>
                {t('public.browse')}
              </Button>
              {[
                { name: t('header.study'), path: '/study', icon: <AutoStoriesRounded /> },
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
                  sx={navLinkSx(item.path)}
                >
                  {item.name}
                </Button>
              ))}
            </>
          ) : (
            <>
              <Button variant='plain' component={Link} to='/browse' size='sm' sx={navLinkSx('/browse')}>
                {t('public.browse')}
              </Button>
              <Button variant='plain' component={Link} to='/about' size='sm' sx={navLinkSx('/about')}>
                {t('header.about')}
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
            aria-label={t('header.drawer.menu')}
          >
            <MenuRounded />
          </IconButton>

          {user ? (
            <>
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
                      border: '2px solid',
                      borderColor: 'divider'
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
                    {settings.enabled && (
                      <MenuItem onClick={() => setShowWidget(!showWidget)}>
                        <Timer sx={{ mr: 1, fontSize: 20 }} />
                        {isTimerActive ? `Pomodoro (${formatTime(timeLeft)})` : t('common.pomodoro')}
                      </MenuItem>
                    )}
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
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
                <Button
                  component={Link}
                  to='/login'
                  variant='plain'
                  size='sm'
                  sx={{
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.88)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.10)', color: 'white' }
                  }}
                >
                  {t('auth.signIn')}
                </Button>
                <Button
                  component={Link}
                  to='/register'
                  variant='solid'
                  size='sm'
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'white',
                    color: 'primary.solidBg',
                    borderRadius: 'xl',
                    px: 2.5,
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.92)' }
                  }}
                >
                  {t('header.getStarted')}
                </Button>
                <HeaderUtils />
              </Box>
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
            bgcolor: 'background.surface'
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
            {t('header.drawer.menu')}
          </Typography>
          <IconButton variant='plain' size='sm' onClick={() => setMobileMenuOpen(false)} aria-label={t('common.close')}>
            <CloseRounded />
          </IconButton>
        </Box>

        {/* Drawer Content */}
        <Box sx={{ p: 2 }}>
          <List>
            {/* Browse - logged nav only (non-logged branch renders its own Browse) */}
            {user && (
              <ListItem>
                <ListItemButton
                  component={Link}
                  to='/browse'
                  onClick={() => setMobileMenuOpen(false)}
                  selected={isActive('/browse')}
                  sx={{
                    bgcolor: isActive('/browse') ? 'primary.softBg' : 'transparent'
                  }}
                >
                  <ListItemDecorator>
                    <SchoolRounded />
                  </ListItemDecorator>
                  {t('public.browse')}
                </ListItemButton>
              </ListItem>
            )}

            {user && <ListDivider sx={{ my: 1 }} />}

            {user ? (
              <>
                {[
                  { name: t('header.study'), path: '/study', icon: <AutoStoriesRounded /> },
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
                        {isTimerActive ? `Pomodoro (${formatTime(timeLeft)})` : t('common.pomodoro')}
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
                {/* Get Started */}
                <ListItem>
                  <ListItemButton
                    component={Link}
                    to='/register'
                    onClick={() => setMobileMenuOpen(false)}
                    color='primary'
                    sx={{ borderRadius: 'sm', fontWeight: 700 }}
                  >
                    <ListItemDecorator>
                      <PersonAddRounded />
                    </ListItemDecorator>
                    {t('header.getStarted')}
                  </ListItemButton>
                </ListItem>

                {/* Sign In */}
                <ListItem>
                  <ListItemButton component={Link} to='/login' onClick={() => setMobileMenuOpen(false)} sx={{ borderRadius: 'sm' }}>
                    <ListItemDecorator>
                      <LoginRounded />
                    </ListItemDecorator>
                    {t('auth.signIn')}
                  </ListItemButton>
                </ListItem>

                <ListDivider sx={{ my: 1 }} />

                {/* Nav links */}
                <ListItem>
                  <ListItemButton
                    component={Link}
                    to='/browse'
                    onClick={() => setMobileMenuOpen(false)}
                    selected={isActive('/browse')}
                    sx={{ borderRadius: 'sm' }}
                  >
                    <ListItemDecorator>
                      <SchoolRounded />
                    </ListItemDecorator>
                    {t('public.browse')}
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton
                    component={Link}
                    to='/about'
                    onClick={() => setMobileMenuOpen(false)}
                    selected={isActive('/about')}
                    sx={{ borderRadius: 'sm' }}
                  >
                    <ListItemDecorator>
                      <MenuBookRounded />
                    </ListItemDecorator>
                    {t('header.about')}
                  </ListItemButton>
                </ListItem>

                <ListDivider sx={{ my: 1 }} />

                {/* Utilities */}
                <ListItem>
                  <HeaderUtils variant='drawer' />
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
