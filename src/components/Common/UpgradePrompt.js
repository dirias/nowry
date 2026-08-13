/**
 * UpgradePrompt — Phase 4 (D-07, D-12)
 *
 * Lightweight upgrade modal triggered by inline upgrade CTA.
 * Shows 2-3 tier comparison bullets and "View Plans & Upgrade" CTA.
 *
 * Props:
 *   open     — controls modal visibility (from SubscriptionContext.isUpgradeModalOpen)
 *   onClose  — close handler (SubscriptionContext.closeUpgradeModal)
 *
 * Pattern: DeleteConfirmationModal.js (Joy UI Modal + ModalDialog + semantic tokens)
 */
import React from 'react'
import { Modal, ModalDialog, ModalClose, Typography, Box, Button, Stack, List, ListItem } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'

const UpgradePrompt = ({ open, onClose, headline }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // MUST call onClose() BEFORE navigating (Pitfall 5 — prevents modal persisting after nav)
  const handleUpgrade = () => {
    onClose()
    navigate('/plans')
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        variant='outlined'
        role='alertdialog'
        sx={{
          width: { xs: '95%', sm: '85%', md: '75%', lg: '520px' },
          maxWidth: '520px',
          borderRadius: 'md',
          boxShadow: 'lg',
          border: '1px solid',
          borderColor: 'divider',
          p: 0,
          overflow: 'hidden'
        }}
      >
        <ModalClose />

        {/* ── Header ───────────────────────────────────────────────── */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.level1'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 'md',
                bgcolor: 'primary.softBg',
                color: 'primary.solidColor',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AutoAwesomeRoundedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography level='title-lg' sx={{ fontWeight: 700, mb: 0.5 }}>
                {headline || t('upgrade.modal.title')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('upgrade.modal.description')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Content ──────────────────────────────────────────────── */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            bgcolor: 'background.surface'
          }}
        >
          <List size='sm' sx={{ '--List-gap': '8px' }}>
            <ListItem>
              <Typography level='body-sm'>{t('upgrade.modal.feature1')}</Typography>
            </ListItem>
            <ListItem>
              <Typography level='body-sm'>{t('upgrade.modal.feature2')}</Typography>
            </ListItem>
            <ListItem>
              <Typography level='body-sm'>{t('upgrade.modal.feature3')}</Typography>
            </ListItem>
          </List>
        </Box>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface'
          }}
        >
          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
            <Button variant='outlined' color='neutral' onClick={onClose} fullWidth size='lg' aria-label={t('common.cancel')}>
              {t('common.cancel')}
            </Button>
            <Button variant='solid' color='primary' onClick={handleUpgrade} fullWidth size='lg' aria-label={t('upgrade.modal.cta')}>
              {t('upgrade.modal.cta')}
            </Button>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}

export default UpgradePrompt
