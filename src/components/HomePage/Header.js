// src/components/Header/Header.js
import * as React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Button, IconButton, Sheet, Stack, Avatar, Tooltip, Dropdown, Menu, MenuButton, MenuItem } from '@mui/joy'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import { useColorScheme } from '@mui/joy/styles'
import Logo from '../../images/logo.png'

// 🌗 Theme toggle button
const ModeToggle = () => {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
      <IconButton
        variant='plain'
        size='sm'
        color='neutral'
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        sx={{
          borderRadius: 'sm',
          '&:hover': { bgcolor: 'background.level1' }
        }}
      >
        {isDark ? <Brightness7Icon fontSize='small' /> : <Brightness4Icon fontSize='small' />}
      </IconButton>
    </Tooltip>
  )
}

const Header = ({ username }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = localStorage.getItem('authToken')

  const logout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('authToken')
    navigate('/')
    window.location.reload()
  }

  const isActive = (path) => location.pathname === path

  return (
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
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(13, 17, 23, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        boxShadow: theme.palette.mode === 'dark' ? 'md' : 'sm'
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
        <Box component='img' src={Logo} alt='Nowry logo' sx={{ height: 40, mr: 1.5 }} />
        <Typography level='h4' fontWeight={700} sx={{ color: 'primary.600' }}>
          Nowry
        </Typography>
      </Box>

      {/* Navigation */}
      <Stack direction='row' spacing={{ xs: 0.5, md: 1 }} alignItems='center'>
        {!isLoggedIn ? (
          <>
            <Button
              variant='plain'
              color='neutral'
              component={Link}
              to='/about'
              size='sm'
              sx={{
                fontWeight: 500,
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              About
            </Button>
            <Button
              variant='plain'
              color='neutral'
              component={Link}
              to='/contact'
              size='sm'
              sx={{
                fontWeight: 500,
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              Contact
            </Button>
            <Button variant='soft' color='primary' component={Link} to='/login' size='sm' sx={{ ml: 1 }}>
              Sign In
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isActive('/study') ? 'soft' : 'plain'}
              color={isActive('/study') ? 'primary' : 'neutral'}
              component={Link}
              to='/study'
              size='sm'
              sx={{
                fontWeight: isActive('/study') ? 600 : 500,
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              Study
            </Button>
            <Button
              variant={isActive('/cards') ? 'soft' : 'plain'}
              color={isActive('/cards') ? 'primary' : 'neutral'}
              component={Link}
              to='/cards'
              size='sm'
              sx={{
                fontWeight: isActive('/cards') ? 600 : 500,
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              Cards
            </Button>
            <Button
              variant={isActive('/books') ? 'soft' : 'plain'}
              color={isActive('/books') ? 'primary' : 'neutral'}
              component={Link}
              to='/books'
              size='sm'
              sx={{
                fontWeight: isActive('/books') ? 600 : 500,
                '&:hover': { bgcolor: 'background.level1' }
              }}
            >
              Books
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
                    size: 'sm'
                  }
                }}
              >
                <Avatar
                  size='sm'
                  color='primary'
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  {username?.charAt(0).toUpperCase()}
                </Avatar>
              </MenuButton>
              <Menu placement='bottom-end' size='sm'>
                <MenuItem disabled>
                  <Stack spacing={0.5}>
                    <Typography level='body-sm' fontWeight={600}>
                      {username}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                      Manage your account
                    </Typography>
                  </Stack>
                </MenuItem>
                <MenuItem onClick={() => navigate('/profile')}>
                  <PersonIcon fontSize='small' sx={{ mr: 1 }} />
                  Profile
                </MenuItem>
                <MenuItem onClick={() => navigate('/settings')}>
                  <SettingsIcon fontSize='small' sx={{ mr: 1 }} />
                  Settings
                </MenuItem>
                <MenuItem onClick={logout} color='danger'>
                  <LogoutIcon fontSize='small' sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Dropdown>
          </>
        )}
        {!isLoggedIn && <ModeToggle />}
      </Stack>
    </Sheet>
  )
}

export default Header
