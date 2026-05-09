import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Typography, Stack } from '@mui/joy'
import WarningIcon from '@mui/icons-material/Warning'
import { useSubscription } from '../../hooks/useSubscription'
import { subscriptionService } from '../../api/services'

export default function PaymentFailureBanner() {
  const { t } = useTranslation()
  const { isPastDue, statusUpdatedAt } = useSubscription()
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isPastDue || dismissed) return null

  // Deadline = subscription_status_updated_at + 7 days
  const deadline = statusUpdatedAt
    ? new Date(new Date(statusUpdatedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    : null

  const handleUpdatePayment = async () => {
    setLoading(true)
    try {
      const { url } = await subscriptionService.createPortalSession()
      window.location.href = url
    } catch {
      // If portal fails, banner remains — user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <Alert
      color='danger'
      variant='soft'
      startDecorator={<WarningIcon />}
      sx={{
        borderRadius: 0,
        borderBottom: '1px solid',
        borderColor: 'danger.outlinedBorder'
      }}
      endDecorator={
        <Button
          size='sm'
          variant='plain'
          color='danger'
          onClick={() => setDismissed(true)}
          aria-label={t('common.close')}
        >
          ✕
        </Button>
      }
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1}>
        <Typography level='body-sm' sx={{ color: 'danger.plainColor', flex: 1 }}>
          {t('billing.paymentFailed.message', { date: deadline })}
        </Typography>
        <Button
          size='sm'
          variant='outlined'
          color='danger'
          loading={loading}
          onClick={handleUpdatePayment}
          aria-label={t('billing.paymentFailed.cta')}
        >
          {t('billing.paymentFailed.cta')}
        </Button>
      </Stack>
    </Alert>
  )
}
