import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { DynamicThemeProvider } from './theme/DynamicThemeProvider'

import './styles/App.css'
import './styles/Landing.css'
import './styles/Footer.css'
import './styles/Login.css'
import './styles/Messages.css'
import './styles/SideMenu.css'
import './styles/Home.css'
import './styles/Book.css'
import './styles/TextMenu.css'
import './styles/Card.css'
import './styles/LexicalEditor.css'

import 'keen-slider/keen-slider.min.css'

import Header from './components/HomePage/Header'
import Landing from './components/HomePage/Landing'
import About from './components/HomePage/About'
import Contact from './components/HomePage/Contact'
import Footer from './components/HomePage/Footer'
import { Login, Register, ResetPassword } from './components/User'
import OnboardingWizard from './components/User/OnboardingWizard'
import { Home } from './components/User/Home'
import { EditorHome, BookHome } from './components/Books'
import { CardHome } from './components/Cards'
import StudySession from './components/Cards/StudySession'
import StudyCenter from './components/Study/StudyCenter'
import UserProfile from './components/User/Profile/UserProfile'
import AccountSettings from './components/User/Profile/AccountSettings'
import BugDashboard from './components/Bugs/BugDashboard'

import { AuthProvider, useAuth } from './context/AuthContext'

const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth()

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  return (
    <div className='App' style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header username={user?.username} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path='/books' element={<BookHome />} />
          <Route path='/book/:id' element={<EditorHome />} />
          {isAuthenticated ? <Route path='/' element={<Home />} /> : <Route path='/' element={<Landing />} />}
          <Route path='/about' element={<About />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/cards' element={<CardHome />} />
          <Route path='/study' element={<StudyCenter />} />
          <Route path='/study/:deckId' element={<StudySession />} />
          <Route path='/profile' element={<UserProfile />} />
          <Route path='/settings' element={<AccountSettings />} />
          <Route path='/bugs/dashboard' element={<BugDashboard />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/onboarding' element={<OnboardingWizard />} />
          <Route path='/resetPassword' element={<ResetPassword />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

const App = () => {
  return (
    <AuthProvider>
      <DynamicThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </DynamicThemeProvider>
    </AuthProvider>
  )
}

export default App
