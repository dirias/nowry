import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalDialog,
  ModalClose,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Input,
  Textarea,
  Chip,
  Divider,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Skeleton
} from '@mui/joy'
import { FileUpload, ArrowBack, CheckCircleOutline, WarningAmberRounded, Style as StyleIcon } from '@mui/icons-material'
import { importService } from '../../api/services/import.service'

const STEP = { UPLOAD: 0, PREVIEW: 1, IMPORTING: 2 }

export default function ImportDeckModal({ open, onClose, onImported }) {
  const { t } = useTranslation()

  const [step, setStep] = useState(STEP.UPLOAD)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)

  // Preview state (Step 2)
  const [preview, setPreview] = useState(null) // ParsedDeckPreview
  const [deckName, setDeckName] = useState('')
  const [description, setDescription] = useState('')
  const [showAllCards, setShowAllCards] = useState(false)
  const [importError, setImportError] = useState(null)

  const fileInputRef = useRef(null)

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleClose = () => {
    setStep(STEP.UPLOAD)
    setSelectedFile(null)
    setParsing(false)
    setParseError(null)
    setPreview(null)
    setDeckName('')
    setDescription('')
    setShowAllCards(false)
    setImportError(null)
    onClose()
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) acceptFile(file)
  }, [])

  const acceptFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.apkg')) {
      setParseError('Only .apkg files are supported.')
      return
    }
    setParseError(null)
    setSelectedFile(file)
  }

  // ── Step 1: Parse ─────────────────────────────────────────────────────────

  const handleParse = async () => {
    if (!selectedFile) return
    setParsing(true)
    setParseError(null)
    try {
      const data = await importService.parseApkg(selectedFile)
      setPreview(data)
      setDeckName(data.suggested_name || 'Imported Deck')
      setDescription('')
      setStep(STEP.PREVIEW)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not parse the file. Make sure it is a valid Anki .apkg.'
      setParseError(msg)
    } finally {
      setParsing(false)
    }
  }

  // ── Step 2: Confirm ───────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!preview || !deckName.trim()) return
    setStep(STEP.IMPORTING)
    setImportError(null)
    try {
      await importService.confirmImport({
        deck_name: deckName.trim(),
        description: description.trim() || undefined,
        cards: preview.all_cards
      })
      onImported()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Import failed. Please try again.'
      setImportError(msg)
      setStep(STEP.PREVIEW)
    }
  }

  // ── Renders ───────────────────────────────────────────────────────────────

  const quotaWarning = preview && preview.cards_allowed !== -1 && preview.card_count > preview.cards_allowed

  const displayedCards = showAllCards ? (preview?.all_cards ?? []) : (preview?.preview_cards ?? [])

  // ── Step 1: Upload ────────────────────────────────────────────────────────

  const renderUpload = () => (
    <>
      <DialogContent sx={{ pb: 0 }}>
        <Stack spacing={2.5}>
          {/* Drag zone */}
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role='button'
            aria-label='Upload Anki deck file'
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              py: 5,
              px: 3,
              borderRadius: 'lg',
              border: '2px dashed',
              borderColor: dragging ? 'primary.outlinedBorder' : 'neutral.outlinedBorder',
              bgcolor: dragging ? 'primary.softBg' : 'background.level1',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.outlinedBorder',
                bgcolor: 'primary.softBg'
              }
            }}
          >
            <FileUpload
              sx={{
                fontSize: 40,
                color: dragging ? 'primary.plainColor' : 'text.tertiary',
                transition: 'color 0.2s'
              }}
            />
            <Stack alignItems='center' spacing={0.5}>
              <Typography level='title-sm' sx={{ color: 'text.primary' }}>
                Drop your .apkg file here
              </Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                or click to browse — max 50 MB
              </Typography>
            </Stack>
            <input
              ref={fileInputRef}
              type='file'
              accept='.apkg'
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) acceptFile(f)
                e.target.value = '' // allow re-selecting same file
              }}
            />
          </Box>

          {/* Selected file pill */}
          {selectedFile && (
            <Stack direction='row' alignItems='center' spacing={1}>
              <StyleIcon sx={{ fontSize: 16, color: 'primary.plainColor' }} />
              <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 600, flex: 1 }}>
                {selectedFile.name}
              </Typography>
              <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </Typography>
              <IconButton
                size='sm'
                variant='plain'
                color='neutral'
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  setParseError(null)
                }}
                sx={{ borderRadius: 'xl' }}
              >
                ×
              </IconButton>
            </Stack>
          )}

          {/* Parsing progress */}
          {parsing && (
            <Box>
              <Typography level='body-xs' sx={{ color: 'text.secondary', mb: 0.75 }}>
                Parsing deck…
              </Typography>
              <LinearProgress size='sm' sx={{ borderRadius: 'full' }} />
            </Box>
          )}

          {/* Error */}
          {parseError && (
            <Alert color='danger' variant='soft' size='sm' startDecorator={<WarningAmberRounded />}>
              {parseError}
            </Alert>
          )}

          <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
            You are responsible for ensuring imported content does not violate third-party copyrights.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant='plain' color='neutral' onClick={handleClose}>
          Cancel
        </Button>
        <Button variant='solid' color='primary' onClick={handleParse} disabled={!selectedFile || parsing} loading={parsing}>
          Parse File
        </Button>
      </DialogActions>
    </>
  )

  // ── Step 2: Preview ───────────────────────────────────────────────────────

  const renderPreview = () => (
    <>
      <DialogContent sx={{ pb: 0 }}>
        <Stack spacing={3}>
          {/* Deck meta */}
          <Stack spacing={1.5}>
            <Input
              id='import-deck-name'
              size='md'
              placeholder={t('cards.import.deckNamePlaceholder')}
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              sx={{ fontWeight: 600 }}
            />
            <Textarea
              id='import-deck-desc'
              size='sm'
              placeholder={t('cards.import.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minRows={2}
              maxRows={3}
            />
          </Stack>

          {/* Summary row */}
          <Stack direction='row' alignItems='center' spacing={1.5} flexWrap='wrap'>
            <Chip size='sm' variant='soft' color='primary' startDecorator={<StyleIcon sx={{ fontSize: 14 }} />}>
              {preview.card_count} {preview.card_count === 1 ? 'card' : 'cards'}
            </Chip>
            {quotaWarning && (
              <Chip size='sm' variant='soft' color='warning' startDecorator={<WarningAmberRounded sx={{ fontSize: 14 }} />}>
                {preview.cards_allowed} slots remaining
              </Chip>
            )}
          </Stack>

          {/* Quota warning */}
          {quotaWarning && (
            <Alert color='warning' variant='soft' size='sm' startDecorator={<WarningAmberRounded />}>
              Importing {preview.card_count} {preview.card_count === 1 ? 'card' : 'cards'} would exceed your plan limit (
              {preview.cards_allowed} remaining). You can upgrade your plan or reduce the import.
            </Alert>
          )}

          {/* Import error */}
          {importError && (
            <Alert color='danger' variant='soft' size='sm' startDecorator={<WarningAmberRounded />}>
              {importError}
            </Alert>
          )}

          <Divider />

          {/* Card previews */}
          <Box>
            <Typography level='body-xs' fontWeight={600} sx={{ color: 'text.tertiary', mb: 1.5, letterSpacing: '0.5px' }}>
              PREVIEW
            </Typography>
            <Stack spacing={1}>
              {displayedCards.map((card, i) => (
                <Card key={i} variant='outlined' sx={{ borderRadius: 'md' }}>
                  <CardContent sx={{ p: 1.5, gap: 0 }}>
                    <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                      <Box sx={{ flex: 1 }}>
                        <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.25 }}>
                          Front
                        </Typography>
                        <Typography level='body-sm' sx={{ color: 'text.primary', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                          {card.front || <em style={{ opacity: 0.5 }}>empty</em>}
                        </Typography>
                      </Box>
                      <Divider orientation='vertical' sx={{ alignSelf: 'stretch', mx: 0.5 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 0.25 }}>
                          Back
                        </Typography>
                        <Typography level='body-sm' sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                          {card.back || <em style={{ opacity: 0.5 }}>empty</em>}
                        </Typography>
                      </Box>
                    </Stack>
                    {card.tags?.length > 0 && (
                      <Stack direction='row' spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {card.tags.map((tag, ti) => (
                          <Chip key={ti} size='sm' variant='soft' color='neutral' sx={{ fontSize: '0.65rem' }}>
                            {tag}
                          </Chip>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* Show all toggle */}
            {preview.card_count > 5 && (
              <Button
                variant='plain'
                color='neutral'
                size='sm'
                onClick={() => setShowAllCards((v) => !v)}
                sx={{ mt: 1, width: '100%', color: 'text.tertiary', fontSize: '0.8rem' }}
              >
                {showAllCards ? 'Show less' : `Show all ${preview.card_count} ${preview.card_count === 1 ? 'card' : 'cards'}`}
              </Button>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          variant='plain'
          color='neutral'
          startDecorator={<ArrowBack />}
          onClick={() => {
            setStep(STEP.UPLOAD)
            setImportError(null)
          }}
        >
          Back
        </Button>
        <Button variant='solid' color='primary' onClick={handleConfirm} disabled={!deckName.trim()} startDecorator={<CheckCircleOutline />}>
          Import {preview.card_count} {preview.card_count === 1 ? 'card' : 'cards'}
        </Button>
      </DialogActions>
    </>
  )

  // ── Step 3: Importing progress ────────────────────────────────────────────

  const renderImporting = () => (
    <DialogContent>
      <Stack alignItems='center' spacing={3} sx={{ py: 4 }}>
        <Skeleton variant='circular' width={56} height={56} loading />
        <Stack spacing={0.5} alignItems='center'>
          <Typography level='title-md' sx={{ color: 'text.primary' }}>
            Importing deck…
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Creating {preview?.card_count} {preview?.card_count === 1 ? 'card' : 'cards'} — this only takes a moment.
          </Typography>
        </Stack>
        <LinearProgress size='md' sx={{ width: '100%', maxWidth: 300, borderRadius: 'full' }} />
      </Stack>
    </DialogContent>
  )

  // ── Modal ─────────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={step === STEP.IMPORTING ? undefined : handleClose}>
      <ModalDialog
        layout='center'
        size='md'
        sx={{
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {step !== STEP.IMPORTING && <ModalClose />}

        <DialogTitle>
          <Stack direction='row' alignItems='center' spacing={1}>
            <FileUpload sx={{ fontSize: 20, color: 'primary.plainColor' }} />
            <Box>
              <Typography level='title-lg'>Import Anki Deck</Typography>
              {step === STEP.PREVIEW && (
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  Review before importing
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>

        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {step === STEP.UPLOAD && renderUpload()}
          {step === STEP.PREVIEW && renderPreview()}
          {step === STEP.IMPORTING && renderImporting()}
        </Box>
      </ModalDialog>
    </Modal>
  )
}
