// Placeholder — full implementation in plan 03-08
import React from 'react'
import { useAuth } from '../../context/AuthContext'

const PaymentFailureBanner = () => {
  const { subscriptionStatus } = useAuth()
  // Only renders when status is past_due — full UI in plan 03-08
  if (subscriptionStatus !== 'past_due') return null
  return null
}

export default PaymentFailureBanner
