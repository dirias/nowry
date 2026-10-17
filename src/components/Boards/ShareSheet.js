import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Box, Button, Chip, FormControl, FormHelperText, FormLabel, Input, Stack, Typography } from '@mui/joy'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import { blackboardService } from '@nowry/core/api/services/blackboard.service'
import FormSheet from '../Common/Form/FormSheet'

/** The API's refusals, in the person's words. */
const errorKey = (err) => {
  const detail = err?.response?.data?.detail
  if (detail === 'user_not_found') return 'boards.share.error.notFound'
  if (detail === 'already_collaborator') return 'boards.share.error.alreadyInvited'
  if (err?.response?.status === 403) return 'boards.share.error.notOwner'
  return 'boards.share.error.failed'
}

/**
 * Share a board (BOARD-007): invite a collaborator by email. The Blackboard's
 * share modal, behaviour unchanged, re-homed on the shared sheet at `simple`
 * width. A collaborator's edits merge with the owner's by note (PRD D5), so
 * sharing needs nothing more than the invite.
 */
export default function ShareSheet({ open, onClose, boardId, onInvited }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [invited, setInvited] = useState([])
  const [sent, setSent] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const close = () => {
    setEmail('')
    setError(null)
    setSent(false)
    onClose()
  }

  const submit = async (event) => {
    event?.preventDefault?.()
    const address = email.trim()
    if (!address) {
      setError(t('boards.share.error.empty'))
      return
    }
    setSending(true)
    setError(null)
    try {
      await blackboardService.inviteCollaborator(boardId, address)
      setInvited((prev) => [...prev, address])
      setEmail('')
      setSent(true)
      onInvited?.()
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setSent(false), 3000)
    } catch (err) {
      setError(t(errorKey(err)))
    } finally {
      setSending(false)
    }
  }

  const footer = (
    <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent='space-between' gap={1}>
      <Button variant='plain' color='neutral' size='lg' onClick={close}>
        {t('common.cancel')}
      </Button>
      <Button size='lg' startDecorator={<SendRoundedIcon />} loading={sending} onClick={submit}>
        {t('boards.share.send')}
      </Button>
    </Stack>
  )

  return (
    <FormSheet open={open} onClose={close} titleKey='boards.share.title' subtitleKey='boards.share.subtitle' width='simple' footer={footer}>
      <form onSubmit={submit} noValidate>
        <FormControl error={Boolean(error)}>
          <FormLabel>{t('boards.share.inviteLabel')}</FormLabel>
          <Input
            size='lg'
            type='email'
            autoFocus
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError(null)
            }}
            placeholder={t('boards.share.placeholder')}
          />
          <FormHelperText sx={{ color: 'text.tertiary' }}>{t('boards.share.inviteHelp')}</FormHelperText>
        </FormControl>
        {error && (
          <Alert color='danger' variant='soft' size='sm' role='alert' sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
        {sent && (
          <Alert color='success' variant='soft' size='sm' role='status' sx={{ mt: 1.5 }}>
            {t('boards.share.sent')}
          </Alert>
        )}
        {invited.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 1 }}>
              {t('boards.share.invitedNow')}
            </Typography>
            <Stack direction='row' gap={0.5} flexWrap='wrap'>
              {invited.map((address) => (
                <Chip key={address} size='sm' variant='soft' color='neutral'>
                  {address}
                </Chip>
              ))}
            </Stack>
          </Box>
        ) : (
          !sent && (
            <Typography level='body-sm' sx={{ mt: 2, color: 'text.tertiary' }}>
              {t('boards.share.empty')}
            </Typography>
          )
        )}
      </form>
    </FormSheet>
  )
}
