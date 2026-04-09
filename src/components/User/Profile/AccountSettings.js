import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Container,
  Typography,
  Box,
  Stack,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Divider,
  Alert,
  LinearProgress,
  Select,
  Option,
  Chip,
  Skeleton,
  Avatar,
  IconButton,
  CircularProgress,
  Modal,
  ModalDialog,
  ModalClose,
  Sheet,
  Tooltip,
  Grid,
  List,
  ListItem,
  Drawer
} from '@mui/joy'
import {
  Palette,
  Translate,
  DarkMode,
  LightMode,
  Timer,
  Security,
  Notifications,
  Delete,
  VpnKey,
  Warning,
  SaveRounded,
  CheckRounded,
  LockRounded,
  VpnKeyRounded,
  PersonRounded,
  WarningAmberRounded,
  NotificationsOffRounded
} from '@mui/icons-material'
import MenuRounded from '@mui/icons-material/MenuRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import BookRoundedIcon from '@mui/icons-material/BookRounded'
import StyleRoundedIcon from '@mui/icons-material/StyleRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import { userService } from '../../../api/services'
import { useColorScheme } from '@mui/joy/styles'
import { useThemePreferences } from '../../../theme/DynamicThemeProvider'
import DeleteConfirmationModal from '../../Common/DeleteConfirmationModal'
import { useAuth } from '../../../context/AuthContext'
import { auth } from '../../../config/firebase.config'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useTranslation } from 'react-i18next'

// ─── Section IDs ─────────────────────────────────────────────────────────────
const SECTION_IDS = [
  'section-account',
  'section-appearance',
  'section-productivity',
  'section-notifications',
  'section-security',
  'section-danger'
]

// ─── Section Block ────────────────────────────────────────────────────────────
function SectionBlock({ id, title, children, loading, titleColor }) {
  return (
    <Box id={id} sx={{ scrollMarginTop: 88, py: 4 }}>
      <Typography level='h4' sx={{ mb: 1, fontWeight: 700, color: titleColor || 'text.primary' }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {loading ? (
        <Stack spacing={1.5}>
          <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
          <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
          <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'sm' }} />
        </Stack>
      ) : (
        children
      )}
    </Box>
  )
}

// ─── Notification row ────────────────────────────────────────────────────────
function NotificationRow({ labelKey, descKey, notifKey, notifications, notifSavingKey, notifSavedKey, onUpdate, t }) {
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Box sx={{ flex: 1, pr: 2 }}>
        <Typography level='title-sm'>{t(labelKey)}</Typography>
        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
          {t(descKey)}
        </Typography>
      </Box>
      <Stack direction='row' spacing={1} alignItems='center'>
        {notifSavingKey === notifKey && <CircularProgress sx={{ '--CircularProgress-size': '16px' }} />}
        {notifSavedKey === notifKey && !notifSavingKey && <CheckRounded sx={{ color: 'success.plainColor', fontSize: 16 }} />}
        <Switch
          checked={!!notifications[notifKey]}
          onChange={(e) => onUpdate(notifKey, e.target.checked)}
          disabled={notifSavingKey === notifKey}
        />
      </Stack>
    </Stack>
  )
}

// ─── Active section hook ─────────────────────────────────────────────────────
function getScrollParent(el) {
  if (!el) return window
  const style = getComputedStyle(el)
  const overflowY = style.overflowY
  if (overflowY === 'auto' || overflowY === 'scroll') return el
  return getScrollParent(el.parentElement)
}

function useActiveSection(sectionIds) {
  const [activeSection, setActiveSection] = useState(sectionIds[0])
  const isManualRef = useRef(false)
  const timerRef = useRef(null)

  const setManual = useCallback((id) => {
    // Set immediately
    setActiveSection(id)
    // Block scroll listener while smooth scroll animation plays out
    isManualRef.current = true
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      isManualRef.current = false
    }, 800)
  }, [])

  useEffect(() => {
    const firstEl = document.getElementById(sectionIds[0])
    const scrollContainer = getScrollParent(firstEl)

    const handleScroll = () => {
      // Don't override a manual click during scroll animation
      if (isManualRef.current) return

      const containerTop = scrollContainer === window ? 0 : scrollContainer.getBoundingClientRect().top

      const threshold = containerTop + 140

      let current = sectionIds[0]
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id
        }
      }
      setActiveSection(current)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      clearTimeout(timerRef.current)
    }
  }, [sectionIds])

  return [activeSection, setManual]
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AccountSettings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { mode, setMode } = useColorScheme()
  const { setThemeColor } = useThemePreferences()

  // ── Page state ──────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(null)

  // ── Account ─────────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('')
  const [loadedFullName, setLoadedFullName] = useState('')
  const [fullNameSaving, setFullNameSaving] = useState(false)
  const [fullNameSaved, setFullNameSaved] = useState(false)

  // ── Preferences ─────────────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState({
    interests: [],
    theme_color: '#0b6bcb',
    language: 'en',
    pomodoro_work_minutes: 25,
    pomodoro_short_break_minutes: 5,
    pomodoro_long_break_minutes: 15,
    pomodoro_auto_start: false,
    pomodoro_enabled: false
  })

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    studyReminders: true,
    newsUpdates: false,
    marketing: false
  })
  const [notifSavingKey, setNotifSavingKey] = useState(null)
  const [notifSavedKey, setNotifSavedKey] = useState(null)

  // ── Security ────────────────────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [showReauthModal, setShowReauthModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [reauthError, setReauthError] = useState(null)
  const [reauthLoading, setReauthLoading] = useState(false)

  // ── Danger ──────────────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // ── Sidebar / drawer ─────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeSection, setActiveSection] = useActiveSection(SECTION_IDS)

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setPageLoading(true)
    setPageError(null)
    try {
      const profile = await userService.getProfile()

      if (profile.full_name) {
        setFullName(profile.full_name)
        setLoadedFullName(profile.full_name)
      }

      if (profile.notification_preferences) {
        setNotifications({
          emailDigest: profile.notification_preferences.email_digest ?? true,
          studyReminders: profile.notification_preferences.study_reminders ?? true,
          newsUpdates: profile.notification_preferences.news_updates ?? false,
          marketing: profile.notification_preferences.marketing ?? false
        })
      }

      if (profile.preferences) {
        const prefs = {
          interests: profile.preferences.interests || [],
          theme_color: profile.preferences.theme_color || '#0b6bcb',
          language: profile.preferences.language || 'en',
          pomodoro_work_minutes: profile.preferences.pomodoro_work_minutes || 25,
          pomodoro_short_break_minutes: profile.preferences.pomodoro_short_break_minutes || 5,
          pomodoro_long_break_minutes: profile.preferences.pomodoro_long_break_minutes || 15,
          pomodoro_auto_start: profile.preferences.pomodoro_auto_start || false,
          pomodoro_enabled: profile.preferences.pomodoro_enabled || false
        }
        setPreferences(prefs)
        setThemeColor(prefs.theme_color)
      }
    } catch {
      setPageError(t('settings.errors.loadFailed'))
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers — Account ───────────────────────────────────────────────────────
  const handleSaveFullName = async () => {
    if (!fullName.trim() || fullName === loadedFullName) return
    setFullNameSaving(true)
    try {
      await userService.patchProfile({ full_name: fullName.trim() })
      setLoadedFullName(fullName.trim())
      setFullNameSaved(true)
      setTimeout(() => setFullNameSaved(false), 2000)
    } catch {
      setFullName(loadedFullName)
    } finally {
      setFullNameSaving(false)
    }
  }

  // ── Handlers — Preferences ───────────────────────────────────────────────────
  const handlePreferenceUpdate = async (key, value) => {
    const updated = { ...preferences, [key]: value }
    setPreferences(updated)
    if (key === 'theme_color') setThemeColor(value)
    if (key === 'language') i18n.changeLanguage(value)
    try {
      await userService.updateGeneralPreferences(updated)
    } catch {
      // silent — the optimistic update stays; UX remains responsive
    }
  }

  const toggleInterest = (interest) => {
    const curr = preferences.interests
    const next = curr.includes(interest) ? curr.filter((i) => i !== interest) : [...curr, interest]
    handlePreferenceUpdate('interests', next)
  }

  // ── Handlers — Notifications ─────────────────────────────────────────────────
  const handleNotificationUpdate = async (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
    setNotifSavingKey(key)
    setNotifSavedKey(null)
    const apiKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    try {
      await userService.updateNotifications({ [apiKey]: value })
      setNotifSavedKey(key)
      setTimeout(() => setNotifSavedKey(null), 2000)
    } catch {
      setNotifications((prev) => ({ ...prev, [key]: !value }))
    } finally {
      setNotifSavingKey(null)
    }
  }

  // ── Handlers — Security ──────────────────────────────────────────────────────
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: 'neutral' }
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 15
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10
    if (strength < 40) return { strength, label: t('auth.passwordStrength.weak'), color: 'danger' }
    if (strength < 70) return { strength, label: t('auth.passwordStrength.fair'), color: 'warning' }
    return { strength, label: t('auth.passwordStrength.strong'), color: 'success' }
  }

  const resetPasswordForm = () => {
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPassword('')
    setPasswordError(null)
    setReauthError(null)
    setShowPasswordForm(false)
  }

  const handlePasswordChange = () => {
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.security.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      setPasswordError(t('settings.security.passwordTooShort'))
      return
    }
    setShowReauthModal(true)
  }

  const handleReauthAndUpdate = async () => {
    setReauthLoading(true)
    setReauthError(null)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      setShowReauthModal(false)
      setPasswordSaving(true)
      await updatePassword(auth.currentUser, newPassword)
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
      setShowPasswordForm(false)
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setReauthError(t('settings.security.wrongPassword'))
      } else if (err.code === 'auth/requires-recent-login') {
        setReauthError(t('settings.security.reauthRequired'))
      } else if (err.code === 'auth/weak-password') {
        setPasswordError(t('settings.security.passwordTooWeak'))
        setShowReauthModal(false)
      } else {
        setPasswordError(t('settings.security.passwordChangeFailed'))
        setShowReauthModal(false)
      }
    } finally {
      setReauthLoading(false)
      setPasswordSaving(false)
    }
  }

  // ── Handlers — Danger ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteError(null)
    try {
      setDeleteLoading(true)
      await userService.deleteAccount()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    } catch (err) {
      setDeleteError(err.response?.data?.detail || t('settings.errors.networkError'))
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }

  // ── Scroll helper ─────────────────────────────────────────────────────────────
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    const el = document.getElementById(sectionId)
    if (!el) return
    const block = sectionId === 'section-danger' ? 'end' : 'start'
    el.scrollIntoView({ behavior: 'smooth', block })
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const passwordStrength = getPasswordStrength(newPassword)
  const availableInterests = ['Technology', 'Science', 'History', 'Languages', 'Art', 'Mathematics', 'Literature', 'Music']

  return (
    <Container maxWidth='lg' sx={{ pt: { xs: 2, md: 4 }, pb: { xs: 8, md: 12 }, px: { xs: 1.5, md: 3 } }}>
      {pageError && (
        <Alert
          color='danger'
          variant='soft'
          size='sm'
          sx={{ mb: 3 }}
          endDecorator={
            <Button size='sm' variant='plain' color='danger' onClick={fetchProfile}>
              {t('common.retry')}
            </Button>
          }
        >
          {pageError}
        </Alert>
      )}

      <Grid container spacing={0}>
        {/* Sticky sidebar — desktop only */}
        <Grid xs={12} md={3}>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              position: 'sticky',
              top: 80,
              pr: 3,
              borderRight: '1px solid',
              borderColor: 'divider',
              minHeight: 'calc(100vh - 96px)'
            }}
          >
            <Typography level='title-md' sx={{ mb: 0.5, fontWeight: 700 }}>
              {t('settings.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
              {t('settings.subtitle')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={0.5}>
              {SECTION_IDS.map((id) => {
                const key = id.replace('section-', '')
                const isActive = activeSection === id
                return (
                  <Button
                    key={id}
                    variant='plain'
                    color='neutral'
                    size='sm'
                    onClick={() => scrollToSection(id)}
                    aria-label={t(`settings.nav.${key}`)}
                    sx={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      borderRadius: 'sm',
                      borderLeft: '2px solid',
                      borderColor: isActive ? 'primary.outlinedBorder' : 'transparent',
                      color: isActive ? 'text.primary' : 'text.secondary',
                      fontWeight: isActive ? 'md' : 'normal',
                      bgcolor: isActive ? 'background.level1' : 'transparent',
                      pl: 1.5,
                      '&:hover': { bgcolor: 'background.level1', color: 'text.primary' },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.outlinedBorder',
                        outlineOffset: '2px'
                      }
                    }}
                  >
                    {t(`settings.nav.${key}`)}
                  </Button>
                )
              })}
            </Stack>
          </Box>
        </Grid>

        {/* Content column */}
        <Grid xs={12} md={9}>
          <Box sx={{ pl: { md: 4 } }}>
            {/* Mobile page title */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
              <Typography level='h3' sx={{ mb: 0.5, fontWeight: 700 }}>
                {t('settings.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('settings.subtitle')}
              </Typography>
            </Box>

            {/* ── Section 1: Account ─────────────────────────────────────────────── */}
            <SectionBlock id='section-account' title={t('settings.account.title')} loading={pageLoading}>
              <Stack spacing={3}>
                {/* Avatar (read-only) */}
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Avatar src={user?.avatar_url} size='lg' sx={{ width: 64, height: 64 }}>
                    {(loadedFullName || user?.email || '?')[0].toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography level='title-sm'>{loadedFullName || user?.email}</Typography>
                    <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                      {user?.email}
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                {/* Full name */}
                <FormControl>
                  <FormLabel>{t('settings.account.fullName')}</FormLabel>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveFullName()}
                    placeholder={t('settings.account.fullName')}
                    endDecorator={
                      fullNameSaving ? (
                        <CircularProgress size='sm' />
                      ) : fullNameSaved ? (
                        <CheckRounded sx={{ color: 'success.plainColor', fontSize: 18 }} />
                      ) : fullName !== loadedFullName ? (
                        <Tooltip title={t('common.save')}>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='primary'
                            onClick={handleSaveFullName}
                            aria-label={t('common.save')}
                            sx={{
                              '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.outlinedBorder',
                                outlineOffset: '2px'
                              }
                            }}
                          >
                            <SaveRounded sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null
                    }
                  />
                </FormControl>

                {/* Email (locked) */}
                <FormControl>
                  <FormLabel>{t('profile.email')}</FormLabel>
                  <Input value={user?.email || ''} disabled endDecorator={<LockRounded sx={{ fontSize: 16, color: 'text.tertiary' }} />} />
                  <FormHelperText>{t('settings.account.emailManaged')}</FormHelperText>
                </FormControl>
              </Stack>
            </SectionBlock>
            <Divider />

            {/* ── Section 2: Appearance ──────────────────────────────────────────── */}
            <SectionBlock id='section-appearance' title={t('settings.appearance.title')} loading={pageLoading}>
              <Stack spacing={3}>
                {/* Theme mode */}
                <Box>
                  <Typography level='title-sm' sx={{ mb: 0.5 }}>
                    {t('settings.appearance.mode')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1.5 }}>
                    {t('settings.appearance.modeDesc')}
                  </Typography>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <LightMode sx={{ color: mode === 'light' ? 'warning.plainColor' : 'text.tertiary', fontSize: 18 }} />
                    <Switch
                      checked={mode === 'dark'}
                      onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
                      color={mode === 'dark' ? 'primary' : 'neutral'}
                      variant={mode === 'dark' ? 'solid' : 'outlined'}
                      aria-label={t('common.toggleTheme')}
                    />
                    <DarkMode sx={{ color: mode === 'dark' ? 'primary.plainColor' : 'text.tertiary', fontSize: 18 }} />
                  </Stack>
                </Box>

                <Divider />

                {/* Language */}
                <Box>
                  <Typography level='title-sm' sx={{ mb: 1 }}>
                    {t('settings.appearance.language')}
                  </Typography>
                  <Select
                    value={preferences.language}
                    onChange={(_, val) => handlePreferenceUpdate('language', val)}
                    startDecorator={<Translate sx={{ fontSize: 18 }} />}
                    sx={{ maxWidth: 280 }}
                  >
                    <Option value='en'>English (US)</Option>
                    <Option value='es'>Español</Option>
                    <Option value='fr'>Français</Option>
                    <Option value='de'>Deutsch</Option>
                    <Option value='ja'>日本語</Option>
                  </Select>
                </Box>

                <Divider />

                {/* Accent color */}
                <Box>
                  <Typography level='title-sm' sx={{ mb: 0.5 }}>
                    {t('settings.appearance.accentColor')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1.5 }}>
                    {t('settings.appearance.accentColorDesc')}
                  </Typography>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: preferences.theme_color,
                        border: '2px solid',
                        borderColor: 'neutral.outlinedBorder',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.1)' },
                        '&:active': { transform: 'scale(0.95)' }
                      }}
                    >
                      <Box
                        component='input'
                        type='color'
                        value={preferences.theme_color}
                        onChange={(e) => handlePreferenceUpdate('theme_color', e.target.value)}
                        aria-label={t('settings.appearance.accentColor')}
                        sx={{
                          position: 'absolute',
                          top: '-50%',
                          left: '-50%',
                          width: '200%',
                          height: '200%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </Box>
                    <Typography level='body-sm' sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {preferences.theme_color}
                    </Typography>
                  </Stack>
                </Box>

                <Divider />

                {/* Interests */}
                <Box>
                  <Typography level='title-sm' sx={{ mb: 0.5 }}>
                    {t('settings.appearance.interests')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1.5 }}>
                    {t('settings.general.interestsDesc')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {availableInterests.map((interest) => (
                      <Chip
                        key={interest}
                        size='sm'
                        variant={preferences.interests.includes(interest) ? 'soft' : 'plain'}
                        color={preferences.interests.includes(interest) ? 'primary' : 'neutral'}
                        onClick={() => toggleInterest(interest)}
                        sx={{
                          cursor: 'pointer',
                          '&:active': { transform: 'scale(0.95)' },
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.outlinedBorder',
                            outlineOffset: '2px'
                          }
                        }}
                      >
                        {t(`onboarding.interests.items.${interest}`, interest)}
                      </Chip>
                    ))}
                  </Box>
                </Box>
              </Stack>
            </SectionBlock>
            <Divider />

            {/* ── Section 3: Productivity ────────────────────────────────────────── */}
            <SectionBlock id='section-productivity' title={t('settings.productivity.title')} loading={pageLoading}>
              <Stack spacing={3}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box>
                    <Typography level='title-sm'>{t('settings.productivity.enableTimer')}</Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {t('settings.productivity.enableTimerDesc')}
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.pomodoro_enabled}
                    onChange={(e) => handlePreferenceUpdate('pomodoro_enabled', e.target.checked)}
                  />
                </Stack>

                {preferences.pomodoro_enabled && (
                  <>
                    <Divider />

                    <Box>
                      <Typography level='title-sm' sx={{ mb: 1 }}>
                        {t('settings.productivity.focusDuration')}
                      </Typography>
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <Input
                          type='number'
                          value={preferences.pomodoro_work_minutes}
                          onChange={(e) => handlePreferenceUpdate('pomodoro_work_minutes', parseInt(e.target.value) || 25)}
                          sx={{ width: 80 }}
                          slotProps={{ input: { min: 1, max: 60 } }}
                        />
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {t('settings.productivity.recommendedMinutes', { count: 25 })}
                        </Typography>
                      </Stack>
                    </Box>

                    <Box>
                      <Typography level='title-sm' sx={{ mb: 1 }}>
                        {t('settings.productivity.shortBreak')}
                      </Typography>
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <Input
                          type='number'
                          value={preferences.pomodoro_short_break_minutes}
                          onChange={(e) => handlePreferenceUpdate('pomodoro_short_break_minutes', parseInt(e.target.value) || 5)}
                          sx={{ width: 80 }}
                          slotProps={{ input: { min: 1, max: 30 } }}
                        />
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {t('settings.productivity.recommendedMinutes', { count: 5 })}
                        </Typography>
                      </Stack>
                    </Box>

                    <Box>
                      <Typography level='title-sm' sx={{ mb: 1 }}>
                        {t('settings.productivity.longBreak')}
                      </Typography>
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <Input
                          type='number'
                          value={preferences.pomodoro_long_break_minutes}
                          onChange={(e) => handlePreferenceUpdate('pomodoro_long_break_minutes', parseInt(e.target.value) || 15)}
                          sx={{ width: 80 }}
                          slotProps={{ input: { min: 5, max: 60 } }}
                        />
                        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                          {t('settings.productivity.recommendedMinutes', { count: 15 })}
                        </Typography>
                      </Stack>
                    </Box>

                    <Divider />

                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Box>
                        <Typography level='title-sm'>{t('settings.productivity.autoStart')}</Typography>
                        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                          {t('settings.productivity.autoStartDesc')}
                        </Typography>
                      </Box>
                      <Switch
                        checked={preferences.pomodoro_auto_start}
                        onChange={(e) => handlePreferenceUpdate('pomodoro_auto_start', e.target.checked)}
                      />
                    </Stack>
                  </>
                )}
              </Stack>
            </SectionBlock>
            <Divider />

            {/* ── Section 4: Notifications ───────────────────────────────────────── */}
            <SectionBlock id='section-notifications' title={t('settings.notifications.title')} loading={pageLoading}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 6,
                  gap: 2,
                  opacity: 0.5,
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              >
                <NotificationsOffRounded sx={{ fontSize: 40, color: 'text.tertiary' }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography level='title-sm' sx={{ color: 'text.secondary', mb: 0.5 }}>
                    {t('settings.notifications.comingSoon')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('settings.notifications.comingSoonDesc')}
                  </Typography>
                </Box>
                <Chip variant='soft' color='neutral' size='sm'>
                  {t('settings.security.comingSoon')}
                </Chip>
              </Box>
            </SectionBlock>
            <Divider />

            {/* ── Section 5: Security ────────────────────────────────────────────── */}
            <SectionBlock id='section-security' title={t('settings.security.title')} loading={pageLoading}>
              <Stack spacing={3}>
                {/* Success / error alerts */}
                {passwordSuccess && (
                  <Alert color='success' variant='soft' size='sm'>
                    {t('settings.security.passwordChanged')}
                  </Alert>
                )}
                {passwordError && (
                  <Alert
                    color='danger'
                    variant='soft'
                    size='sm'
                    endDecorator={
                      <IconButton
                        size='sm'
                        variant='plain'
                        color='danger'
                        onClick={() => setPasswordError(null)}
                        aria-label={t('common.close')}
                      >
                        ×
                      </IconButton>
                    }
                  >
                    {passwordError}
                  </Alert>
                )}

                {/* Change password */}
                <Box>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: showPasswordForm ? 2 : 0 }}>
                    <Box>
                      <Typography level='title-sm'>{t('settings.security.changePassword')}</Typography>
                    </Box>
                    {!showPasswordForm && (
                      <Button
                        variant='outlined'
                        size='sm'
                        startDecorator={<VpnKeyRounded sx={{ fontSize: 16 }} />}
                        onClick={() => setShowPasswordForm(true)}
                      >
                        {t('settings.security.changePasswordCta')}
                      </Button>
                    )}
                  </Stack>

                  {showPasswordForm && (
                    <Stack spacing={2}>
                      <FormControl>
                        <FormLabel>{t('settings.security.newPassword')}</FormLabel>
                        <Input
                          type='password'
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('settings.security.newPassword')}
                        />
                        {newPassword && (
                          <Box sx={{ mt: 1 }}>
                            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                              <Typography level='body-xs' color={passwordStrength.color}>
                                {passwordStrength.label}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              determinate
                              value={passwordStrength.strength}
                              color={passwordStrength.color}
                              sx={{ height: 4, borderRadius: 'sm' }}
                            />
                          </Box>
                        )}
                      </FormControl>

                      <FormControl>
                        <FormLabel>{t('settings.security.confirmPassword')}</FormLabel>
                        <Input
                          type='password'
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('settings.security.confirmPassword')}
                        />
                      </FormControl>

                      <Stack direction='row' spacing={1}>
                        <Button
                          size='sm'
                          loading={passwordSaving}
                          onClick={handlePasswordChange}
                          disabled={!newPassword || !confirmPassword}
                        >
                          {t('settings.security.save')}
                        </Button>
                        <Button size='sm' variant='plain' color='neutral' onClick={resetPasswordForm}>
                          {t('common.cancel')}
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                </Box>

                <Divider />

                {/* 2FA — Coming Soon */}
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box>
                    <Typography level='title-sm'>{t('settings.security.twoFactor')}</Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {t('settings.security.twoFactorDesc')}
                    </Typography>
                  </Box>
                  <Chip variant='soft' color='neutral' size='sm'>
                    {t('settings.security.comingSoon')}
                  </Chip>
                </Stack>
              </Stack>
            </SectionBlock>
            <Divider />

            {/* ── Section 6: Danger Zone ─────────────────────────────────────────── */}
            <SectionBlock id='section-danger' title={t('settings.danger.title')} loading={pageLoading} titleColor='danger.plainColor'>
              <Stack spacing={2}>
                {deleteError && (
                  <Alert color='danger' variant='soft' size='sm'>
                    {deleteError}
                  </Alert>
                )}

                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box sx={{ flex: 1, pr: 2 }}>
                    <Typography level='title-sm'>{t('settings.danger.deleteAccount')}</Typography>
                    <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                      {t('settings.danger.deleteDesc')}
                    </Typography>
                  </Box>
                  <Button
                    variant='soft'
                    color='danger'
                    size='sm'
                    startDecorator={<Delete sx={{ fontSize: 16 }} />}
                    onClick={() => setShowDeleteModal(true)}
                  >
                    {t('settings.danger.deleteAccount')}
                  </Button>
                </Stack>
              </Stack>
            </SectionBlock>
          </Box>
        </Grid>
      </Grid>

      {/* Mobile floating jump button */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, position: 'fixed', bottom: 24, right: 20, zIndex: 1200 }}>
        <IconButton
          size='lg'
          variant='solid'
          color='primary'
          onClick={() => setDrawerOpen(true)}
          aria-label={t('settings.nav.jump')}
          sx={{ borderRadius: '50%', width: 52, height: 52, boxShadow: 'md' }}
        >
          <MenuRounded />
        </IconButton>
      </Box>

      {/* Mobile section drawer */}
      <Drawer anchor='bottom' open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sheet sx={{ borderRadius: 'lg lg 0 0', p: 2, pb: 4, bgcolor: 'background.surface' }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 'sm', bgcolor: 'divider', mx: 'auto', mb: 2.5 }} />
          <Typography level='title-sm' sx={{ mb: 1.5, color: 'text.secondary', px: 1 }}>
            {t('settings.nav.jumpTo')}
          </Typography>
          <List size='sm'>
            {SECTION_IDS.map((id) => {
              const key = id.replace('section-', '')
              const isActive = activeSection === id
              return (
                <ListItem key={id}>
                  <Button
                    variant='plain'
                    color={isActive ? 'primary' : 'neutral'}
                    size='sm'
                    onClick={() => {
                      scrollToSection(id)
                      setDrawerOpen(false)
                    }}
                    aria-label={t(`settings.nav.${key}`)}
                    sx={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      fontWeight: isActive ? 'md' : 'normal',
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                    }}
                  >
                    {t(`settings.nav.${key}`)}
                  </Button>
                </ListItem>
              )
            })}
          </List>
        </Sheet>
      </Drawer>

      {/* ── Re-auth Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={showReauthModal}
        onClose={() => {
          setShowReauthModal(false)
          setReauthError(null)
        }}
      >
        <ModalDialog
          sx={{
            width: { xs: '95%', sm: 420 },
            p: 0
          }}
        >
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.level1' }}>
            <Stack direction='row' spacing={1.5} alignItems='center'>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'primary.softBg',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LockRounded sx={{ fontSize: 20, color: 'primary.plainColor' }} />
              </Box>
              <Typography level='title-lg'>{t('settings.security.changePassword')}</Typography>
            </Stack>
            <ModalClose sx={{ top: 12, right: 12 }} />
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 2 }}>
              {t('settings.security.reauthRequired')}
            </Typography>

            {reauthError && (
              <Alert color='danger' variant='soft' size='sm' sx={{ mb: 2 }}>
                {reauthError}
              </Alert>
            )}

            <FormControl>
              <FormLabel>{t('settings.security.currentPassword')}</FormLabel>
              <Input
                type='password'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReauthAndUpdate()}
                placeholder={t('settings.security.currentPassword')}
                autoFocus
              />
            </FormControl>
          </Box>

          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.surface',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1
            }}
          >
            <Button
              variant='outlined'
              color='neutral'
              size='sm'
              onClick={() => {
                setShowReauthModal(false)
                setReauthError(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button size='sm' loading={reauthLoading} disabled={!currentPassword} onClick={handleReauthAndUpdate}>
              {t('settings.security.save')}
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {/* ── Delete Account Confirmation Modal ─────────────────────────────────── */}
      <DeleteConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title={t('settings.danger.modal.title')}
        description={t('settings.danger.modal.description')}
        confirmText={t('settings.danger.modal.confirm')}
        loading={deleteLoading}
        consequences={[
          { text: t('settings.danger.modal.consequence1'), icon: <BookRoundedIcon fontSize='small' /> },
          { text: t('settings.danger.modal.consequence2'), icon: <StyleRoundedIcon fontSize='small' /> },
          { text: t('settings.danger.modal.consequence3'), icon: <DeleteForeverRoundedIcon fontSize='small' /> },
          { text: t('settings.danger.modal.consequence4'), icon: <CheckCircleOutlineRoundedIcon fontSize='small' /> }
        ]}
      />
    </Container>
  )
}
