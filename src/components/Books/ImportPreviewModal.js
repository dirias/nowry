import React from 'react'
import { useTranslation } from 'react-i18next'
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
import DOMPurify from 'dompurify'

export default function ImportPreviewModal({ open, onClose, previewData, onConfirm, loading }) {
  const { t } = useTranslation()
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
          width: { xs: '95%', sm: '90%', md: '85%', lg: '800px' },
          maxWidth: '800px',
          height: { xs: '95vh', md: 'auto' },
          maxHeight: { xs: '95vh', md: '90vh' },
          overflowY: 'auto',
          p: 0,
          borderRadius: { xs: 'lg', md: 'xl' },
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.level1'
          }}
        >
          <Typography level='h3' sx={{ m: 0, fontWeight: 700 }}>
            📄 Import Preview & Validation
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
            Review and confirm your book import
          </Typography>
        </Box>

        {/* CONTENT */}
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            {/* Section: File Information */}
            <Box>
              <Alert startDecorator={<InfoIcon />} color='neutral' variant='soft'>
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
            </Box>

            <Divider />

            {/* Section: Book Title (Editable) */}
            <Box>
              <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                Book Information
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography level='body-sm' sx={{ fontWeight: 600, mb: 1 }}>
                    Book Title
                  </Typography>
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder={t('books.import.titlePlaceholder')}
                    size='lg'
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                  <Chip startDecorator={<ArticleIcon />} variant='soft' color='primary' size='lg'>
                    {total_pages} {total_pages === 1 ? 'page' : 'pages'}
                  </Chip>

                  {quality_summary?.has_multi_column && (
                    <Chip startDecorator={<ViewColumnIcon />} variant='soft' color='success' size='lg'>
                      2 columns detected
                    </Chip>
                  )}
                </Stack>
              </Stack>
            </Box>

            {(info || (warnings && warnings.length > 0)) && <Divider />}

            {/* Section: Info & Warnings (Conditional) */}
            {(info || (warnings && warnings.length > 0)) && (
              <Box>
                <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                  Validation Results
                </Typography>
                <Stack spacing={1.5}>
                  {info && (
                    <Alert startDecorator={<InfoIcon />} color='primary' variant='soft'>
                      {info}
                    </Alert>
                  )}

                  {warnings && warnings.length > 0 && (
                    <>
                      {warnings.map((warning, idx) => (
                        <Alert key={idx} startDecorator={<WarningIcon />} color='warning' variant='soft'>
                          {warning}
                        </Alert>
                      ))}
                    </>
                  )}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Section: Page Preview */}
            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={2}>
                <Box>
                  <Typography level='title-md' sx={{ fontWeight: 700, color: 'text.primary' }}>
                    📖 Page Preview
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                    Review sample pages from your document
                  </Typography>
                </Box>
                <Typography level='body-sm' sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Page {currentPageIndex + 1} of {sample_pages?.length || 0}
                </Typography>
              </Stack>

              {currentPage && (
                <Sheet variant='outlined' sx={{ p: { xs: 2, md: 3 }, borderRadius: 'md' }}>
                  {/* Page Header */}
                  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
                    <Typography level='title-lg' sx={{ color: 'primary.solidBg', fontWeight: 700 }}>
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
                      <Typography level='body-xs' sx={{ color: 'text.secondary', fontWeight: 600 }}>
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

                  {/* Full Content Preview */}
                  <Box
                    sx={{
                      minHeight: 300,
                      maxHeight: 400,
                      overflow: 'auto',
                      p: { xs: 2, md: 3 },
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
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentPage.content_preview) }}
                  />

                  {/* Navigation Buttons */}
                  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mt: 2 }}>
                    <Button
                      variant='outlined'
                      color='neutral'
                      onClick={handlePrevPage}
                      disabled={currentPageIndex === 0}
                      startDecorator={<span>←</span>}
                      size='sm'
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
                            bgcolor: idx === currentPageIndex ? 'primary.solidBg' : 'neutral.outlinedBorder',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              transform: 'scale(1.3)',
                              bgcolor: idx === currentPageIndex ? 'primary.solidHoverBg' : 'neutral.solidBg'
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
                      size='sm'
                    >
                      Next
                    </Button>
                  </Stack>
                </Sheet>
              )}
            </Box>

            <Divider />

            {/* Section: Extraction Quality Summary */}
            <Box>
              <Typography level='title-md' sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                📊 Extraction Quality Summary
              </Typography>
              <Sheet variant='soft' sx={{ p: 2, borderRadius: 'md' }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                      Total Words Extracted
                    </Typography>
                    <Typography level='body-md' fontWeight='bold' color='success'>
                      {quality_summary?.total_words?.toLocaleString() || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                      Avg Words per Page
                    </Typography>
                    <Typography level='body-md' fontWeight='bold'>
                      {quality_summary?.avg_words_per_page || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                      Total Characters
                    </Typography>
                    <Typography level='body-md'>{quality_summary?.total_chars?.toLocaleString() || 0}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                      Multi-Column Pages
                    </Typography>
                    <Typography level='body-md' fontWeight='bold' color={quality_summary?.has_multi_column ? 'success' : 'neutral'}>
                      {quality_summary?.has_multi_column ? `${sample_pages?.filter((p) => p.has_columns).length || 0} pages` : 'None'}
                    </Typography>
                  </Box>
                </Stack>
              </Sheet>
            </Box>
          </Stack>
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Button variant='plain' onClick={onClose} disabled={loading} size='lg' fullWidth={{ xs: true, sm: false }}>
            Cancel
          </Button>
          <Button
            startDecorator={loading ? null : <CheckCircleIcon />}
            onClick={handleConfirm}
            loading={loading}
            color='success'
            size='lg'
            fullWidth={{ xs: true, sm: false }}
          >
            Confirm & Import
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  )
}
