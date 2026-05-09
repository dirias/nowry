import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Container, Typography, Stack, Button, Alert } from '@mui/joy'
import { subscriptionService } from '../../api/services'
import { useSubscription } from '../../hooks/useSubscription'
import PlanCard from './PlanCard'

// Price IDs are publishable values from env vars (safe to expose client-side per T-03-07-02).
// Backend validates price_id against a server-side VALID_PRICE_IDS whitelist (T-03-07-01).
const PRICE_IDS = {
  plus_monthly: process.env.REACT_APP_STRIPE_PLUS_MONTHLY_PRICE_ID,
  plus_annual: process.env.REACT_APP_STRIPE_PLUS_ANNUAL_PRICE_ID,
  pro_monthly: process.env.REACT_APP_STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_annual: process.env.REACT_APP_STRIPE_PRO_ANNUAL_PRICE_ID,
}

export default function PlansPage() {
  const { t } = useTranslation()
  const { tier: currentTier } = useSubscription()
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleUpgrade = async (priceId) => {
    setCheckoutLoading(true)
    setError(null)
    try {
      const { url } = await subscriptionService.createCheckoutSession(priceId)
      window.location.href = url
    } catch (err) {
      setError(t('plans.error.checkoutFailed'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const isMonthly = billingInterval === 'monthly'

  const FREE_FEATURES = [
    { label: t('plans.features.cardGeneration'), value: t('plans.features.cardGenerationFree') },
    { label: t('plans.features.bookExpansion'), value: t('plans.features.bookExpansionFree') },
    { label: t('plans.features.quizGeneration'), value: t('plans.features.quizGenerationFree') },
    { label: t('plans.features.aiUsage'), value: t('plans.features.aiUsageFree') },
    { label: t('plans.features.studyCards'), value: t('plans.features.studyCardsAll') },
    { label: t('plans.features.support'), value: t('plans.features.supportFree') },
  ]

  const PLUS_FEATURES = [
    { label: t('plans.features.cardGeneration'), value: t('plans.features.cardGenerationPlus') },
    { label: t('plans.features.bookExpansion'), value: t('plans.features.bookExpansionPlus') },
    { label: t('plans.features.quizGeneration'), value: t('plans.features.quizGenerationPlus') },
    { label: t('plans.features.aiUsage'), value: t('plans.features.aiUsagePlus') },
    { label: t('plans.features.studyCards'), value: t('plans.features.studyCardsAll') },
    { label: t('plans.features.support'), value: t('plans.features.supportPlus') },
  ]

  const PRO_FEATURES = [
    { label: t('plans.features.cardGeneration'), value: t('plans.features.cardGenerationPro') },
    { label: t('plans.features.bookExpansion'), value: t('plans.features.bookExpansionPro') },
    { label: t('plans.features.quizGeneration'), value: t('plans.features.quizGenerationPro') },
    { label: t('plans.features.aiUsage'), value: t('plans.features.aiUsagePro') },
    { label: t('plans.features.studyCards'), value: t('plans.features.studyCardsAll') },
    { label: t('plans.features.support'), value: t('plans.features.supportPro') },
  ]

  // CTA label per current tier + target tier
  const getPlusCta = () => {
    if (currentTier === 'plus') return t('plans.currentPlan')
    if (currentTier === 'free') return t('plans.cta.upgradeToPlus')
    return null // pro users: no downgrade CTA on this page
  }

  const getProCta = () => {
    if (currentTier === 'pro') return t('plans.currentPlan')
    if (currentTier === 'plus') return t('plans.cta.switchToPro')
    return t('plans.cta.upgradeToPro') // free users
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Page Header */}
      <Stack alignItems='center' spacing={1} sx={{ mb: 4 }}>
        <Typography level='h2' sx={{ color: 'text.primary' }}>
          {t('plans.title')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          {t('plans.subtitle')}
        </Typography>
      </Stack>

      {/* Billing Toggle — pill style per UI-SPEC.md § Component Inventory #3 */}
      <Stack direction='row' justifyContent='center' alignItems='center' spacing={1} sx={{ mb: 4 }}>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          {t('plans.billingToggle.label')}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            bgcolor: 'background.level1',
            p: 0.5,
            borderRadius: 'xl',
          }}
        >
          <Button
            variant={isMonthly ? 'solid' : 'plain'}
            color='primary'
            size='sm'
            onClick={() => setBillingInterval('monthly')}
            aria-label={t('plans.billingToggle.monthly')}
            aria-pressed={isMonthly}
          >
            {t('plans.billingToggle.monthly')}
          </Button>
          <Button
            variant={!isMonthly ? 'solid' : 'plain'}
            color='primary'
            size='sm'
            onClick={() => setBillingInterval('annual')}
            aria-label={t('plans.billingToggle.annual')}
            aria-pressed={!isMonthly}
          >
            {t('plans.billingToggle.annual')}
          </Button>
        </Box>
      </Stack>

      {/* Error state */}
      {error && (
        <Alert
          color='danger'
          variant='soft'
          sx={{ mb: 3 }}
          endDecorator={
            <Button
              size='sm'
              variant='plain'
              color='danger'
              onClick={() => setError(null)}
              aria-label={t('common.close')}
            >
              {t('common.close')}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Plans Grid — 3 columns desktop, 2 tablet, 1 mobile */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Free plan */}
        <PlanCard
          name={t('subscription.tier.free')}
          price='$0'
          period={t('plans.billingToggle.monthly')}
          features={FREE_FEATURES}
          isCurrent={currentTier === 'free'}
          ctaLabel={currentTier === 'free' ? t('plans.currentPlan') : null}
          onUpgrade={null}
          loading={checkoutLoading}
          showSavings={false}
        />

        {/* Plus plan */}
        <PlanCard
          name={t('subscription.tier.plus')}
          price={isMonthly ? '$8.99' : '$89.99'}
          period={isMonthly ? t('plans.billingToggle.monthly') : t('plans.billingToggle.annual')}
          features={PLUS_FEATURES}
          isCurrent={currentTier === 'plus'}
          ctaLabel={getPlusCta()}
          onUpgrade={
            currentTier === 'free'
              ? () => handleUpgrade(isMonthly ? PRICE_IDS.plus_monthly : PRICE_IDS.plus_annual)
              : null
          }
          loading={checkoutLoading}
          showSavings={!isMonthly}
        />

        {/* Pro plan */}
        <PlanCard
          name={t('subscription.tier.pro')}
          price={isMonthly ? '$19.99' : '$199.99'}
          period={isMonthly ? t('plans.billingToggle.monthly') : t('plans.billingToggle.annual')}
          features={PRO_FEATURES}
          isCurrent={currentTier === 'pro'}
          ctaLabel={getProCta()}
          onUpgrade={
            currentTier !== 'pro'
              ? () => handleUpgrade(isMonthly ? PRICE_IDS.pro_monthly : PRICE_IDS.pro_annual)
              : null
          }
          loading={checkoutLoading}
          showSavings={!isMonthly}
        />
      </Box>
    </Container>
  )
}
