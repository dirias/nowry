import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Input, Button, Divider, Sheet, useColorScheme, Link } from '@mui/joy'
import { Error } from '../Messages'
import Facebook from '@mui/icons-material/FacebookOutlined'
import Google from '@mui/icons-material/Google'

import { authService } from '../../api/services'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState('')
  const navigate = useNavigate()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const handleLogin = async () => {
    try {
      const data = await authService.login(email, password)

      localStorage.setItem('authToken', data.token)
      localStorage.setItem('username', data.username)
      navigate(`/`)
      window.location.reload()
    } catch (error) {
      console.error('Login error details:', error.response?.data)
      const detail = error.response?.data?.detail

      if (Array.isArray(detail)) {
        // Format FastAPI validation errors into a readable string
        const errorMsg = detail
          .map((err) => {
            const field = err.loc[err.loc.length - 1]
            return `${field}: ${err.msg}`
          })
          .join(', ')
        setErrors(errorMsg)
      } else {
        setErrors(error.response?.data?.detail || error.message || 'Login failed')
      }
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? 'neutral.900' : 'background.body',
        px: 2
      }}
    >
      <Sheet
        variant='outlined'
        sx={{
          p: 4,
          borderRadius: 'md',
          width: '100%',
          maxWidth: 400,
          boxShadow: 'lg',
          backgroundColor: isDark ? 'neutral.800' : 'background.surface'
        }}
      >
        <Typography level='h4' textAlign='center' fontWeight='lg' mb={2}>
          Login to Nowry
        </Typography>

        {errors && <Error title='Login Failed' error_msg={errors} onClose={() => setErrors('')} />}

        <Input type='email' placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />

        <Input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Button variant='solid' color='primary' fullWidth onClick={handleLogin}>
          Login
        </Button>

        <Divider sx={{ my: 2 }}>OR</Divider>

        <Button variant='outlined' color='neutral' fullWidth startDecorator={<Google sx={{ color: 'text.icon' }} />}>
          Login with Google
        </Button>

        <Button variant='outlined' color='neutral' fullWidth startDecorator={<Facebook sx={{ color: '#1877F2' }} />}>
          Login with Facebook
        </Button>

        <Typography level='body-sm' textAlign='center' sx={{ mt: 2 }}>
          Don&apos;t have an account?{' '}
          <Link component={RouterLink} to='/register'>
            Register here
          </Link>
        </Typography>

        <Typography level='body-sm' textAlign='center' mt={1}>
          <Link component={RouterLink} to='/resetPassword'>
            Forgot your password?
          </Link>
        </Typography>
      </Sheet>
    </Box>
  )
}

export default Login
