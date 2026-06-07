import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Modal from '@mui/joy/Modal'
import ModalDialog from '@mui/joy/ModalDialog'
import DialogTitle from '@mui/joy/DialogTitle'
import DialogContent from '@mui/joy/DialogContent'
import DialogActions from '@mui/joy/DialogActions'
import FormControl from '@mui/joy/FormControl'
import FormLabel from '@mui/joy/FormLabel'
import Input from '@mui/joy/Input'
import Select from '@mui/joy/Select'
import Option from '@mui/joy/Option'
import Button from '@mui/joy/Button'
import Alert from '@mui/joy/Alert'
import { TEMPLATES, TEMPLATE_OPTIONS } from './templates'
import sheetsService from '../../api/services/sheets.service'

const CreateSheetModal = ({ open, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState('blank')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const template = TEMPLATES[templateId]
      const payload = {
        title: title.trim() || t('sheets.untitled'),
        data: template ? template.data : [],
        column_labels: template ? template.columnLabels : []
      }
      const sheet = await sheetsService.createSheet(payload)
      onClose()
      navigate(`/sheets/${sheet.id || sheet._id}`)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || t('sheets.create.error'))
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle('')
      setTemplateId('blank')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog sx={{ minWidth: { xs: 320, sm: 440 }, maxWidth: 560 }}>
        <DialogTitle>{t('sheets.create.title')}</DialogTitle>
        <DialogContent sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert color='danger' variant='soft' size='sm'>
              {error}
            </Alert>
          )}
          <FormControl required>
            <FormLabel>{t('sheets.create.nameLabel')}</FormLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('sheets.untitled')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              aria-label={t('sheets.create.nameLabel')}
            />
          </FormControl>
          <FormControl>
            <FormLabel>{t('sheets.create.templateLabel')}</FormLabel>
            <Select
              value={templateId}
              onChange={(_, val) => setTemplateId(val)}
              aria-label={t('sheets.create.templateLabel')}
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <Option key={opt.id} value={opt.id}>
                  {t(opt.label)}
                </Option>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button variant='plain' color='neutral' onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} loading={loading} disabled={loading}>
            {t('sheets.create.confirm')}
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  )
}

export default CreateSheetModal
