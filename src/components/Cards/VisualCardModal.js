import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Stack,
  Select,
  Option,
  Chip,
  Box,
  Alert
} from '@mui/joy'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { cardsService } from '../../api/services'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
})

export default function VisualCardModal({ open, onClose, onSaved, decks = [], initialData = null }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [diagramCode, setDiagramCode] = useState('')
  const [content, setContent] = useState('')
  const [deckId, setDeckId] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewSvg, setPreviewSvg] = useState('')
  const [error, setError] = useState('')
  const mermaidRef = useRef(null)

  const isEdit = !!initialData

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setDiagramCode(initialData.diagram_code || '')
      setContent(initialData.content || '')

      // Extract deck ID - handle both object and string formats
      let extractedDeckId = ''
      if (initialData.deck_id) {
        if (typeof initialData.deck_id === 'object') {
          extractedDeckId = initialData.deck_id._id || initialData.deck_id.id || ''
        } else {
          extractedDeckId = initialData.deck_id
        }
      }
      setDeckId(extractedDeckId)

      setTags(initialData.tags ? (Array.isArray(initialData.tags) ? initialData.tags.join(', ') : initialData.tags) : '')
    } else {
      setTitle('')
      setDiagramCode('')
      setContent('')
      setDeckId('')
      setTags('')
    }
  }, [initialData, open])

  // Preview diagram when code changes
  useEffect(() => {
    if (diagramCode.trim()) {
      const renderDiagram = async () => {
        try {
          const id = `mermaid-preview-${Date.now()}`
          const result = await mermaid.render(id, diagramCode)
          setPreviewSvg(result.svg)
          setError('')
        } catch (err) {
          console.error('Mermaid render error:', err)
          setError('Invalid diagram syntax. Please check your Mermaid code.')
          setPreviewSvg('')
        }
      }
      renderDiagram()
    } else {
      setPreviewSvg('')
      setError('')
    }
  }, [diagramCode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const tagsArray = tags
      ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : []

    try {
      const cardPayload = {
        title,
        diagram_code: diagramCode,
        content,
        deck_id: deckId || undefined,
        tags: tagsArray,
        card_type: 'visual'
      }

      let savedCard
      if (isEdit) {
        savedCard = await cardsService.update(initialData._id || initialData.id, cardPayload)
      } else {
        savedCard = await cardsService.create(cardPayload)
      }

      onSaved(savedCard)
      onClose()
    } catch (error) {
      console.error('Error saving visual card:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <ModalClose />
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
          <Typography level='h4'>{isEdit ? t('cards.visual.editTitle') : t('cards.visual.createTitle')}</Typography>
          <Chip size='sm' color='info' variant='soft'>
            {t('cards.visual.chipLabel')}
          </Chip>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <FormControl required>
              <FormLabel>{t('cards.visual.diagramTitleLabel')}</FormLabel>
              <Input autoFocus placeholder='Machine Learning Workflow' value={title} onChange={(e) => setTitle(e.target.value)} size='lg' />
            </FormControl>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {/* Mermaid Code Editor */}
              <FormControl required sx={{ flex: 1 }}>
                <FormLabel>Mermaid Diagram Code</FormLabel>
                <Textarea
                  placeholder={`graph TD\n    A[Start] --> B[Process]\n    B --> C[End]`}
                  minRows={10}
                  value={diagramCode}
                  onChange={(e) => setDiagramCode(e.target.value)}
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
                  Use{' '}
                  <a href='https://mermaid.js.org/' target='_blank' rel='noopener noreferrer'>
                    Mermaid syntax
                  </a>{' '}
                  to create diagrams
                </Typography>
              </FormControl>

              {/* Preview */}
              <Box sx={{ flex: 1 }}>
                <Typography level='body-sm' fontWeight={600} sx={{ mb: 1 }}>
                  Preview
                </Typography>
                <Box
                  sx={{
                    minHeight: 300,
                    p: 2,
                    border: '1px solid',
                    borderColor: error ? 'danger.outlinedBorder' : 'neutral.outlinedBorder',
                    borderRadius: 'sm',
                    bgcolor: 'background.level1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto'
                  }}
                >
                  {error ? (
                    <Alert color='danger' variant='soft'>
                      {error}
                    </Alert>
                  ) : previewSvg ? (
                    <div ref={mermaidRef} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewSvg) }} />
                  ) : (
                    <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                      Enter Mermaid code to see preview
                    </Typography>
                  )}
                </Box>
              </Box>
            </Stack>

            <FormControl>
              <FormLabel>Description (optional)</FormLabel>
              <Textarea
                placeholder={t('cards.visual.explanationPlaceholder')}
                minRows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Tags (comma-separated)</FormLabel>
              <Input placeholder='machine-learning, workflow, ai' value={tags} onChange={(e) => setTags(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Assign to Deck</FormLabel>
              <Select placeholder={t('cards.visual.deckPlaceholder')} value={deckId} onChange={(_, newValue) => setDeckId(newValue)}>
                {decks.map((deck) => {
                  const deckValue = deck._id || deck.id
                  return (
                    <Option key={deckValue} value={deckValue}>
                      {deck.name}
                    </Option>
                  )
                })}
              </Select>
            </FormControl>

            <Button type='submit' loading={loading} fullWidth size='lg' disabled={!!error || !diagramCode.trim()} sx={{ mt: 1 }}>
              {isEdit ? t('cards.visual.saveChanges') : t('cards.visual.createTitle')}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  )
}
