import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Modal, ModalDialog, ModalClose, Typography, Button, Box, Select, Option, Stack, Alert } from '@mui/joy'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { visualizerService, cardsService } from '../../api/services'
import { useSaveToDeck } from '../../hooks/useSaveToDeck'
import SaveToDeckStep from './SaveToDeck/SaveToDeckStep'
import useGenerationProgress from '../../hooks/useGenerationProgress'
import GenerationProgress from '../Common/GenerationProgress'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
})

const VIZ_TYPES = ['mindmap', 'flowchart', 'sequence', 'timeline']

const MermaidChart = ({ code }) => {
  const { t } = useTranslation()
  const ref = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (code && ref.current) {
      setSvg('')
      setError(null)
      const id = `mermaid-${Date.now()}`

      mermaid
        .render(id, code)
        .then((result) => {
          setSvg(result.svg)
          setError(null)
        })
        .catch((e) => {
          console.error('Mermaid render error:', e)
          setError(true)
        })
    }
  }, [code])

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'danger.plainColor', bgcolor: 'danger.softBg', borderRadius: 'md' }}>
        <Typography level='title-md' sx={{ mb: 1 }}>
          {t('aiVisualizer.diagramErrorTitle')}
        </Typography>
        <Typography level='body-sm'>{t('aiVisualizer.diagramErrorBody')}</Typography>
      </Box>
    )
  }

  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg) }}
      style={{ width: '100%', overflow: 'auto', textAlign: 'center' }}
    />
  )
}

// Per-surface narration (PRD A5). Generic copy would be worse than the spinner it
// replaces: being specific about the work is the whole value of the line.
const VISUALIZER_STAGES = [
  { after: 0, icon: '📖', msgKey: 'aiVisualizer.stages.s0' },
  { after: 6, icon: '🔍', msgKey: 'aiVisualizer.stages.s1' },
  { after: 14, icon: '✍️', msgKey: 'aiVisualizer.stages.s2' }
]

const VISUALIZER_ESTIMATED_MS = 20000

export default function VisualizerModal({ open, onClose, text }) {
  const [vizType, setVizType] = useState('mindmap')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { mermaid_code, explanation }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isLimitError, setIsLimitError] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const saveToDeck = useSaveToDeck('visual')

  const progress = useGenerationProgress({
    active: loading,
    failed: Boolean(error),
    estimatedMs: VISUALIZER_ESTIMATED_MS,
    stages: VISUALIZER_STAGES
  })

  const handleGenerate = async () => {
    if (!text) return
    setLoading(true)
    setError('')
    try {
      const res = await visualizerService.generate(text, vizType)
      setResult(res)
    } catch (e) {
      console.error(e)
      const status = e.response?.status
      const msg = e.response?.data?.detail || t('subscription.errors.genericCreate')
      if (status === 403) {
        setIsLimitError(true)
        setError(t('subscription.errors.aiLimit'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Reset transient state whenever the modal opens
  useEffect(() => {
    if (open) {
      setError('')
      setIsLimitError(false)
      setResult(null)
    }
  }, [open])

  const handleSave = async () => {
    const { selectedDeckId, allTags } = saveToDeck
    if (!selectedDeckId || !result) return
    setSaving(true)
    setError('')
    try {
      await cardsService.create({
        deck_id: selectedDeckId,
        title: `${t('aiVisualizer.titlePrefix')}: ${t(`aiVisualizer.vizType.${vizType}`)}`,
        content: result.explanation,
        card_type: 'visual',
        diagram_code: result.mermaid_code,
        diagram_type: vizType,
        tags: allTags
      })
      saveToDeck.reload()
      onClose()
    } catch (e) {
      console.error(e)
      const status = e.response?.status
      const msg = e.response?.data?.detail || t('subscription.errors.genericCreate')

      if (status === 403) {
        setIsLimitError(true)
        setError(t('subscription.errors.limitReached'))
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        size='lg'
        layout='center'
        sx={{
          borderRadius: 'xl',
          boxShadow: 'lg',
          width: { xs: '95%', sm: '85%', md: '75%', lg: '900px' },
          maxHeight: '90vh',
          p: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ModalClose aria-label={t('aiVisualizer.closeAria')} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} />

        {/* Elevated header */}
        <Box sx={{ p: 3, pb: 2, bgcolor: 'background.level1', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ pr: 6 }}>
            <Typography level='h4' sx={{ fontWeight: 'bold' }}>
              {t('aiVisualizer.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('aiVisualizer.subtitle')}
            </Typography>
          </Box>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
          {error && (
            <Alert
              color='danger'
              variant='soft'
              sx={{ mb: 2 }}
              endDecorator={
                isLimitError && (
                  <Button size='sm' variant='soft' color='danger' onClick={() => navigate('/profile')}>
                    {t('subscription.upgrade')}
                  </Button>
                )
              }
            >
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Select
              value={vizType}
              onChange={(_, v) => setVizType(v)}
              sx={{ minWidth: 180 }}
              aria-label={t('aiVisualizer.vizTypeAria')}
              slotProps={{ button: { 'aria-label': t('aiVisualizer.vizTypeAria') } }}
            >
              {VIZ_TYPES.map((type) => (
                <Option key={type} value={type}>
                  {t(`aiVisualizer.vizType.${type}`)}
                </Option>
              ))}
            </Select>
            <Button onClick={handleGenerate} loading={loading} color='primary' disabled={!text} aria-label={t('aiVisualizer.generateAria')}>
              {t('aiVisualizer.generateButton')}
            </Button>
          </Stack>

          {progress.visible && (
            <Box sx={{ py: 8, px: { xs: 0, sm: 4 } }}>
              <GenerationProgress progress={progress} label={t('aiVisualizer.generating')} />
            </Box>
          )}

          {!loading && !result && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography level='title-md' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('aiVisualizer.emptyTitle')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('aiVisualizer.emptyBody')}
              </Typography>
            </Box>
          )}

          {result && !loading && (
            <Stack spacing={3} sx={{ animation: 'fadeIn 0.3s ease-in' }}>
              <Box
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'neutral.outlinedBorder',
                  borderRadius: 'lg',
                  bgcolor: 'background.body',
                  minHeight: 300,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: 'sm'
                }}
              >
                <MermaidChart code={result.mermaid_code} />
              </Box>

              <Box sx={{ bgcolor: 'primary.softBg', p: 2, borderRadius: 'md', borderLeft: '4px solid', borderColor: 'primary.solidBg' }}>
                <Typography level='title-sm' sx={{ color: 'primary.plainColor' }}>
                  {t('aiVisualizer.explanationLabel')}
                </Typography>
                <Typography level='body-sm' sx={{ mt: 0.5 }}>
                  {result.explanation}
                </Typography>
              </Box>

              <SaveToDeckStep deckType='visual' saveToDeck={saveToDeck} />
            </Stack>
          )}
        </Box>

        {/* Sticky footer */}
        <Box sx={{ p: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.surface' }}>
          <Stack direction='row' justifyContent='flex-end' spacing={1}>
            <Button variant='soft' color='neutral' onClick={onClose}>
              {t('aiVisualizer.cancelButton')}
            </Button>
            {result && (
              <Button
                variant='solid'
                color='success'
                onClick={handleSave}
                disabled={!saveToDeck.selectedDeckId}
                loading={saving}
                aria-label={t('aiVisualizer.saveAria')}
              >
                {t('aiVisualizer.saveButton')}
              </Button>
            )}
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
