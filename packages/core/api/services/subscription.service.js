import { apiClient } from '../client'

export const subscriptionService = {
  createCheckoutSession: async (priceId) => {
    const response = await apiClient.post('/stripe/create-checkout-session', { price_id: priceId })
    return response.data // { url: "https://checkout.stripe.com/..." }
  },
  createPortalSession: async () => {
    const response = await apiClient.post('/stripe/create-portal-session')
    return response.data // { url: "https://billing.stripe.com/..." }
  },
  getSubscriptionStatus: async () => {
    const response = await apiClient.get('/stripe/subscription-status')
    return response.data
  }
}
