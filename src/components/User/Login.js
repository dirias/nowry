import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Error, Success } from '../Messages';
import axios from 'axios'; // Import axios for making API requests

const Login = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState('');;
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      const response = await axios.post('http://localhost:8000/login', formData);
      console.log(response)

      // Check if the login was successful
      if (response.status === 200) {
        // Store the token in local storage
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('username', response.data.username);

        navigate(`/`);
        window.location.reload();
      } else {
        // Handle login errors
        console.error('Login failed:', response.data.detail);
        setErrors(response.data.detail);
      }
    } catch (error) {
      // Handle network errors or other issues
      console.log(error)
      setErrors(error.response.data.detail);
      console.error('Login failed:', error.response.data.detail);
    }
  };

  const close = () =>{
    setErrors(false)
  }
  return (
    <div className="content">
      <div className="auth-container">
        {errors ? (<Error title = {'Unable to access to the account'} error_msg = {errors} onClose={close}/>) : 
        (<div>
          <h2>Login</h2>
          <form>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={handleLogin} className="btn-primary">
              Login
            </button>
            <div className="or-divider">
              <span>OR</span>
            </div>
            <button className="google-login" type="button">
              <i className="fab fa-google"></i> Login with Google
            </button>
            <button className="facebook-login" type="button">
              <i className="fab fa-facebook"></i> Login with Facebook
            </button>
            <p>
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </form>
        </div>)}
        <div className="forgot-password-section">
          <p>Forgot your password?</p>
          <Link to="/resetPassword">Reset it here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
