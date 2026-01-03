import React from 'react'
import { Box, Typography, Button, Alert } from '@mui/joy'
import { AlertTriangle } from 'lucide-react'

class EditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service (Sentry, LogRocket, etc.)
    console.error('Editor Error:', error, errorInfo)

    // TODO: Send to error tracking service
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo })
    // }
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
    // Optionally reload the page or reset editor state
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            p: 4,
            textAlign: 'center'
          }}
        >
          <Alert color='danger' variant='soft' startDecorator={<AlertTriangle />} sx={{ mb: 3, maxWidth: 600 }}>
            <Box>
              <Typography level='title-lg' sx={{ mb: 1 }}>
                Editor Error
              </Typography>
              <Typography level='body-sm'>The editor encountered an unexpected error. Your content has been preserved.</Typography>
              {this.state.error && (
                <Typography level='body-xs' sx={{ mt: 1, fontFamily: 'monospace', color: 'danger.plainColor' }}>
                  {this.state.error.message}
                </Typography>
              )}
            </Box>
          </Alert>
          <Button onClick={this.handleReset} variant='solid' color='primary'>
            Reload Editor
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

export default EditorErrorBoundary
