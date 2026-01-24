import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
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
import './styles/AnnualPlanning.css'

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
import News from './pages/News'
import { AnnualPlanningHome, FocusAreaSetup, FocusAreaView, DailyRoutinePlanner } from './components/AnnualPlanning'

import { AuthProvider, useAuth } from './context/AuthContext'
import { PomodoroProvider } from './context/PomodoroContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import PomodoroWidget from './components/Pomodoro/PomodoroWidget'

const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  useEffect(() => {
    // Redirect to onboarding if user is authenticated but wizard is not completed
    const skipped = sessionStorage.getItem('onboarding_skipped')
    if (!loading && isAuthenticated && user && !user.wizard_completed && !skipped && location.pathname !== '/onboarding') {
      navigate('/onboarding')
    }
  }, [loading, isAuthenticated, user, location.pathname, navigate])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  const isEditor = location.pathname.startsWith('/book/') && location.pathname !== '/books'

  return (
    <div className='App' style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header username={user?.username} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflowY: isEditor ? 'hidden' : 'auto', // Editor handles its own scroll; others use main scroll
          overflowX: 'hidden'
        }}
      >
        <Routes>
          {/* Public Routes - Accessible to everyone */}
          <Route path='/about' element={<About />} />
          <Route path='/contact' element={<Contact />} />

          {/* Public Only Routes - Redirect to home if authenticated */}
          <Route
            path='/login'
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path='/register'
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route
            path='/resetPassword'
            element={
              <PublicOnlyRoute>
                <ResetPassword />
              </PublicOnlyRoute>
            }
          />

          {/* Home Route - Shows Landing for guests, Home for authenticated */}
          {isAuthenticated ? <Route path='/' element={<Home />} /> : <Route path='/' element={<Landing />} />}

          {/* Protected Routes - Require authentication */}
          <Route
            path='/news'
            element={
              <ProtectedRoute>
                <News />
              </ProtectedRoute>
            }
          />
          <Route
            path='/books'
            element={
              <ProtectedRoute>
                <BookHome />
              </ProtectedRoute>
            }
          />
          <Route
            path='/book/:id'
            element={
              <ProtectedRoute>
                <EditorHome />
              </ProtectedRoute>
            }
          />
          <Route
            path='/cards'
            element={
              <ProtectedRoute>
                <CardHome />
              </ProtectedRoute>
            }
          />
          <Route
            path='/study'
            element={
              <ProtectedRoute>
                <StudyCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path='/study/:deckId'
            element={
              <ProtectedRoute>
                <StudySession />
              </ProtectedRoute>
            }
          />
          <Route
            path='/profile'
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path='/settings'
            element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path='/bugs/dashboard'
            element={
              <ProtectedRoute>
                <BugDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path='/report-bug'
            element={
              <ProtectedRoute>
                <BugDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path='/onboarding'
            element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path='/annual-planning'
            element={
              <ProtectedRoute>
                <AnnualPlanningHome />
              </ProtectedRoute>
            }
          />
          <Route
            path='/annual-planning/setup'
            element={
              <ProtectedRoute>
                <FocusAreaSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path='/annual-planning/area/:id'
            element={
              <ProtectedRoute>
                <FocusAreaView />
              </ProtectedRoute>
            }
          />
          <Route
            path='/annual-planning/daily-routine'
            element={
              <ProtectedRoute>
                <DailyRoutinePlanner />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!location.pathname.startsWith('/book/') && <Footer />}
      <PomodoroWidget />
    </div>
  )
}

const App = () => {
  return (
    <AuthProvider>
      <PomodoroProvider>
        <DynamicThemeProvider>
          <Router>
            <AppContent />
          </Router>
        </DynamicThemeProvider>
      </PomodoroProvider>
    </AuthProvider>
  )
}

export default App
