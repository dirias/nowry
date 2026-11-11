import React from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Container } from '@mui/joy'
import { SHOW_PRICING } from '@nowry/core/domain/plans'
import EarlyAccess from './landing/EarlyAccess'

/**
 * `/pricing` (ADR-073). While prices are hidden it is the early-access
 * sentence and its key; once they are shown, pricing lives on the landing.
 */
const PricingPage = () => {
  if (SHOW_PRICING) return <Navigate to={{ pathname: '/', hash: '#pricing' }} replace />

  return (
    <Box sx={{ bgcolor: 'background.body' }}>
      <Container maxWidth='lg'>
        <EarlyAccess headingComponent='h1' />
      </Container>
    </Box>
  )
}

export default PricingPage
