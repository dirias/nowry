import React from 'react'
import { Box, Typography, Button } from '@mui/joy'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'

/**
 * ErrorBoundary
 * Catches render errors in its subtree so one broken section
 * cannot crash the entire app.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 4,
            minHeight: 200,
            textAlign: 'center',
            color: 'text.secondary'
          }}
        >
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: 'warning.400' }} />
          <Typography level='title-md' color='neutral'>
            Something went wrong in this section.
          </Typography>
          <Button size='sm' variant='outlined' color='neutral' onClick={this.handleReset}>
            Try again
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
