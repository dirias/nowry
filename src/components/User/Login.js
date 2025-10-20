import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Input, Button, Divider, Sheet, useColorScheme, Link } from '@mui/joy'
import { Error } from '../Messages'
import axios from 'axios'
import Facebook from '@mui/icons-material/FacebookOutlined'
import Google from '@mui/icons-material/Google'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState('')
  const navigate = useNavigate()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const handleLogin = async () => {
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      const response = await axios.post('http://localhost:8000/session/login', formData)

      if (response.status === 200) {
        localStorage.setItem('authToken', response.data.token)
        localStorage.setItem('username', response.data.username)
        navigate(`/`)
        window.location.reload()
      } else {
        setErrors(response.data.detail)
      }
    } catch (error) {
      setErrors(error.response?.data?.detail || 'Login failed')
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

        <Button
          variant='outlined'
          color='neutral'
          fullWidth
          startDecorator={<Facebook sx={{ color: '#1877F2' }} />} // Optional FB blue
        >
          Login with Facebook
        </Button>

        <Typography level='body-sm' textAlign='center'>
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
