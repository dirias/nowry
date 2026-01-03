import React, { useState, useEffect } from 'react'
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Input,
  FormControl,
  FormLabel,
  Switch,
  Divider,
  Alert,
  LinearProgress,
  Select,
  Option,
  Chip
} from '@mui/joy'
import {
  Security,
  Notifications,
  Delete,
  KeyOff,
  VpnKey,
  Warning,
  Palette,
  Translate,
  DarkMode,
  LightMode,
  Timer
} from '@mui/icons-material'
import { userService } from '../../../api/services'
import { useColorScheme } from '@mui/joy/styles'
import { useThemePreferences } from '../../../theme/DynamicThemeProvider'

import { useTranslation } from 'react-i18next'

export default function AccountSettings() {
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { mode, setMode } = useColorScheme()
  const { setThemeColor } = useThemePreferences()
  const { t, i18n } = useTranslation()

  // Preferences state
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

  // ... (password data, notifications, 2fa state) ...
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [notifications, setNotifications] = useState({
    emailDigest: true,
    studyReminders: true,
    newsUpdates: false,
    marketing: false
  })

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Fetch initial data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await userService.getProfile()

        // ... (notifications setup) ...
        if (profile.notification_preferences) {
          setNotifications({
            emailDigest: profile.notification_preferences.email_digest,
            studyReminders: profile.notification_preferences.study_reminders,
            newsUpdates: profile.notification_preferences.news_updates,
            marketing: profile.notification_preferences.marketing
          })
        }

        // Set General Preferences
        if (profile.preferences) {
          setPreferences({
            interests: profile.preferences.interests || [],
            theme_color: profile.preferences.theme_color || '#0b6bcb',
            language: profile.preferences.language || 'en',
            pomodoro_work_minutes: profile.preferences.pomodoro_work_minutes || 25,
            pomodoro_short_break_minutes: profile.preferences.pomodoro_short_break_minutes || 5,
            pomodoro_long_break_minutes: profile.preferences.pomodoro_long_break_minutes || 15,
            pomodoro_auto_start: profile.preferences.pomodoro_auto_start || false,
            pomodoro_enabled: profile.preferences.pomodoro_enabled || false
          })
          // Sync global theme if different
          setThemeColor(profile.preferences.theme_color || '#0b6bcb')
        }

        if (profile.two_factor_enabled) {
          setTwoFactorEnabled(true)
        }
      } catch (error) {
        console.error('Error fetching profile settings:', error)
      }
    }
    fetchProfile()
  }, [setThemeColor])

  const handlePreferenceUpdate = async (key, value) => {
    const updatedPreferences = { ...preferences, [key]: value }
    setPreferences(updatedPreferences)

    // Update global theme context instantly
    if (key === 'theme_color') {
      setThemeColor(value)
    }

    // Update language instantly
    if (key === 'language') {
      i18n.changeLanguage(value)
    }

    try {
      await userService.updateGeneralPreferences(updatedPreferences)
    } catch (error) {
      console.error('Error updating preferences:', error)
    }
  }

  // ... (toggleInterest, password change, etc.) ...
  const toggleInterest = (interest) => {
    const currentInterests = preferences.interests
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter((i) => i !== interest)
      : [...currentInterests, interest]

    handlePreferenceUpdate('interests', newInterests)
  }

  const handlePasswordChange = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('auth.errors.passwordMismatch'))
      return
    }

    if (passwordData.newPassword.length < 8) {
      alert(t('auth.errors.passwordLength'))
      return
    }

    try {
      setLoading(true)
      await userService.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      })

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      alert(t('settings.security.successPassword'))
      setLoading(false)
    } catch (error) {
      console.error('Error changing password:', error)
      alert(error.response?.data?.detail || 'Failed to change password')
      setLoading(false)
    }
  }

  // ... (notification update, 2fa, delete account functions) ...
  const handleNotificationUpdate = async (key, value) => {
    setNotifications({ ...notifications, [key]: value })
    try {
      const apiKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      await userService.updateNotifications({ [apiKey]: value })
    } catch (error) {
      console.error('Error updating notifications:', error)
      setNotifications({ ...notifications, [key]: !value })
    }
  }

  const handleEnable2FA = async () => {
    try {
      setLoading(true)
      const response = await userService.enable2FA()
      alert(`${t('settings.security.success2FA')}\n\n${response.backup_codes.join('\n')}\n\nPlease save these codes in a safe place.`)
      setTwoFactorEnabled(true)
      setLoading(false)
    } catch (error) {
      console.error('Error enabling 2FA:', error)
      alert('Failed to enable 2FA')
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setLoading(true)
      await userService.deleteAccount()
      localStorage.clear()
      window.location.href = '/'
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
      setLoading(false)
    }
  }

  // ... (password strength helper) ...
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: 'neutral' }
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 15
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10
    let label = '',
      color = 'neutral'
    if (strength < 40) {
      label = t('auth.passwordStrength.weak')
      color = 'danger'
    } else if (strength < 70) {
      label = t('auth.passwordStrength.fair')
      color = 'warning'
    } else {
      label = t('auth.passwordStrength.strong')
      color = 'success'
    }
    return { strength, label, color }
  }

  const passwordStrength = getPasswordStrength(passwordData.newPassword)
  const availableInterests = ['Technology', 'Science', 'History', 'Languages', 'Art', 'Mathematics', 'Literature', 'Music']

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level='h2' fontWeight={700} sx={{ mb: 0.5 }}>
          ⚙️ {t('settings.title')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
          {t('settings.subtitle')}
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* General Preferences */}
        <Card>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 3 }}>
              <Palette color='primary' />
              <Typography level='h4' fontWeight={600}>
                {t('settings.general.title')}
              </Typography>
            </Stack>

            <Stack spacing={3}>
              {/* Appearance (Theme Mode) */}
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {t('settings.general.appearance')}
                </Typography>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LightMode sx={{ color: mode === 'light' ? 'warning.500' : 'neutral.500' }} />
                    <Switch
                      checked={mode === 'dark'}
                      onChange={(event) => setMode(event.target.checked ? 'dark' : 'light')}
                      color={mode === 'dark' ? 'primary' : 'neutral'}
                      variant={mode === 'dark' ? 'solid' : 'outlined'}
                    />
                    <DarkMode sx={{ color: mode === 'dark' ? 'primary.400' : 'neutral.500' }} />
                  </Box>
                  <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                    {t('settings.general.appearanceDesc')}
                  </Typography>
                </Stack>
              </Box>

              <Divider />

              {/* Language */}
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {t('settings.general.language')}
                </Typography>
                <Select
                  value={preferences.language}
                  onChange={(e, val) => handlePreferenceUpdate('language', val)}
                  startDecorator={<Translate />}
                >
                  <Option value='en'>English (US)</Option>
                  <Option value='es'>Español</Option>
                  <Option value='fr'>Français</Option>
                  <Option value='de'>Deutsch</Option>
                  <Option value='ja'>日本語</Option>
                </Select>
              </Box>

              <Divider />

              {/* Theme Color */}
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {t('settings.general.themeColor')}
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
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    <input
                      type='color'
                      value={preferences.theme_color}
                      onChange={(e) => handlePreferenceUpdate('theme_color', e.target.value)}
                      style={{
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
                  <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                    {t('settings.general.themeColorDesc')}
                  </Typography>
                </Stack>
              </Box>

              <Divider />

              {/* Interests */}
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  {t('settings.general.interests')}
                </Typography>
                <Typography level='body-xs' sx={{ mb: 2, color: 'neutral.600' }}>
                  {t('settings.general.interestsDesc')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {availableInterests.map((interest) => (
                    <Chip
                      key={interest}
                      variant={preferences.interests.includes(interest) ? 'soft' : 'outlined'}
                      color={preferences.interests.includes(interest) ? 'primary' : 'neutral'}
                      onClick={() => toggleInterest(interest)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {t(`onboarding.interests.items.${interest}`, interest)}
                    </Chip>
                  ))}
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Productivity (Pomodoro) */}
        <Card>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 3 }}>
              <Timer color='primary' />
              <Typography level='h4' fontWeight={600}>
                Productivity
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-md'>Enable Productivity Timer</Typography>
                  <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                    Show timer in header and enable floating widget
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
                      Focus Duration (minutes)
                    </Typography>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Input
                        type='number'
                        value={preferences.pomodoro_work_minutes}
                        onChange={(e) => handlePreferenceUpdate('pomodoro_work_minutes', parseInt(e.target.value) || 25)}
                        sx={{ width: 80 }}
                        slotProps={{ input: { min: 1, max: 60 } }}
                      />
                      <Typography level='body-sm' textColor='neutral.500'>
                        Recommended: 25
                      </Typography>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography level='title-sm' sx={{ mb: 1 }}>
                      Short Break (minutes)
                    </Typography>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Input
                        type='number'
                        value={preferences.pomodoro_short_break_minutes}
                        onChange={(e) => handlePreferenceUpdate('pomodoro_short_break_minutes', parseInt(e.target.value) || 5)}
                        sx={{ width: 80 }}
                        slotProps={{ input: { min: 1, max: 30 } }}
                      />
                      <Typography level='body-sm' textColor='neutral.500'>
                        Recommended: 5
                      </Typography>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography level='title-sm' sx={{ mb: 1 }}>
                      Long Break (minutes)
                    </Typography>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Input
                        type='number'
                        value={preferences.pomodoro_long_break_minutes}
                        onChange={(e) => handlePreferenceUpdate('pomodoro_long_break_minutes', parseInt(e.target.value) || 15)}
                        sx={{ width: 80 }}
                        slotProps={{ input: { min: 5, max: 60 } }}
                      />
                      <Typography level='body-sm' textColor='neutral.500'>
                        Recommended: 15
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Box>
                      <Typography level='title-sm'>Auto-start Timer</Typography>
                      <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                        Automatically start the next timer when one finishes
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
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 3 }}>
              <Security color='primary' />
              <Typography level='h4' fontWeight={600}>
                {t('settings.security.title')}
              </Typography>
            </Stack>

            {/* Change Password */}
            <Box sx={{ mb: 4 }}>
              <Typography level='title-md' sx={{ mb: 2 }}>
                {t('settings.security.changePassword')}
              </Typography>

              <Stack spacing={2}>
                <FormControl>
                  <FormLabel>{t('settings.security.currentPassword')}</FormLabel>
                  <Input
                    type='password'
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder={t('settings.security.currentPassword')}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('settings.security.newPassword')}</FormLabel>
                  <Input
                    type='password'
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder={t('settings.security.newPassword')}
                  />

                  {passwordData.newPassword && (
                    <Box sx={{ mt: 1 }}>
                      <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                        <Typography level='body-xs' sx={{ color: `${passwordStrength.color}.600` }}>
                          {passwordStrength.label}
                        </Typography>
                      </Stack>
                      <LinearProgress determinate value={passwordStrength.strength} color={passwordStrength.color} sx={{ height: 4 }} />
                    </Box>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>{t('settings.security.confirmPassword')}</FormLabel>
                  <Input
                    type='password'
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder={t('settings.security.confirmPassword')}
                  />
                </FormControl>

                <Button
                  startDecorator={<VpnKey />}
                  onClick={handlePasswordChange}
                  loading={loading}
                  disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {t('settings.security.updatePassword')}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Two-Factor Authentication */}
            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-md' sx={{ mb: 0.5 }}>
                    {t('settings.security.twoFactor')}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                    {t('settings.security.twoFactorDesc')}
                  </Typography>
                </Box>

                {twoFactorEnabled ? (
                  <Button
                    variant='soft'
                    color='danger'
                    startDecorator={<KeyOff />}
                    onClick={async () => {
                      try {
                        await userService.disable2FA()
                        setTwoFactorEnabled(false)
                        alert('2FA disabled successfully')
                      } catch (error) {
                        console.error('Error disabling 2FA:', error)
                        alert('Failed to disable 2FA')
                      }
                    }}
                  >
                    {t('settings.security.disable2FA')}
                  </Button>
                ) : (
                  <Button variant='soft' color='success' startDecorator={<VpnKey />} onClick={handleEnable2FA} loading={loading}>
                    {t('settings.security.enable2FA')}
                  </Button>
                )}
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 3 }}>
              <Notifications color='primary' />
              <Typography level='h4' fontWeight={600}>
                {t('settings.notifications.title')}
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-sm'>{t('settings.notifications.emailDigest')}</Typography>
                  <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                    {t('settings.notifications.emailDigestDesc')}
                  </Typography>
                </Box>
                <Switch checked={notifications.emailDigest} onChange={(e) => handleNotificationUpdate('emailDigest', e.target.checked)} />
              </Stack>

              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-sm'>{t('settings.notifications.studyReminders')}</Typography>
                  <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                    {t('settings.notifications.studyRemindersDesc')}
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.studyReminders}
                  onChange={(e) => handleNotificationUpdate('studyReminders', e.target.checked)}
                />
              </Stack>

              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-sm'>{t('settings.notifications.newsUpdates')}</Typography>
                  <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                    {t('settings.notifications.newsUpdatesDesc')}
                  </Typography>
                </Box>
                <Switch checked={notifications.newsUpdates} onChange={(e) => handleNotificationUpdate('newsUpdates', e.target.checked)} />
              </Stack>

              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-sm'>{t('settings.notifications.marketing')}</Typography>
                  <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                    {t('settings.notifications.marketingDesc')}
                  </Typography>
                </Box>
                <Switch checked={notifications.marketing} onChange={(e) => handleNotificationUpdate('marketing', e.target.checked)} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card variant='outlined' color='danger'>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 3 }}>
              <Warning color='error' />
              <Typography level='h4' fontWeight={600} color='danger'>
                {t('settings.danger.title')}
              </Typography>
            </Stack>

            {!showDeleteConfirm ? (
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography level='title-md' sx={{ mb: 0.5 }}>
                    {t('settings.danger.deleteAccount')}
                  </Typography>
                  <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                    {t('settings.danger.deleteDesc')}
                  </Typography>
                </Box>
                <Button variant='soft' color='danger' startDecorator={<Delete />} onClick={() => setShowDeleteConfirm(true)}>
                  {t('settings.danger.deleteAccount')}
                </Button>
              </Stack>
            ) : (
              <Alert color='danger' variant='soft' startDecorator={<Warning />}>
                <Box>
                  <Typography level='title-sm' sx={{ mb: 1 }}>
                    {t('settings.danger.confirmTitle')}
                  </Typography>
                  <Typography level='body-sm' sx={{ mb: 2 }}>
                    {t('settings.danger.confirmDesc')}
                  </Typography>
                  <Stack direction='row' spacing={1}>
                    <Button size='sm' variant='solid' color='danger' onClick={handleDeleteAccount} loading={loading}>
                      {t('settings.danger.confirmBtn')}
                    </Button>
                    <Button size='sm' variant='plain' color='neutral' onClick={() => setShowDeleteConfirm(false)}>
                      {t('settings.danger.cancelBtn')}
                    </Button>
                  </Stack>
                </Box>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
