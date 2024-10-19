import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

import './styles/App.css'
import './styles/Landing.css'
import './styles/Header.css'
import './styles/Footer.css'
import './styles/Login.css'
import './styles/Messages.css'
import './styles/SideMenu.css'
import './styles/Home.css'
import './styles/Book.css'
import './styles/TextMenu.css'
import './styles/Card.css'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import Header from './components/HomePage/Header'
import Landing from './components/HomePage/Landing'
import Footer from './components/HomePage/Footer'
import { Login, Register, ResetPassword } from './components/User' // Import the LoginForm component
import { Home } from './components/User/Home'
import { EditorHome, BookHome } from './components/Books'

const App = () => {
  const [isUserLoggedIn, setUserLoggedIn] = useState(false)
  console.log('isUserLoggedIn', isUserLoggedIn)

  useEffect(() => {
    // Check if the user has a valid token in local storage
    const token = localStorage.getItem('authToken') // Use your token key
    if (token) {
      setUserLoggedIn(true)
    }
  }, [])

  useEffect(() => {
    // Create a <link> element for FontAwesome CSS and append it to the document's <head>
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css'
    document.head.appendChild(link)

    // Clean up the <link> element when the component unmounts
    return () => {
      document.head.removeChild(link)
    }
  }, []) // Run this effect only once on component mount

  const isLoggedIn = localStorage.getItem('authToken')
  return (
    <Router>
      <div className='App'>
        <Header username={localStorage.getItem('username')} />
        <main>
          <Routes>
            <Route path='/books' element={<BookHome />} />
            <Route path='/book/:id' element={<EditorHome />} />
            {isLoggedIn ? <Route path='/' element={<Home />} /> : <Route path='/' element={<Landing />} />}
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/resetPassword' element={<ResetPassword />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
