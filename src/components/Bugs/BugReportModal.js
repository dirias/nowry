import React, { useState } from 'react'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Stack,
  Input,
  Textarea,
  Select,
  Button,
  FormLabel,
  FormHelperText,
  Option,
  IconButton,
  Alert
} from '@mui/joy'
import { Bug, Upload, X, AlertCircle } from 'lucide-react'

/**
 * Bug Report Modal Component
 *
 * Allows users to submit bug reports with:
 * - Title and description
 * - Steps to reproduce
 * - Expected vs actual behavior
 * - Severity and category
 * - Screenshot attachments (max 3)
 */
export default function BugReportModal({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    severity: 'medium',
    category: 'functionality',
    screenshots: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Check max screenshots
    if (formData.screenshots.length >= 3) {
      setError('Maximum 3 screenshots allowed')
      return
    }

    try {
      setError(null)
      // Compress and convert to base64
      const base64 = await compressAndConvert(file)

      setFormData((prev) => ({
        ...prev,
        screenshots: [
          ...prev.screenshots,
          {
            filename: file.name,
            data: base64,
            uploaded_at: new Date().toISOString()
          }
        ]
      }))
    } catch (err) {
      setError('Failed to upload screenshot. Please try again.')
      console.error('Screenshot upload error:', err)
    }
  }

  const removeScreenshot = (index) => {
    setFormData({
      ...formData,
      screenshots: formData.screenshots.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title.trim()) {
      setError('Please enter a bug title')
      return
    }

    if (!formData.description.trim()) {
      setError('Please enter a description')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Capture browser info automatically
      const browserInfo = getBrowserInfo()

      await onSubmit({
        ...formData,
        url: window.location.pathname,
        browser_info: browserInfo
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        steps_to_reproduce: '',
        expected_behavior: '',
        actual_behavior: '',
        severity: 'medium',
        category: 'functionality',
        screenshots: []
      })

      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit bug report. Please try again.')
      console.error('Bug submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ width: 600, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
        <ModalClose />

        <Stack spacing={2}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bug size={24} color='#f97316' />
            <h2 style={{ margin: 0 }}>Report a Bug</h2>
          </div>

          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Help us improve Nowry by reporting issues you encounter. Your feedback is valuable!
          </p>

          {/* Error Alert */}
          {error && (
            <Alert color='danger' startDecorator={<AlertCircle size={20} />}>
              {error}
            </Alert>
          )}

          {/* Title */}
          <div>
            <FormLabel required>Bug Title</FormLabel>
            <Input
              placeholder='e.g., Editor crashes when pasting large content'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <FormHelperText>Briefly describe the issue</FormHelperText>
          </div>

          {/* Description */}
          <div>
            <FormLabel required>Description</FormLabel>
            <Textarea
              placeholder='Provide details about what happened...'
              minRows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <FormLabel>Steps to Reproduce</FormLabel>
            <Textarea
              placeholder='1. Go to...\n2. Click on...\n3. See error'
              minRows={3}
              value={formData.steps_to_reproduce}
              onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
            />
            <FormHelperText>Help us recreate the issue</FormHelperText>
          </div>

          {/* Expected vs Actual Behavior */}
          <Stack direction='row' spacing={2}>
            <div style={{ flex: 1 }}>
              <FormLabel>Expected Behavior</FormLabel>
              <Textarea
                placeholder='What should happen?'
                minRows={2}
                value={formData.expected_behavior}
                onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <FormLabel>Actual Behavior</FormLabel>
              <Textarea
                placeholder='What actually happened?'
                minRows={2}
                value={formData.actual_behavior}
                onChange={(e) => setFormData({ ...formData, actual_behavior: e.target.value })}
              />
            </div>
          </Stack>

          {/* Severity & Category */}
          <Stack direction='row' spacing={2}>
            <div style={{ flex: 1 }}>
              <FormLabel>Severity</FormLabel>
              <Select value={formData.severity} onChange={(e, value) => setFormData({ ...formData, severity: value })}>
                <Option value='low'>Low - Minor inconvenience</Option>
                <Option value='medium'>Medium - Noticeable issue</Option>
                <Option value='high'>High - Major problem</Option>
                <Option value='critical'>Critical - App unusable</Option>
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <FormLabel>Category</FormLabel>
              <Select value={formData.category} onChange={(e, value) => setFormData({ ...formData, category: value })}>
                <Option value='ui'>UI/Design</Option>
                <Option value='functionality'>Functionality</Option>
                <Option value='performance'>Performance</Option>
                <Option value='other'>Other</Option>
              </Select>
            </div>
          </Stack>

          {/* Screenshot Upload */}
          <div>
            <FormLabel>Screenshots (Optional - Max 3)</FormLabel>
            <Button
              component='label'
              variant='outlined'
              color='neutral'
              startDecorator={<Upload size={16} />}
              disabled={formData.screenshots.length >= 3}
            >
              {formData.screenshots.length >= 3 ? 'Maximum reached' : 'Upload Screenshot'}
              <input type='file' hidden accept='image/*' onChange={handleScreenshotUpload} disabled={formData.screenshots.length >= 3} />
            </Button>

            {formData.screenshots.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {formData.screenshots.map((screenshot, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      borderRadius: '6px'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>{screenshot.filename}</span>
                    <IconButton size='sm' variant='plain' color='danger' onClick={() => removeScreenshot(idx)}>
                      <X size={16} />
                    </IconButton>
                  </div>
                ))}
              </Stack>
            )}
            <FormHelperText>{formData.screenshots.length}/3 screenshots • Images will be compressed</FormHelperText>
          </div>

          {/* Submit Button */}
          <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
            <Button variant='outlined' color='neutral' onClick={onClose} fullWidth disabled={loading}>
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleSubmit}
              loading={loading}
              disabled={!formData.title.trim() || !formData.description.trim()}
              startDecorator={!loading && <Bug size={16} />}
            >
              Submit Bug Report
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}

// Helper functions

/**
 * Get browser information
 */
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

/**
 * Compress image and convert to base64
 * Max size: 500KB
 */
async function compressAndConvert(file) {
  const MAX_WIDTH = 1200
  const MAX_HEIGHT = 800
  const MAX_SIZE = 500 * 1024 // 500KB

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Try different quality levels to get under MAX_SIZE
        let quality = 0.7
        let dataURL = canvas.toDataURL('image/jpeg', quality)

        // Reduce quality if still too large
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
