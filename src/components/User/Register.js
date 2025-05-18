import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Typography, Input, Button, Checkbox, FormControl, FormHelperText, Sheet, useColorScheme, Link as JoyLink } from '@mui/joy'
import { Error, SuccessWindow } from '../Messages'
import axios from 'axios'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    acceptedTerms: false
  })

  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {}

    if (formData.password !== formData.passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match'
    }

    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = 'You must accept the terms and conditions'
    }

    if (Object.keys(newErrors).length === 0) {
      try {
        const response = await axios.post('http://localhost:8000/user/create_user', formData)
        if (response.status === 200) {
          setRegistrationSuccess(true)
        } else {
          newErrors.serverError = response.data.detail || 'Failed to register'
        }
      } catch (error) {
        newErrors.serverError = error.response?.data?.detail || 'An error occurred during registration'
      }
      setErrors(newErrors)
    } else {
      setErrors(newErrors)
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
        {registrationSuccess ? (
          <SuccessWindow success_msg='Registration successful! You can now log in.' onClose={() => navigate('/login')} />
        ) : (
          <form onSubmit={handleSubmit}>
            <Typography level='h4' textAlign='center' mb={2}>
              Register
            </Typography>

            {errors.serverError && <Error title='Registration Error' error_msg={errors.serverError} onClose={() => setErrors({})} />}

            <FormControl sx={{ mb: 2 }}>
              <Input type='text' name='username' placeholder='Username' value={formData.username} onChange={handleChange} />
            </FormControl>

            <FormControl sx={{ mb: 2 }}>
              <Input type='email' name='email' placeholder='Email' value={formData.email} onChange={handleChange} />
            </FormControl>

            <FormControl sx={{ mb: 2 }}>
              <Input type='password' name='password' placeholder='Password' value={formData.password} onChange={handleChange} />
            </FormControl>

            <FormControl sx={{ mb: 2 }} error={!!errors.passwordConfirmation}>
              <Input
                type='password'
                name='passwordConfirmation'
                placeholder='Confirm Password'
                value={formData.passwordConfirmation}
                onChange={handleChange}
              />
              {errors.passwordConfirmation && <FormHelperText>{errors.passwordConfirmation}</FormHelperText>}
            </FormControl>

            <FormControl
              orientation='horizontal'
              sx={{
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1,
                '& label': {
                  lineHeight: 1.3,
                  fontSize: 13,
                  color: isDark ? 'neutral.300' : 'neutral.700'
                }
              }}
              error={!!errors.acceptedTerms}
            >
              <Checkbox checked={formData.acceptedTerms} onChange={handleChange} name='acceptedTerms' size='sm' sx={{ mt: 0.4 }} />
              <label htmlFor='acceptedTerms'>
                I accept the{' '}
                <JoyLink component={Link} to='/terms' underline='hover'>
                  terms and conditions
                </JoyLink>
              </label>
              {errors.acceptedTerms && <FormHelperText sx={{ width: '100%', mt: 0.5 }}>{errors.acceptedTerms}</FormHelperText>}
            </FormControl>

            <Button type='submit' fullWidth variant='solid' color='primary'>
              Register
            </Button>

            <Typography level='body-sm' textAlign='center' mt={2}>
              Already have an account?{' '}
              <JoyLink component={Link} to='/login'>
                Log in here
              </JoyLink>
            </Typography>
          </form>
        )}
      </Sheet>
    </Box>
  )
}

export default Register
