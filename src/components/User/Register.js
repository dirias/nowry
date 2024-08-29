import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Error, Success } from '../Messages'
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
        console.log(response)

        if (response.status !== 200) {
          console.log(response)
          newErrors.serverError = response.data.detail
          console.log(response.data.detail)
          setErrors(newErrors)
        } else {
          console.log('User registered:', response.data)
          setRegistrationSuccess(true)
        }
      } catch (error) {
        console.log(error)
        if (error.response) {
          newErrors.serverError = error.response.data.detail
        } else {
          newErrors.serverError = 'An error occurred during registration'
        }
        setErrors(newErrors)
      }
    } else {
      setErrors(newErrors)
    }
  }

  const close = () => {
    setErrors(false)
  }

  return (
    <div className='content'>
      <div className='auth-container'>
        {registrationSuccess ? (
          <div className='success-message'>
            Registration successful! You can now <Link to='/login'>log in</Link>.
          </div>
        ) : (
          <div>
            {errors.serverError ? (
              <Error title={'Error while creating the user'} error_msg={errors.serverError} onClose={close} />
            ) : (
              <div>
                <h2>Register</h2>
                <form onSubmit={handleSubmit} method='post'>
                  <input type='text' name='username' placeholder='Username' value={formData.username} onChange={handleChange} />
                  <input type='email' name='email' placeholder='Email' value={formData.email} onChange={handleChange} />
                  <input type='password' name='password' placeholder='Password' value={formData.password} onChange={handleChange} />
                  <input
                    type='password'
                    name='passwordConfirmation'
                    placeholder='Confirm Password'
                    value={formData.passwordConfirmation}
                    onChange={handleChange}
                  />
                  {errors.passwordConfirmation && <p className='error-message'>{errors.passwordConfirmation}</p>}
                  <label>
                    <input type='checkbox' name='acceptedTerms' checked={formData.acceptedTerms} onChange={handleChange} />I accept the
                    terms and conditions
                  </label>
                  {errors.acceptedTerms && <p className='error-message'>{errors.acceptedTerms}</p>}
                  <input type='submit' className='btn-primary' value='Register' />
                </form>
              </div>
            )}
          </div>
        )}
        <p>
          Already have an account? <Link to='/login'>Log in here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
