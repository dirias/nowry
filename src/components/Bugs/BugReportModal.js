import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  Chip,
  DialogContent,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Snackbar,
  Stack,
  Textarea,
  Tooltip,
  Typography
} from '@mui/joy'
import { Bug, Upload, X } from 'lucide-react'

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITIES = [
  { value: 'low', color: 'success' },
  { value: 'medium', color: 'warning' },
  { value: 'high', color: 'danger' },
  { value: 'critical', color: 'danger' }
]

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = ['ui', 'performance', 'functionality', 'data', 'other']

// ─── Initial form state ───────────────────────────────────────────────────────
const INITIAL_FORM = {
  title: '',
  description: '',
  steps_to_reproduce: '',
  severity: 'medium',
  category: 'functionality',
  screenshots: []
}

// ─── BugReportModal ───────────────────────────────────────────────────────────
export default function BugReportModal({ open, onClose, onSubmit }) {
  const { t } = useTranslation()

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, color: 'success', msg: '' })

  const fileInputRef = useRef(null)

  // ── Field helpers ────────────────────────────────────────────────────────────
  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  // ── Screenshot upload ────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    // Reset input so same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    if (formData.screenshots.length >= 3) return

    try {
      const base64 = await compressAndConvert(file)
      setFormData((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, { filename: file.name, data: base64, uploaded_at: new Date().toISOString() }]
      }))
    } catch (err) {
      console.error('Screenshot upload error:', err)
    }
  }

  const removeScreenshot = (idx) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== idx)
    }))
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        url: window.location.pathname,
        browser_info: getBrowserInfo()
      })
      setFormData(INITIAL_FORM)
      setSnackbar({ open: true, color: 'success', msg: t('bugs.modal.successMsg') })
      onClose()
    } catch (err) {
      console.error('Bug submission error:', err)
      setSnackbar({ open: true, color: 'danger', msg: t('bugs.modal.errorMsg') })
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = formData.title.trim() && formData.description.trim()
  const maxReached = formData.screenshots.length >= 3

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <ModalDialog
          sx={{
            width: { xs: '95%', sm: '85%', md: '75%', lg: '600px' },
            maxWidth: '600px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            p: 0,
            overflow: 'hidden'
          }}
        >
          {/* ── Header ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 3,
              py: 2,
              bgcolor: 'background.level1',
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 'sm',
                bgcolor: 'warning.softBg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Bug size={18} color='var(--joy-palette-warning-plainColor)' />
            </Box>
            <Typography level='h4' sx={{ flex: 1 }}>
              {t('bugs.modal.title')}
            </Typography>
            <ModalClose sx={{ position: 'static', mt: 0 }} />
          </Box>

          {/* ── Scrollable body ── */}
          <DialogContent sx={{ px: 3, py: 2.5, overflowY: 'auto' }}>
            <Stack spacing={3}>
              {/* Bug title */}
              <FormControl required>
                <FormLabel>{t('bugs.modal.titleField')}</FormLabel>
                <Input
                  placeholder={t('bugs.modal.titlePlaceholder')}
                  value={formData.title}
                  onChange={set('title')}
                  aria-label={t('bugs.modal.titleField')}
                  sx={{ '&:focus-within': { outline: '2px solid', outlineColor: 'primary.outlinedBorder' } }}
                />
              </FormControl>

              {/* Description */}
              <FormControl required>
                <FormLabel>{t('bugs.modal.description')}</FormLabel>
                <Textarea
                  placeholder={t('bugs.modal.descPlaceholder')}
                  minRows={3}
                  value={formData.description}
                  onChange={set('description')}
                  aria-label={t('bugs.modal.description')}
                />
              </FormControl>

              {/* Steps to reproduce */}
              <FormControl>
                <FormLabel>{t('bugs.modal.steps')}</FormLabel>
                <Textarea
                  placeholder={t('bugs.modal.stepsPlaceholder')}
                  minRows={3}
                  value={formData.steps_to_reproduce}
                  onChange={set('steps_to_reproduce')}
                  aria-label={t('bugs.modal.steps')}
                />
              </FormControl>

              <Divider />

              {/* Severity */}
              <Box>
                <Typography level='body-sm' sx={{ mb: 1, fontWeight: 'md', color: 'text.secondary' }}>
                  {t('bugs.modal.severity')}
                </Typography>
                <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap>
                  {SEVERITIES.map(({ value, color }) => {
                    const isActive = formData.severity === value
                    return (
                      <Chip
                        key={value}
                        size='sm'
                        variant={isActive ? 'solid' : 'outlined'}
                        color={isActive ? color : 'neutral'}
                        onClick={() => setFormData((prev) => ({ ...prev, severity: value }))}
                        sx={{
                          cursor: 'pointer',
                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' },
                          '&:active': { transform: 'scale(0.95)' }
                        }}
                      >
                        {t(`bugs.severity.${value}`)}
                      </Chip>
                    )
                  })}
                </Stack>
              </Box>

              {/* Category */}
              <Box>
                <Typography level='body-sm' sx={{ mb: 1, fontWeight: 'md', color: 'text.secondary' }}>
                  {t('bugs.modal.category')}
                </Typography>
                <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap>
                  {CATEGORIES.map((value) => {
                    const isActive = formData.category === value
                    return (
                      <Chip
                        key={value}
                        size='sm'
                        variant={isActive ? 'solid' : 'outlined'}
                        color='neutral'
                        onClick={() => setFormData((prev) => ({ ...prev, category: value }))}
                        sx={{
                          cursor: 'pointer',
                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' },
                          '&:active': { transform: 'scale(0.95)' }
                        }}
                      >
                        {t(`bugs.category.${value}`)}
                      </Chip>
                    )
                  })}
                </Stack>
              </Box>

              <Divider />

              {/* Screenshots */}
              <FormControl>
                <FormLabel>{t('bugs.modal.screenshots')}</FormLabel>

                {/* Hidden native file input */}
                <input ref={fileInputRef} type='file' accept='image/*' hidden onChange={handleUpload} aria-hidden='true' />

                <Button
                  variant='outlined'
                  color='neutral'
                  size='sm'
                  startDecorator={<Upload size={14} />}
                  disabled={maxReached}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('bugs.modal.uploadBtn')}
                  sx={{
                    alignSelf: 'flex-start',
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                  }}
                >
                  {maxReached ? t('bugs.modal.maxReached') : t('bugs.modal.uploadBtn')}
                </Button>

                {/* Thumbnail list */}
                {formData.screenshots.length > 0 && (
                  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    {formData.screenshots.map((screenshot, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 'sm',
                          bgcolor: 'background.level1',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Typography
                          level='body-xs'
                          sx={{
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            mr: 1
                          }}
                        >
                          {screenshot.filename}
                        </Typography>
                        <Tooltip title={t('bugs.modal.removeScreenshot')} size='sm'>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='danger'
                            onClick={() => removeScreenshot(idx)}
                            aria-label={t('bugs.modal.removeScreenshot')}
                            sx={{
                              flexShrink: 0,
                              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
                            }}
                          >
                            <X size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Stack>
                )}

                <FormHelperText sx={{ color: 'text.tertiary' }}>
                  {t('bugs.modal.screenshotsHint', { count: formData.screenshots.length })}
                </FormHelperText>
              </FormControl>
            </Stack>
          </DialogContent>

          {/* ── Sticky footer ── */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              px: 3,
              py: 2,
              bgcolor: 'background.surface',
              borderTop: '1px solid',
              borderColor: 'divider',
              flexShrink: 0
            }}
          >
            <Button
              variant='plain'
              color='neutral'
              onClick={onClose}
              disabled={loading}
              aria-label={t('common.cancel')}
              sx={{
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant='solid'
              color='primary'
              loading={loading}
              disabled={!canSubmit}
              onClick={handleSubmit}
              startDecorator={!loading ? <Bug size={14} /> : null}
              aria-label={t('bugs.modal.submit')}
              sx={{
                ml: 'auto',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder', outlineOffset: '2px' }
              }}
            >
              {loading ? t('bugs.modal.submitting') : t('bugs.modal.submit')}
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {/* ── Snackbar feedback ── */}
      <Snackbar
        open={snackbar.open}
        color={snackbar.color}
        variant='soft'
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar.msg}
      </Snackbar>
    </>
  )
}

// ─── Browser info helpers ─────────────────────────────────────────────────────
function getBrowserInfo() {
  const ua = navigator.userAgent
  return {
    name: getBrowserName(ua),
    version: getBrowserVersion(ua),
    os: getOS(ua),
    screen_resolution: `${window.screen.width}x${window.screen.height}`
  }
}

function getBrowserName(ua) {
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Opera')) return 'Opera'
  return 'Unknown'
}

function getBrowserVersion(ua) {
  const match = ua.match(/(Firefox|Chrome|Safari|Edge|Opera)\/(\d+\.\d+)/)
  return match ? match[2] : 'Unknown'
}

function getOS(ua) {
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS')) return 'iOS'
  return 'Unknown'
}

// ─── Image compression ────────────────────────────────────────────────────────
async function compressAndConvert(file) {
  const MAX_WIDTH = 1200
  const MAX_HEIGHT = 800
  const MAX_SIZE = 500 * 1024 // 500 KB

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        let quality = 0.7
        let dataURL = canvas.toDataURL('image/jpeg', quality)
        while (dataURL.length > MAX_SIZE && quality > 0.1) {
          quality -= 0.1
          dataURL = canvas.toDataURL('image/jpeg', quality)
        }

        resolve(dataURL)
      }

      img.onerror = reject
      img.src = e.target.result
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
