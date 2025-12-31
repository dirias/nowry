import React from 'react'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  Stack,
  Button,
  Chip,
  Divider,
  Sheet,
  Alert,
  LinearProgress,
  Input
} from '@mui/joy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import ArticleIcon from '@mui/icons-material/Article'

export default function ImportPreviewModal({ open, onClose, previewData, onConfirm, loading }) {
  const [editedTitle, setEditedTitle] = React.useState('')
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0)

  React.useEffect(() => {
    if (previewData?.title) {
      setEditedTitle(previewData.title)
    }
  }, [previewData])

  React.useEffect(() => {
    // Reset to first page when modal opens
    setCurrentPageIndex(0)
  }, [open])

  if (!previewData) return null

  const { title, total_pages, quality_summary, warnings, info, sample_pages, file_info } = previewData

  const handleConfirm = () => {
    onConfirm(editedTitle)
  }

  const handleNextPage = () => {
    if (currentPageIndex < sample_pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const currentPage = sample_pages?.[currentPageIndex]

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 800,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <ModalClose />
        <Typography level='h4' sx={{ mb: 2 }}>
          📄 Import Preview & Validation
        </Typography>

        {/* File Info */}
        <Alert startDecorator={<InfoIcon />} color='neutral' variant='soft' sx={{ mb: 2 }}>
          <Stack direction='row' spacing={2} flexWrap='wrap'>
            <Typography level='body-sm'>
              <strong>File:</strong> {file_info?.original_filename || 'document'}
            </Typography>
            <Typography level='body-sm'>
              <strong>Type:</strong> {file_info?.type || 'PDF'}
            </Typography>
            <Typography level='body-sm'>
              <strong>Size:</strong> {file_info?.size ? (file_info.size / 1024).toFixed(1) + ' KB' : 'Unknown'}
            </Typography>
          </Stack>
        </Alert>

        {/* Document Title - EDITABLE */}
        <Sheet variant='soft' sx={{ p: 2, borderRadius: 'md', mb: 2 }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography level='body-sm' sx={{ color: 'neutral.600', mb: 0.5 }}>
                Book Title (editable)
              </Typography>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder='Enter book title...'
                size='lg'
                sx={{ fontWeight: 'bold' }}
              />
            </Box>

            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
              <Chip startDecorator={<ArticleIcon />} variant='soft' color='primary'>
                {total_pages} {total_pages === 1 ? 'página' : 'páginas'}
              </Chip>

              {quality_summary?.has_multi_column && (
                <Chip startDecorator={<ViewColumnIcon />} variant='soft' color='success'>
                  2 columnas detectadas
                </Chip>
              )}
            </Stack>
          </Stack>
        </Sheet>

        <Divider sx={{ my: 2 }} />

        {/* Info & Warnings */}
        {info && (
          <Alert startDecorator={<InfoIcon />} color='primary' variant='soft' sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        {warnings && warnings.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {warnings.map((warning, idx) => (
              <Alert key={idx} startDecorator={<WarningIcon />} color='warning' variant='soft'>
                {warning}
              </Alert>
            ))}
          </Stack>
        )}

        {/* Sample Page Preview - Carousel */}
        <Box sx={{ mb: 3 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5 }}>
            <Typography level='title-md'>📖 Page Preview</Typography>
            <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
              Page {currentPageIndex + 1} of {sample_pages?.length || 0}
            </Typography>
          </Stack>

          {currentPage && (
            <Sheet variant='outlined' sx={{ p: 2, borderRadius: 'md' }}>
              {/* Page Header */}
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5 }}>
                <Typography level='title-lg' color='primary'>
                  {currentPage.title}
                </Typography>
                <Stack direction='row' spacing={1}>
                  {currentPage.has_columns && (
                    <Chip size='sm' variant='soft' color='success'>
                      2 columns
                    </Chip>
                  )}
                  <Chip size='sm' variant='soft'>
                    {currentPage.word_count} words
                  </Chip>
                </Stack>
              </Stack>

              {/* Quality indicator */}
              <Box sx={{ mb: 2 }}>
                <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                  <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                    Extraction Quality
                  </Typography>
                  <Typography level='body-xs' fontWeight='bold' color={currentPage.quality_score > 70 ? 'success' : 'warning'}>
                    {currentPage.quality_score}%
                  </Typography>
                </Stack>
                <LinearProgress
                  determinate
                  value={currentPage.quality_score}
                  color={currentPage.quality_score > 70 ? 'success' : currentPage.quality_score > 40 ? 'warning' : 'danger'}
                  sx={{ height: 6 }}
                />
              </Box>

              {/* Full Content Preview with 2-column rendering */}
              <Box
                sx={{
                  minHeight: 400,
                  maxHeight: 500,
                  overflow: 'auto',
                  p: 3,
                  backgroundColor: 'background.surface',
                  borderRadius: 'md',
                  border: '1px solid',
                  borderColor: 'divider',
                  '& p': {
                    margin: '0.75em 0',
                    lineHeight: 1.7,
                    fontSize: '0.875rem',
                    color: 'text.primary'
                  },
                  '& h1, & h2, & h3': {
                    margin: '1.2em 0 0.6em 0',
                    lineHeight: 1.4,
                    color: 'text.primary'
                  },
                  '& h1': { fontSize: '1.5rem', fontWeight: 'bold' },
                  '& h2': { fontSize: '1.25rem', fontWeight: 'bold' },
                  '& h3': { fontSize: '1.1rem', fontWeight: 'bold' },
                  '& strong': { fontWeight: 'bold' },
                  '& em': { fontStyle: 'italic' },
                  '& div[style*="grid"]': {
                    display: 'grid !important',
                    gridTemplateColumns: '1fr 1fr !important',
                    gap: '2rem !important',
                    marginTop: '1rem'
                  },
                  '& .column-left, & .column-right': {
                    padding: '0.5rem',
                    borderRight: '1px solid',
                    borderRightColor: 'divider'
                  },
                  '& .column-right': {
                    borderRight: 'none'
                  }
                }}
                dangerouslySetInnerHTML={{ __html: currentPage.content_preview }}
              />

              {/* Navigation Buttons */}
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mt: 2 }}>
                <Button
                  variant='outlined'
                  color='neutral'
                  onClick={handlePrevPage}
                  disabled={currentPageIndex === 0}
                  startDecorator={<span>←</span>}
                >
                  Previous
                </Button>

                <Stack direction='row' spacing={1}>
                  {sample_pages?.map((_, idx) => (
                    <Box
                      key={idx}
                      onClick={() => setCurrentPageIndex(idx)}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: idx === currentPageIndex ? 'primary.500' : 'neutral.300',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.3)',
                          backgroundColor: idx === currentPageIndex ? 'primary.600' : 'neutral.400'
                        }
                      }}
                    />
                  ))}
                </Stack>

                <Button
                  variant='outlined'
                  color='neutral'
                  onClick={handleNextPage}
                  disabled={currentPageIndex === sample_pages.length - 1}
                  endDecorator={<span>→</span>}
                >
                  Next
                </Button>
              </Stack>
            </Sheet>
          )}
        </Box>

        {/* Extraction Quality - Moved to End */}
        <Box sx={{ mb: 3 }}>
          <Typography level='title-md' sx={{ mb: 1 }}>
            📊 Extraction Quality Summary
          </Typography>
          <Sheet variant='soft' sx={{ p: 2, borderRadius: 'md' }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level='body-sm'>Total Words Extracted</Typography>
                <Typography level='body-md' fontWeight='bold' color='success'>
                  {quality_summary?.total_words?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level='body-sm'>Avg Words per Page</Typography>
                <Typography level='body-md' fontWeight='bold'>
                  {quality_summary?.avg_words_per_page || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level='body-sm'>Total Characters</Typography>
                <Typography level='body-md'>{quality_summary?.total_chars?.toLocaleString() || 0}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level='body-sm'>Multi-Column Pages</Typography>
                <Typography level='body-md' fontWeight='bold' color={quality_summary?.has_multi_column ? 'success' : 'neutral'}>
                  {quality_summary?.has_multi_column ? `${sample_pages?.filter((p) => p.has_columns).length || 0} pages` : 'None'}
                </Typography>
              </Box>
            </Stack>
          </Sheet>
        </Box>

        {/* Action Buttons */}
        <Stack direction='row' spacing={2} justifyContent='flex-end' sx={{ mt: 2 }}>
          <Button variant='plain' color='neutral' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button startDecorator={loading ? null : <CheckCircleIcon />} onClick={handleConfirm} loading={loading} color='success' size='lg'>
            Confirm & Import
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}
