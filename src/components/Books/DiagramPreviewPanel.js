import React, { useState, useEffect, useCallback } from 'react'
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
  Alert,
} from '@mui/joy'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { illustrationsService } from '../../api/services/illustrations.service'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import MermaidRenderer from './MermaidRenderer'

export default function DiagramPreviewPanel({ open, onClose, selectedText, bookId, onInsert }) {
  const { t } = useTranslation()
  const { openUpgradeModal } = useSubscriptionContext()
  const [diagramType, setDiagramType] = useState('auto')
  const [diagramCode, setDiagramCode] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = useCallback(async () => {
    if (!selectedText || !bookId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await illustrationsService.generateDiagram(bookId, selectedText, diagramType)
      setDiagramCode(res.mermaid_code)
      setExplanation(res.explanation || '')
    } catch (e) {
      if (e.response?.status === 403) {
        openUpgradeModal(t('upgrade.headlines.illustrations'))
        onClose()
      } else {
        setError(e.response?.data?.detail || t('aiMagic.diagram.error'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedText, bookId, diagramType, openUpgradeModal, onClose, t])

  // Auto-generate on open
  useEffect(() => {
    if (open && selectedText) {
      setDiagramCode(null)
      setError(null)
      setExplanation('')
      handleGenerate()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInsert = () => {
    if (diagramCode) {
      onInsert(diagramCode)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{
          width: { xs: '95%', sm: '90%', md: '85%', lg: '760px' },
          p: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 2.5 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.level1',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 'sm',
                  bgcolor: 'primary.softBg',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 20, color: 'primary.plainColor' }} />
              </Box>
              <Typography level="title-lg" fontWeight={600}>
                {t('aiMagic.diagram.panelTitle')}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Select
                size="sm"
                value={diagramType}
                onChange={(_, val) => setDiagramType(val)}
                aria-label={t('aiMagic.diagram.typeAriaLabel')}
                sx={{ minWidth: 140 }}
              >
                <Option value="auto">{t('aiMagic.diagram.types.auto')}</Option>
                <Option value="mindmap">{t('aiMagic.diagram.types.mindmap')}</Option>
                <Option value="flowchart">{t('aiMagic.diagram.types.flowchart')}</Option>
                <Option value="sequence">{t('aiMagic.diagram.types.sequence')}</Option>
                <Option value="er">{t('aiMagic.diagram.types.er')}</Option>
              </Select>
              <ModalClose />
            </Stack>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ overflowY: 'auto', bgcolor: 'background.surface' }}>
          {isLoading && (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={2}>
              <CircularProgress size="md" />
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                {t('aiMagic.diagram.loading')}
              </Typography>
            </Stack>
          )}
          {error && !isLoading && (
            <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
              <Alert color="danger" variant="soft">{error}</Alert>
            </Box>
          )}
          {diagramCode && !isLoading && (
            <Stack
              spacing={3}
              sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}
            >
              <Box
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'neutral.outlinedBorder',
                  borderRadius: 'lg',
                  bgcolor: 'background.level1',
                  minHeight: 240,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'auto',
                }}
              >
                <MermaidRenderer code={diagramCode} />
              </Box>
              {explanation && (
                <Box
                  sx={{
                    bgcolor: 'primary.softBg',
                    p: 2,
                    borderRadius: 'md',
                    borderLeft: '3px solid',
                    borderColor: 'primary.outlinedBorder',
                  }}
                >
                  <Typography level="title-sm" sx={{ color: 'primary.plainColor', mb: 0.5 }}>
                    {t('aiMagic.diagram.explanation')}
                  </Typography>
                  <Typography level="body-md" sx={{ color: 'text.primary' }}>
                    {explanation}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 2.5 },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
          }}
        >
          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.5}
            justifyContent="flex-end"
          >
            <Button
              variant="plain"
              color="neutral"
              onClick={onClose}
              aria-label={t('common.cancel')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleGenerate}
              loading={isLoading}
              disabled={isLoading}
              startDecorator={<RefreshRoundedIcon sx={{ fontSize: 16 }} />}
              aria-label={t('aiMagic.diagram.regenerateAriaLabel')}
            >
              {t('aiMagic.diagram.regenerate')}
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={handleInsert}
              disabled={!diagramCode || isLoading}
              startDecorator={<AddRoundedIcon sx={{ fontSize: 16 }} />}
              aria-label={t('aiMagic.diagram.insertAriaLabel')}
            >
              {t('aiMagic.diagram.insert')}
            </Button>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
