import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { DynamicThemeProvider } from './theme/DynamicThemeProvider'
import { Box, CircularProgress } from '@mui/joy'

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

// ── Eagerly loaded: always needed, tiny, or above-the-fold ──────────
import Header from './components/HomePage/Header'
import Footer from './components/HomePage/Footer'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PomodoroProvider } from './context/PomodoroContext'
import { NotificationProvider } from './context/NotificationContext'
import { AgentProvider } from './context/AgentContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import ErrorBoundary from './components/Common/ErrorBoundary'
import StudyPet from './components/Agent/StudyPet'

// ── Lazily loaded: code-split at route level ─────────────────────────
const Landing = lazy(() => import('./components/HomePage/Landing'))
const About = lazy(() => import('./components/HomePage/About'))
const Contact = lazy(() => import('./components/HomePage/Contact'))
const Login = lazy(() => import('./components/User/Login'))
const Register = lazy(() => import('./components/User/Register'))
const ResetPassword = lazy(() => import('./components/User/ResetPassword'))
const OnboardingWizard = lazy(() => import('./components/User/OnboardingWizard'))
const Home = lazy(() => import('./components/User/Home/Home'))
const EditorHome = lazy(() => import('./components/Books/EditorHome'))
const BookHome = lazy(() => import('./components/Books/BookHome'))
const CardHome = lazy(() => import('./components/Cards/CardHome'))
const StudySession = lazy(() => import('./components/Cards/StudySession'))
const StudyCenter = lazy(() => import('./components/Study/StudyCenter'))
const UserProfile = lazy(() => import('./components/User/Profile/UserProfile'))
const AccountSettings = lazy(() => import('./components/User/Profile/AccountSettings'))
const AgentSettings = lazy(() => import('./components/Agent/AgentSettings'))
const BugDashboard = lazy(() => import('./components/Bugs/BugDashboard'))
const News = lazy(() => import('./pages/News'))
const PublicBrowse = lazy(() => import('./pages/PublicBrowse'))
const PublicView = lazy(() => import('./pages/PublicView'))
const MyLikes = lazy(() => import('./pages/MyLikes'))
const AnnualPlanningHome = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.AnnualPlanningHome })))
const StudyHistory = lazy(() => import('./components/Study/StudyHistory'))
const FocusAreaSetup = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.FocusAreaSetup })))
const FocusAreaView = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.FocusAreaView })))
const DailyRoutinePlanner = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.DailyRoutinePlanner })))
const PomodoroWidget = lazy(() => import('./components/Pomodoro/PomodoroWidget'))
const PrivacyPolicy = lazy(() => import('./components/HomePage/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./components/HomePage/TermsOfService'))

/** Full-page loading fallback shown while lazy chunks download */
const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress size='lg' />
  </Box>
)

const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Redirect to onboarding if user is authenticated but wizard is not completed
    const skipped = sessionStorage.getItem('onboarding_skipped')
    if (!loading && isAuthenticated && user && !user.wizard_completed && !skipped && location.pathname !== '/onboarding') {
      navigate('/onboarding')
    }
  }, [loading, isAuthenticated, user, location.pathname, navigate])

  const isEditor = location.pathname.startsWith('/book/') && location.pathname !== '/books'
  // Public marketing pages use natural document scroll (no viewport prison)
  const isPublicPage = !isAuthenticated && ['/', '/about', '/contact'].includes(location.pathname)

  // While Firebase is restoring the session, show a neutral full-screen spinner.
  // This prevents the flash of the logged-out header/landing page
  // that occurs in the ~200-400ms before onAuthStateChanged fires.
  if (loading) return <PageLoader />

  return (
    <div
      className='App'
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...(isPublicPage ? { minHeight: '100vh' } : { height: '100vh', overflow: 'hidden' })
      }}
    >
      <Header username={user?.username} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...(isPublicPage ? {} : { overflowY: isEditor ? 'hidden' : 'auto', overflowX: 'hidden' })
        }}
      >
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path='/about' element={<About />} />
              <Route path='/contact' element={<Contact />} />
              <Route path='/browse' element={<PublicBrowse />} />
              <Route path='/public/:type/:id' element={<PublicView />} />

              {/* Legal Pages */}
              <Route path='/privacy' element={<PrivacyPolicy />} />
              <Route path='/terms' element={<TermsOfService />} />

              {/* Application Dashboard (Protected) */}
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

              {/* Home Route */}
              <Route
                path='/'
                element={
                  isAuthenticated ? (
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  ) : (
                    <Landing />
                  )
                }
              />

              {/* Protected Routes */}
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
                    <Navigate to='/study' replace />
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
                path='/study/history'
                element={
                  <ProtectedRoute>
                    <StudyHistory />
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
                path='/settings/agent'
                element={
                  <ProtectedRoute>
                    <AgentSettings />
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
                    {/* Wizard is a one-time experience — completed users go straight to home */}
                    {user?.wizard_completed ? <Navigate to='/' replace /> : <OnboardingWizard />}
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
              <Route
                path='/liked'
                element={
                  <ProtectedRoute>
                    <MyLikes />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!location.pathname.startsWith('/book/') && <Footer />}

      <Suspense fallback={null}>
        <PomodoroWidget />
      </Suspense>

      {/* Study Buddy — always mounted for authenticated users; portal renders above all content */}
      <StudyPet />
    </div>
  )
}

const App = () => {
  return (
    <AuthProvider>
      <PomodoroProvider>
        <DynamicThemeProvider>
          <NotificationProvider>
            <AgentProvider>
              <Router>
                <AppContent />
              </Router>
            </AgentProvider>
          </NotificationProvider>
        </DynamicThemeProvider>
      </PomodoroProvider>
    </AuthProvider>
  )
}

export default App
