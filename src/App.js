import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './api/queryClient'
import { DynamicThemeProvider } from './theme/DynamicThemeProvider'
import { Box, CircularProgress } from '@mui/joy'

import './styles/App.css'
import './styles/Landing.css'
import './styles/Login.css'
import './styles/Messages.css'
import './styles/SideMenu.css'
import './styles/Home.css'
import './styles/Book.css'
import './styles/TextMenu.css'
import './styles/Card.css'
import './styles/LexicalEditor.css'

import 'keen-slider/keen-slider.min.css'
import 'katex/dist/katex.min.css'
import './styles/FullCalendar.css'

// ── Eagerly loaded: always needed, tiny, or above-the-fold ──────────
import Header from './components/HomePage/Header'
import PaymentFailureBanner from './components/Subscription/PaymentFailureBanner'
import Footer from './components/HomePage/Footer'
import DevBugReportButton from './components/Dev/DevBugReportButton'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PomodoroProvider } from './context/PomodoroContext'
import { NotificationProvider } from './context/NotificationContext'
import { AgentProvider, usePet } from './context/AgentContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
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
const OnboardingRoute = lazy(() => import('./components/User/OnboardingRoute'))
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
const AnnualPlanningLayout = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.AnnualPlanningLayout })))
const OverviewTabView = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.OverviewTabView })))
const StudyHistory = lazy(() => import('./components/Study/StudyHistory'))
const FocusAreaSetup = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.FocusAreaSetup })))
const FocusAreaView = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.FocusAreaView })))
const DailyRoutinePlanner = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.DailyRoutinePlanner })))
const AllPrioritiesPage = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.AllPrioritiesPage })))
const GoalsTabView = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.GoalsTabView })))
const ReportsTabView = lazy(() => import('./components/AnnualPlanning').then((m) => ({ default: m.ReportsTabView })))
const PomodoroWidget = lazy(() => import('./components/Pomodoro/PomodoroWidget'))
const PomodoroChip = lazy(() => import('./components/Pomodoro/PomodoroChip'))
const PrivacyPolicy = lazy(() => import('./components/HomePage/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./components/HomePage/TermsOfService'))
const PlansPage = lazy(() => import('./components/Subscription/PlansPage'))
const SubscriptionPage = lazy(() => import('./components/Subscription/SubscriptionPage'))
const CalendarPage = lazy(() => import('./components/Calendar/CalendarPage'))
const SheetsListPage = lazy(() => import('./components/Sheets/SheetsListPage'))
const SheetsEditor = lazy(() => import('./components/Sheets/SheetsEditor'))

/** Routes where the Footer should remain visible even for authenticated users */
const PUBLIC_MARKETING_ROUTES = ['/about', '/contact', '/privacy', '/terms']

/**
 * Min-height for the document-flow layout. `100dvh` tracks mobile browser-chrome
 * collapse without jank; `100vh` is the fallback for browsers without `dvh` support.
 */
const DOCUMENT_FLOW_MIN_HEIGHT = typeof window !== 'undefined' && window.CSS?.supports?.('min-height', '100dvh') ? '100dvh' : '100vh'

/** Full-page loading fallback shown while lazy chunks download */
const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress size='lg' />
  </Box>
)

/*
 * ONB-012 / ADR-007 — there is deliberately no onboarding redirect here.
 *
 * This component used to run an effect that pushed every authenticated user
 * whose `wizard_completed` was false to `/onboarding` on every navigation,
 * escapable only by a `sessionStorage.onboarding_skipped` flag the wizard set
 * on skip. That made an incomplete profile a restriction on the whole product
 * and moved the "should we ask again?" decision onto a device-local flag that
 * one cleared tab reset.
 *
 * FR-044 forbids it: onboarding must never auto-open, block Home, or prevent
 * use of any other area. Re-entry is now an in-flow surface on Home that
 * appears only when the server's journey state says so (`OnboardingReentry`),
 * and the only navigations left to `/onboarding` are explicit ones the user
 * caused: registering, a first Google sign-in, and pressing that surface.
 */
const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth()
  const { isActive: isPetActive } = usePet()
  const location = useLocation()

  const isEditor = location.pathname.startsWith('/book/') && location.pathname !== '/books'

  // Immersive reader routes own the whole viewport and run their own internal scroll
  // container (the book editor, and the public book reader with its scroll-progress bar).
  // They keep the fixed shell even for guests, and never show the Footer.
  const isImmersiveRoute = isEditor || location.pathname.startsWith('/public/books/')

  const isMarketingRoute = PUBLIC_MARKETING_ROUTES.includes(location.pathname)

  // The fixed app shell (100vh + `overflow: hidden`, with <main> scrolling internally)
  // applies ONLY to authenticated app routes and immersive readers. Everything else —
  // every guest route plus the authenticated marketing pages — uses natural document
  // flow so <Footer /> sits at the END of the document instead of being structurally
  // pinned to the bottom of the viewport.
  const isAppShellLayout = isImmersiveRoute || (isAuthenticated && !isMarketingRoute)

  // The Footer belongs to document-flow pages only — in the fixed shell it would render
  // outside the scroll container and stay permanently glued to the viewport.
  const showFooter = !isAppShellLayout

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
        ...(isAppShellLayout ? { height: '100vh', overflow: 'hidden' } : { minHeight: DOCUMENT_FLOW_MIN_HEIGHT })
      }}
    >
      <PaymentFailureBanner />
      <Header username={user?.username} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...(isAppShellLayout ? { overflowY: isEditor ? 'hidden' : 'auto', overflowX: 'hidden' } : {})
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
                    {/*
                      ONB-014 — the `user?.wizard_completed ? <Navigate to='/'/>` bounce
                      that used to sit here is gone, and nothing replaces it at this
                      level. `OnboardingRoute` owns the identical redirect, but resolves
                      it from `GET /users/onboarding` — live server state, which already
                      normalizes a legacy `wizard_completed=true` user to activated
                      (ONB-001) — instead of the `user` snapshot AuthContext cached at
                      sign-in and never refreshes after a fork. Two redirect authorities
                      where the outer one reads a stale client flag is precisely what
                      ADR-007 means by server-governed, and it would have overridden the
                      FR-028 success panel the moment anyone called `checkUser()` after
                      activation.
                    */}
                    <OnboardingRoute />
                  </ProtectedRoute>
                }
              />
              {/* Annual Planning shell — AnnualPlanningLayout owns the single
                  useAnnualPlan call, the persistent header and the tab bar; all four
                  tabs below are its children and read data via Outlet context.
                  Priorities is a child rather than a sibling so it inherits the same
                  header as every other tab — as a sibling it rendered bare, which is
                  the inconsistency this whole shell exists to remove. */}
              <Route
                path='/annual-planning'
                element={
                  <ProtectedRoute>
                    <AnnualPlanningLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<OverviewTabView />} />
                <Route path='goals' element={<GoalsTabView />} />
                <Route path='priorities' element={<AllPrioritiesPage />} />
                <Route path='reports' element={<ReportsTabView />} />
              </Route>
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
              <Route
                path='/plans'
                element={
                  <ProtectedRoute>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/subscription'
                element={
                  <ProtectedRoute>
                    <SubscriptionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/calendar'
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/sheets'
                element={
                  <ProtectedRoute>
                    <SheetsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/sheets/:sheetId'
                element={
                  <ProtectedRoute>
                    <SheetsEditor />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {showFooter && <Footer />}

      <DevBugReportButton />

      <Suspense fallback={null}>
        <PomodoroChip />
        <PomodoroWidget />
      </Suspense>

      {/* Study Buddy — mounted only once active; default-off for new accounts until the
          contextual first-reveal fires (see StudySession's sessionComplete effect).
          Portal renders above all content when mounted. */}
      {isPetActive && <StudyPet />}
    </div>
  )
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PomodoroProvider>
          <DynamicThemeProvider>
            <NotificationProvider>
              <AgentProvider>
                <Router>
                  <SubscriptionProvider>
                    <AppContent />
                  </SubscriptionProvider>
                </Router>
              </AgentProvider>
            </NotificationProvider>
          </DynamicThemeProvider>
        </PomodoroProvider>
      </AuthProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
