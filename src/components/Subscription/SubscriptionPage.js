import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Alert,
  Skeleton,
  Chip,
  Divider,
  LinearProgress,
  Modal,
  ModalDialog
} from '@mui/joy'
import { subscriptionService } from '../../api/services'
import { useSubscription } from '../../hooks/useSubscription'
import { useAuth } from '../../context/AuthContext'

// AI usage limits by tier (mirrors backend AI_USAGE_LIMITS)
const AI_LIMITS = { free: 0, plus: 100, pro: null } // null = unlimited

export default function SubscriptionPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { tier, aiUsageCount, aiUsageResetDate, nextBillingDate } = useSubscription()
  const [searchParams] = useSearchParams()
  const upgraded = searchParams.get('upgraded') === 'true'
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState(null)
  const [showCelebration, setShowCelebration] = useState(upgraded)

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

  const usageLimit = AI_LIMITS[tier] ?? 0
  const usagePercent = usageLimit > 0 ? Math.min((aiUsageCount / usageLimit) * 100, 100) : 0
  const tierColor = { free: 'neutral', plus: 'primary', pro: 'success' }[tier] || 'neutral'
  const isLoading = !user

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      {/* Post-upgrade celebration modal — triggered by ?upgraded=true */}
      <Modal open={showCelebration} onClose={() => setShowCelebration(false)}>
        <ModalDialog
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.surface',
            maxWidth: 440,
            width: '90%'
          }}
        >
          <Typography level='h2' sx={{ color: 'text.primary', mb: 1 }}>
            {t('subscription.page.upgraded.title', { plan: t(`subscription.tier.${tier}`) })}
          </Typography>
          <Typography level='body-md' sx={{ color: 'text.secondary', mb: 3 }}>
            {t('subscription.page.upgraded.message')}
          </Typography>
          <Button
            onClick={() => setShowCelebration(false)}
            variant='solid'
            color='primary'
            aria-label={t('upgrade.welcome.cta')}
          >
            {t('upgrade.welcome.cta')}
          </Button>
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
                {nextBillingDate
                  ? new Date(nextBillingDate).toLocaleDateString()
                  : t('subscription.noBillingDate')}
              </Typography>
            </Skeleton>
          )}
        </Box>

        <Divider />

        {/* ── AI Usage Meter ────────────────────────────────────────────────── */}
        <Box
          sx={{
            p: 3,
            borderRadius: 'lg',
            bgcolor: 'background.surface',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography level='title-md' sx={{ color: 'text.primary', mb: 2 }}>
            {t('subscription.aiUsage.title')}
          </Typography>

          <Skeleton loading={isLoading} variant='rectangular' height={48}>
            <Box>
              {AI_LIMITS[tier] === null ? (
                /* Pro tier — unlimited */
                <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                  {t('plans.features.aiUsagePro')}
                </Typography>
              ) : usageLimit === 0 ? (
                /* Free tier — no AI access */
                <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                  {t('subscription.aiUsage.empty')}
                </Typography>
              ) : (
                /* Plus tier — metered usage */
                <>
                  <LinearProgress
                    determinate
                    value={usagePercent}
                    color='primary'
                    sx={{ mb: 1 }}
                    aria-label={t('subscription.aiUsage.title')}
                  />
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {t('subscription.aiUsage.meter', { used: aiUsageCount, limit: usageLimit })}
                  </Typography>
                  {aiUsageResetDate && (
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                      {t('subscription.aiUsage.reset', {
                        date: new Date(aiUsageResetDate).toLocaleDateString()
                      })}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Skeleton>
        </Box>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        {portalError && (
          <Alert
            color='danger'
            variant='soft'
            endDecorator={
              <Button
                size='sm'
                variant='plain'
                color='danger'
                onClick={() => setPortalError(null)}
                aria-label={t('common.close')}
              >
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
