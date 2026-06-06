import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalDialog,
  ModalClose,
  Stack,
  Typography
} from '@mui/joy'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import { blackboardService } from '../../api/services/blackboard.service'

export default function ShareBoardModal({ open, onClose, boardId }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [collaborators, setCollaborators] = useState([])
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await blackboardService.inviteCollaborator(boardId, email.trim())
      setCollaborators((prev) => [...prev, email.trim()])
      setEmail('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail === 'user_not_found') {
        setError(t('blackboard.share.error.notFound'))
      } else if (detail === 'already_collaborator') {
        setError(t('blackboard.share.error.alreadyInvited'))
      } else if (err.response?.status === 403) {
        setError(t('blackboard.share.error.notOwner'))
      } else {
        setError(t('common.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog sx={{ width: { xs: '95%', sm: 480 }, p: 0 }}>
        {/* Header */}
        <Box sx={{ bgcolor: 'background.level1', px: 3, py: 2, borderRadius: 'lg lg 0 0' }}>
          <ModalClose />
          <Typography level='title-lg' sx={{ fontWeight: 600 }}>
            {t('blackboard.share.title')}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ px: 3, py: 2 }}>
          <form onSubmit={handleSubmit}>
            <FormControl>
              <FormLabel>{t('blackboard.share.inviteLabel')}</FormLabel>
              <Input
                size='lg'
                type='email'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder='collaborator@example.com'
                aria-label={t('blackboard.share.inviteLabel')}
              />
              <FormHelperText sx={{ color: 'text.tertiary' }}>{t('blackboard.share.inviteSubtitle')}</FormHelperText>
            </FormControl>

            {error && (
              <Alert color='danger' variant='soft' size='sm' sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert color='success' variant='soft' size='sm' sx={{ mt: 1 }}>
                {t('blackboard.shareModal.sent')}
              </Alert>
            )}

            {collaborators.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 1 }}>
                  {t('blackboard.share.sharedWith')}
                </Typography>
                <Stack direction='row' gap={0.5} flexWrap='wrap'>
                  {collaborators.map((c, i) => (
                    <Chip key={i} size='sm' variant='soft' sx={{ bgcolor: 'background.level1' }}>
                      {c}
                    </Chip>
                  ))}
                </Stack>
              </Box>
            )}

            {collaborators.length === 0 && !success && (
              <Typography level='body-sm' sx={{ mt: 2, color: 'text.tertiary' }}>
                {t('blackboard.share.empty.body')}
              </Typography>
            )}
          </form>
        </Box>

        {/* Footer */}
        <Divider />
        <Stack direction='row' justifyContent='flex-end' gap={1} sx={{ px: 3, py: 2 }}>
          <Button variant='plain' color='neutral' onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant='solid'
            startDecorator={<SendRoundedIcon />}
            loading={loading}
            onClick={handleSubmit}
            disabled={!email.trim()}
            aria-label={t('blackboard.share.sendInvite')}
          >
            {t('blackboard.share.sendInvite')}
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}
