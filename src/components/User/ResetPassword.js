import React, { useState } from 'react'
import { Box, Typography, Input, Button, FormControl, FormHelperText, Sheet, useColorScheme, Link as JoyLink } from '@mui/joy'
import { Link, useNavigate } from 'react-router-dom'
import { Error } from '../Messages'

const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [resetSuccessful, setResetSuccessful] = useState(false)
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
  const navigate = useNavigate()

  const handleResetPassword = () => {
    const newErrors = {}

    if (!email) newErrors.email = 'Email is required'
    if (!newPassword) newErrors.newPassword = 'New password is required'
    if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Simulate API call
    setTimeout(() => {
      setResetSuccessful(true)
    }, 1000)
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
        <Typography level='h4' textAlign='center' mb={2}>
          Reset Password
        </Typography>

        {resetSuccessful ? (
          <Box textAlign='center'>
            <Typography level='body-lg' mb={2}>
              Your password has been successfully reset.
            </Typography>
            <Button onClick={() => navigate('/login')} variant='solid' fullWidth>
              Go to Login
            </Button>
          </Box>
        ) : (
          <form>
            <FormControl sx={{ mb: 2 }} error={!!errors.email}>
              <Input type='email' placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
            </FormControl>

            <FormControl sx={{ mb: 2 }} error={!!errors.newPassword}>
              <Input type='password' placeholder='New Password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              {errors.newPassword && <FormHelperText>{errors.newPassword}</FormHelperText>}
            </FormControl>

            <FormControl sx={{ mb: 2 }} error={!!errors.confirmNewPassword}>
              <Input
                type='password'
                placeholder='Confirm New Password'
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {errors.confirmNewPassword && <FormHelperText>{errors.confirmNewPassword}</FormHelperText>}
            </FormControl>

            <Button fullWidth variant='solid' color='primary' onClick={handleResetPassword}>
              Reset Password
            </Button>
          </form>
        )}
      </Sheet>
    </Box>
  )
}

export default ResetPassword
