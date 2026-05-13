import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Box, Container, Typography, Stack, Button, Alert, Skeleton, Chip, Divider, Modal, ModalDialog } from '@mui/joy'
import { subscriptionService } from '../../api/services'
import { useSubscription } from '../../hooks/useSubscription'
import { useAuth } from '../../context/AuthContext'

export default function SubscriptionPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { tier: contextTier, nextBillingDate } = useSubscription()
  const [searchParams] = useSearchParams()
  const upgraded = searchParams.get('upgraded') === 'true'
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState(null)
  const [showCelebration, setShowCelebration] = useState(upgraded)
  // freshTier: re-fetched from API after upgrade redirect to beat webhook race condition
  const [freshTier, setFreshTier] = useState(null)
  const [fetchingTier, setFetchingTier] = useState(upgraded)
  // upgradeProcessing: true when polling exhausted without a tier change (webhook delay)
  const [upgradeProcessing, setUpgradeProcessing] = useState(false)

  const tier = freshTier ?? contextTier

  useEffect(() => {
    if (!upgraded) return
    let cancelled = false
    const run = async () => {
      const maxAttempts = 5
      const delayMs = 2000
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return
        try {
          const sub = await subscriptionService.getSubscriptionStatus()
          if (cancelled) return
          if (sub && sub.tier && sub.tier !== 'free') {
            setFreshTier(sub.tier)
            setFetchingTier(false)
            return
          }
        } catch {
          /* ignore */
        }
        if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs))
      }
      if (!cancelled) {
        setFetchingTier(false)
        setUpgradeProcessing(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [upgraded])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const { url } = await subscriptionService.createPortalSession()
      window.location.href = url
    } catch {
      setPortalError(t('subscription.error.portalFailed'))
    } finally {
      setPortalLoading(false)
    }
  }

  const tierColor = { free: 'neutral', plus: 'primary', pro: 'success' }[tier] || 'neutral'
  const isLoading = !user

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      {/* Post-upgrade celebration modal — triggered by ?upgraded=true */}
      <Modal open={showCelebration} onClose={() => !fetchingTier && setShowCelebration(false)}>
        <ModalDialog
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.surface',
            maxWidth: 440,
            width: '90%'
          }}
        >
          {fetchingTier ? (
            <Stack spacing={1} alignItems='center'>
              <Skeleton variant='text' width={200} />
              <Skeleton variant='text' width={280} />
            </Stack>
          ) : upgradeProcessing ? (
            <Stack spacing={2} alignItems='center'>
              <Typography level='h3' sx={{ color: 'text.primary' }}>
                {t('subscription.upgradeProcessing.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                {t('subscription.upgradeProcessing.message')}
              </Typography>
              <Button onClick={() => setShowCelebration(false)} variant='outlined' color='neutral' aria-label={t('common.close')}>
                {t('common.close')}
              </Button>
            </Stack>
          ) : (
            <>
              <Typography level='h2' sx={{ color: 'text.primary', mb: 1 }}>
                {t('subscription.page.upgraded.title', { plan: t(`subscription.tier.${tier}`) })}
              </Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary', mb: 3 }}>
                {t('subscription.page.upgraded.message')}
              </Typography>
              <Button onClick={() => setShowCelebration(false)} variant='solid' color='primary' aria-label={t('upgrade.welcome.cta')}>
                {t('upgrade.welcome.cta')}
              </Button>
            </>
          )}
        </ModalDialog>
      </Modal>

      <Typography level='h2' sx={{ color: 'text.primary', mb: 4 }}>
        {t('subscription.title')}
      </Typography>

      <Stack spacing={4}>
        {/* ── Current Plan card ─────────────────────────────────────────────── */}
        <Box
          sx={{
            p: 3,
            borderRadius: 'lg',
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
            <Typography level='title-md' sx={{ color: 'text.primary' }}>
              {t('subscription.currentPlan')}
            </Typography>
            <Skeleton loading={isLoading} variant='text'>
              <Chip variant='soft' color={tierColor} size='md'>
                {t(`subscription.tier.${tier}`)}
              </Chip>
            </Skeleton>
          </Stack>

          {tier !== 'free' && (
            <Skeleton loading={isLoading} variant='text'>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('subscription.nextBillingDate')}:{' '}
                {nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : t('subscription.noBillingDate')}
              </Typography>
            </Skeleton>
          )}
        </Box>

        <Divider />

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        {portalError && (
          <Alert
            color='danger'
            variant='soft'
            endDecorator={
              <Button size='sm' variant='plain' color='danger' onClick={() => setPortalError(null)} aria-label={t('common.close')}>
                {t('common.close')}
              </Button>
            }
          >
            {portalError}
          </Alert>
        )}

        {tier !== 'free' && (
          <Button
            variant='outlined'
            color='neutral'
            loading={portalLoading}
            onClick={handleManageBilling}
            aria-label={t('subscription.manageBilling')}
          >
            {t('subscription.manageBilling')}
          </Button>
        )}
      </Stack>
    </Container>
  )
}
