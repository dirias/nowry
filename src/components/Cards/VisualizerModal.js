import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Button,
  Box,
  Select,
  Option,
  Stack,
  CircularProgress,
  FormControl,
  FormLabel,
  Input,
  Alert
} from '@mui/joy'
import mermaid from 'mermaid'
import { visualizerService, decksService, cardsService } from '../../api/services'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
})

// ... MermaidChart component is unchanged ...
const MermaidChart = ({ code }) => {
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
          setError('Unable to render diagram. The generated syntax may be invalid. Please try generating again.')
        })
    }
  }, [code])

  if (error) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          color: 'danger.plainColor',
          bgcolor: 'danger.softBg',
          borderRadius: 'md'
        }}
      >
        <Typography level='title-md' sx={{ mb: 1 }}>
          ⚠️ Diagram Error
        </Typography>
        <Typography level='body-sm'>{error}</Typography>
      </Box>
    )
  }

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', overflow: 'auto', textAlign: 'center' }} />
}

export default function VisualizerModal({ open, onClose, text }) {
  const [vizType, setVizType] = useState('mindmap')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { mermaid_code, explanation }
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [loadingDecks, setLoadingDecks] = useState(false)
  const [error, setError] = useState('')
  const [isLimitError, setIsLimitError] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleCreateDeck = async () => {
    if (!newDeckName) return
    setLoadingDecks(true)
    setError('')
    try {
      const newDeck = await decksService.create({ name: newDeckName, deck_type: 'visual' })
      setDecks([...decks, newDeck])
      setSelectedDeckId(newDeck._id)
      setIsCreatingDeck(false)
      setNewDeckName('')
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
      setLoadingDecks(false)
    }
  }

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

  // Fetch decks and reset state
  useEffect(() => {
    if (open) {
      setError('')
      setIsLimitError(false)
      setResult(null)
      setSelectedDeckId('')
      decksService.getAll().then(setDecks).catch(console.error)
    }
  }, [open])

  const handleSave = async () => {
    if (!selectedDeckId || !result) return
    setSaving(true)
    setError('')
    try {
      await cardsService.create({
        deck_id: selectedDeckId,
        title: `Visual: ${vizType.charAt(0).toUpperCase() + vizType.slice(1)}`,
        content: result.explanation,
        card_type: 'visual',
        diagram_code: result.mermaid_code,
        diagram_type: vizType
      })
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
      <ModalDialog layout='center' size='lg' sx={{ width: '90%', maxWidth: 1000, maxHeight: '90vh', overflow: 'auto', p: 3 }}>
        <ModalClose />
        <Typography level='h4' fontWeight='bold'>
          AI Visualizer
        </Typography>
        <Typography level='body-sm' color='neutral' sx={{ mb: 2 }}>
          Generate diagrams from your study content.
        </Typography>

        {error && (
          <Alert
            color='danger'
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

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems='center'>
          <Select value={vizType} onChange={(_, v) => setVizType(v)} sx={{ minWidth: 160 }}>
            <Option value='mindmap'>🧠 Mind Map</Option>
            <Option value='flowchart'>🔀 Flowchart</Option>
            <Option value='sequence'>⏱️ Sequence Diagram</Option>
            <Option value='timeline'>📅 Timeline</Option>
          </Select>
          <Button onClick={handleGenerate} loading={loading} color='primary' startDecorator='✨'>
            Generate
          </Button>

          {result && !loading && (
            <>
              <Box sx={{ flexGrow: 1 }} />
              {!isCreatingDeck ? (
                <Stack direction='row' spacing={1} alignItems='center'>
                  <Select
                    placeholder='Select Deck...'
                    value={selectedDeckId}
                    onChange={(_, v) => setSelectedDeckId(v)}
                    sx={{ minWidth: 200 }}
                  >
                    {decks
                      .filter((d) => d.deck_type === 'visual')
                      .map((deck) => (
                        <Option key={deck._id} value={deck._id}>
                          {deck.name}
                        </Option>
                      ))}
                  </Select>
                  <Button variant='plain' size='sm' onClick={() => setIsCreatingDeck(true)}>
                    +
                  </Button>
                  <Button color='success' onClick={handleSave} disabled={!selectedDeckId} loading={saving} startDecorator='💾'>
                    Save
                  </Button>
                </Stack>
              ) : (
                <Stack direction='row' spacing={1} alignItems='center'>
                  <Input
                    placeholder='New Deck Name'
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    sx={{ width: 180 }}
                  />
                  <Button size='sm' onClick={handleCreateDeck} loading={loadingDecks}>
                    Create
                  </Button>
                  <Button size='sm' variant='plain' color='neutral' onClick={() => setIsCreatingDeck(false)}>
                    X
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size='lg' />
          </Box>
        )}

        {result && !loading && (
          <Stack spacing={2} sx={{ animation: 'fadeIn 0.3s ease-in' }}>
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

            <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 'md', borderLeft: '4px solid', borderColor: 'primary.500' }}>
              <Typography level='title-sm' color='primary'>
                Explanation
              </Typography>
              <Typography level='body-sm' sx={{ mt: 0.5 }}>
                {result.explanation}
              </Typography>
            </Box>
          </Stack>
        )}
      </ModalDialog>
    </Modal>
  )
}
