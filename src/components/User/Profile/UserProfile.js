import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Avatar,
  Chip,
  Grid,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText,
  IconButton,
  Snackbar
} from '@mui/joy'
import { Edit, Save, Cancel, CameraAlt, AccountCircle, Email, CalendarToday } from '@mui/icons-material'
import { userService } from '../../../api/services'
import { useAuth } from '../../../context/AuthContext'
import { getUsernameValidationError } from '../../../utils/usernameValidation'

export default function UserProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  // User data state
  const [userData, setUserData] = useState({
    username: user?.username || '',
    email: '',
    bio: '',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
    subscription: {
      tier: 'free',
      status: 'active'
    },
    stats: {
      totalCards: 0,
      booksCreated: 0,
      studyStreak: 0
    }
  })

  const [editData, setEditData] = useState({ ...userData })
  const [usernameError, setUsernameError] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', color: 'danger' })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await userService.getProfile()

      // Map API response to component state
      const profileData = {
        username: response.username,
        email: response.email,
        bio: response.bio || '',
        avatarUrl: response.avatar_url || '',
        createdAt: response.created_at,
        subscription: response.subscription || {
          tier: 'free',
          status: 'active',
          limits: {},
          usage: {}
        },
        stats: {
          totalCards: response.stats.total_cards,
          booksCreated: response.stats.books_created,
          studyStreak: response.stats.study_streak
        }
      }

      setUserData(profileData)
      setEditData(profileData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const trimmedUsername = editData.username.trim()
    const validationError = getUsernameValidationError(trimmedUsername, t)
    if (validationError) {
      setUsernameError(validationError)
      return
    }

    try {
      setLoading(true)
      setUsernameError(null)

      // Handle avatar upload
      if (avatarFile) {
        const avatarResponse = await userService.uploadAvatar(avatarFile)
        editData.avatarUrl = avatarResponse.avatar_url
      }

      // Update profile — username and bio are the only fields this page
      // (still) owns; `PATCH /users/profile` is the single endpoint both
      // this page and Account Settings use for username, so uniqueness
      // conflicts (409) come back the same way in both places.
      await userService.patchProfile({
        username: trimmedUsername,
        bio: editData.bio
      })

      setUserData({ ...editData, username: trimmedUsername })
      setAvatarFile(null)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      if (error?.response?.status === 409) {
        setUsernameError(t('settings.account.usernameTaken'))
      } else {
        setSnackbar({ open: true, message: t('settings.errors.networkError'), color: 'danger' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditData({ ...userData })
    setAvatarFile(null)
    setUsernameError(null)
    setIsEditing(false)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert(t('profile.uploadImage'))
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(t('profile.selectImage'))
        return
      }

      setAvatarFile(file)

      // Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditData({ ...editData, avatarUrl: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const getTierColor = (tier) => {
    switch (tier) {
      case 'free':
        return 'neutral'
      case 'student':
        return 'primary'
      case 'pro':
        return 'success'
      case 'enterprise':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const daysAgo = Math.floor((Date.now() - new Date(userData.createdAt)) / (1000 * 60 * 60 * 24))

  // Helper to calculate usage percentage
  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  return (
    <Container maxWidth='lg' sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography level='h2' fontWeight={700} sx={{ mb: 0.5 }}>
          {t('profile.title')}
        </Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('profile.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Left Column - Profile Card */}
        <Grid xs={12} md={4}>
          <Card variant='outlined'>
            <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
              {/* Avatar */}
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Avatar
                  src={editData.avatarUrl}
                  sx={{
                    width: { xs: 100, md: 120 },
                    height: { xs: 100, md: 120 },
                    fontSize: 'xl5',
                    bgcolor: 'primary.solidBg'
                  }}
                >
                  {editData.username ? editData.username.charAt(0).toUpperCase() : '?'}
                </Avatar>

                {isEditing && (
                  <IconButton
                    component='label'
                    size='sm'
                    variant='solid'
                    color='primary'
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      borderRadius: '50%'
                    }}
                  >
                    <CameraAlt fontSize='small' />
                    <input type='file' hidden accept='image/*' onChange={handleAvatarChange} />
                  </IconButton>
                )}
              </Box>

              {/* Username */}
              <Typography level='h4' fontWeight={600} sx={{ mb: 2 }}>
                @{userData.username}
              </Typography>

              {/* Subscription Badge */}
              <Chip size='lg' variant='soft' color={getTierColor(userData.subscription.tier)} sx={{ mb: 3, textTransform: 'capitalize' }}>
                {userData.subscription.tier} Plan
              </Chip>

              {/* Usage Stats from Subscription (if available) */}
              {userData.subscription.limits && (
                <Stack spacing={2} sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
                  <Typography level='title-sm' sx={{ mb: 1 }}>
                    Plan Usage
                  </Typography>

                  {/* Books Usage */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                        Books
                      </Typography>
                      <Typography level='body-xs' sx={{ fontWeight: 600 }}>
                        {userData.subscription.limits.books === -1
                          ? `${userData.subscription.usage?.books || 0} / ∞`
                          : `${userData.subscription.usage?.books || 0} / ${userData.subscription.limits.books}`}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'background.level2',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${getUsagePercentage(userData.subscription.usage?.books || 0, userData.subscription.limits.books)}%`,
                          height: '100%',
                          bgcolor:
                            getTierColor(userData.subscription.tier) === 'neutral'
                              ? 'neutral.solidBg'
                              : `${getTierColor(userData.subscription.tier)}.solidBg`
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Flashcards Usage */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                        Flashcards
                      </Typography>
                      <Typography level='body-xs' sx={{ fontWeight: 600 }}>
                        {userData.subscription.limits.flashcards === -1
                          ? `${userData.subscription.usage?.flashcards || 0} / ∞`
                          : `${userData.subscription.usage?.flashcards || 0} / ${userData.subscription.limits.flashcards}`}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'background.level2',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${getUsagePercentage(userData.subscription.usage?.flashcards || 0, userData.subscription.limits.flashcards)}%`,
                          height: '100%',
                          bgcolor:
                            getTierColor(userData.subscription.tier) === 'neutral'
                              ? 'neutral.solidBg'
                              : `${getTierColor(userData.subscription.tier)}.solidBg`
                        }}
                      />
                    </Box>
                  </Box>
                </Stack>
              )}

              {/* Quick Stats */}
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('profile.stats.totalCards')}
                  </Typography>
                  <Typography level='title-md' fontWeight={600}>
                    {userData.stats.totalCards}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('profile.stats.booksCreated')}
                  </Typography>
                  <Typography level='title-md' fontWeight={600}>
                    {userData.stats.booksCreated}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                    {t('profile.stats.studyStreak')}
                  </Typography>
                  <Typography level='title-md' fontWeight={600} color='warning'>
                    🔥 {userData.stats.studyStreak} {t('profile.stats.days')}
                  </Typography>
                </Box>
              </Stack>

              {/* Member Since */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction='row' spacing={1} alignItems='center' justifyContent='center'>
                  <CalendarToday sx={{ fontSize: 16, color: 'text.tertiary' }} />
                  <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                    {t('profile.memberSince', { days: daysAgo })}
                  </Typography>
                </Stack>
                <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                  {t('profile.joined', { date: formatDate(userData.createdAt) })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Editable Info */}
        <Grid xs={12} md={8}>
          <Card variant='outlined'>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              {/* Header with Edit Button */}
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
                <Typography level='h4' fontWeight={600}>
                  {t('profile.subtitle')}
                </Typography>

                {!isEditing ? (
                  <Button startDecorator={<Edit />} onClick={() => setIsEditing(true)} variant='soft' size='sm'>
                    {t('profile.edit')}
                  </Button>
                ) : (
                  <Stack direction='row' spacing={1}>
                    <Button startDecorator={<Cancel />} onClick={handleCancel} variant='plain' color='neutral' size='sm'>
                      {t('profile.cancel')}
                    </Button>
                    <Button startDecorator={<Save />} onClick={handleSave} loading={loading} color='primary' size='sm'>
                      {loading ? t('profile.saving') : t('profile.save')}
                    </Button>
                  </Stack>
                )}
              </Stack>

              <Stack spacing={3}>
                {/* Username — the single editable identity field (PATCH /users/profile) */}
                <FormControl error={!!usernameError}>
                  <FormLabel>{t('settings.account.username')}</FormLabel>
                  {isEditing ? (
                    <Input
                      value={editData.username}
                      onChange={(e) => {
                        setEditData({ ...editData, username: e.target.value })
                        if (usernameError) setUsernameError(null)
                      }}
                      placeholder={t('settings.account.username')}
                      startDecorator={<AccountCircle sx={{ color: 'text.secondary' }} />}
                      size='lg'
                      aria-label={t('settings.account.username')}
                    />
                  ) : (
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <AccountCircle sx={{ color: 'text.secondary' }} />
                      <Typography level='body-lg'>@{userData.username}</Typography>
                    </Stack>
                  )}
                  {usernameError && <FormHelperText>{usernameError}</FormHelperText>}
                </FormControl>

                {/* Email */}
                <FormControl>
                  <FormLabel>{t('profile.email')}</FormLabel>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Email sx={{ color: 'text.secondary' }} />
                    <Typography level='body-lg'>{userData.email}</Typography>
                  </Stack>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                    Managed in Account Settings
                  </Typography>
                </FormControl>

                {/* Bio */}
                <FormControl>
                  <FormLabel>{t('profile.bio')}</FormLabel>
                  {isEditing ? (
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      placeholder={t('profile.bioPlaceholder')}
                      minRows={4}
                      maxRows={6}
                    />
                  ) : (
                    <Typography level='body-md' sx={{ whiteSpace: 'pre-wrap' }}>
                      {userData.bio || (
                        <Typography component='span' sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>
                          {t('profile.noBio')}
                        </Typography>
                      )}
                    </Typography>
                  )}
                </FormControl>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        variant='soft'
        color={snackbar.color}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        {snackbar.message}
      </Snackbar>
    </Container>
  )
}
