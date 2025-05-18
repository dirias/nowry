import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, IconButton, Sheet, Stack, Avatar, Tooltip } from '@mui/joy'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useColorScheme } from '@mui/joy/styles'
import Logo from '../../images/logo.png'

// Toggle button component
const ModeToggle = () => {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
      <IconButton variant='soft' size='sm' color='neutral' onClick={() => setMode(isDark ? 'light' : 'dark')} sx={{ ml: 1 }}>
        {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  )
}

const Header = ({ username }) => {
  const navigate = useNavigate()
  const isLoggedIn = localStorage.getItem('authToken')

  const logout = () => {
    localStorage.removeItem('username')
    localStorage.removeItem('authToken')
    navigate('/')
    window.location.reload()
  }

  return (
    <Sheet
      component='header'
      sx={{
        backgroundColor: 'var(--primary-color)', // uses your branding
        color: 'var(--font-color-1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 4,
        py: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Logo + Title */}
      <Box component={Link} to='/' sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <Box component='img' src={Logo} alt='Nowry logo' sx={{ height: 48, mr: 1 }} />
        <Typography level='title-lg' sx={{ color: '#fff', fontWeight: 'lg' }}>
          Nowry
        </Typography>
      </Box>

      {/* Navigation */}
      <Stack direction='row' spacing={2} alignItems='center'>
        {!isLoggedIn ? (
          <>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/about'>
              About
            </Button>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/contact'>
              Contact
            </Button>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/services'>
              Services
            </Button>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/faq'>
              FAQ
            </Button>
            <Button variant='solid' color='primary' component={Link} to='/login'>
              Login
            </Button>
          </>
        ) : (
          <>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/study'>
              Study
            </Button>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/cards'>
              Cards
            </Button>
            <Button variant='plain' sx={{ color: '#fff' }} component={Link} to='/books'>
              Books
            </Button>
            <Stack direction='row' alignItems='center' spacing={1}>
              <Avatar variant='outlined' size='sm' sx={{ bgcolor: '#fff', color: '#015c63' }}>
                {username?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography level='body-sm' sx={{ color: '#fff' }}>
                {username}
              </Typography>
              <IconButton variant='plain' sx={{ color: '#fff' }} onClick={logout} title='Logout'>
                <LogoutIcon />
              </IconButton>
            </Stack>
          </>
        )}
        {/* 🌙 Theme toggle always available */}
        <ModeToggle />
      </Stack>
    </Sheet>
  )
}

export default Header
