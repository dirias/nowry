import React, { useState, useEffect } from 'react'
import { Modal, ModalDialog, ModalClose, Typography, Box, Button, Stack, Card, CardContent, Divider, IconButton } from '@mui/joy'
import { ArrowBack, ArrowForward, Flip, Visibility } from '@mui/icons-material'
import mermaid from 'mermaid'

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
})

export default function CardPreviewModal({ open, onClose, title, cards = [], initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isFlipped, setIsFlipped] = useState(false)
  const [svgContent, setSvgContent] = useState('')

  // Reset state when opening with different props
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setIsFlipped(false)
      setSvgContent('')
    }
  }, [open, initialIndex])

  const currentCard = cards[currentIndex]

  // Render Mermaid diagram for visual cards
  useEffect(() => {
    const renderDiagram = async () => {
      if (currentCard?.card_type === 'visual' && currentCard.diagram_code) {
        try {
          const id = `mermaid-preview-${Date.now()}`
          const { svg } = await mermaid.render(id, currentCard.diagram_code)
          setSvgContent(svg)
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error)
          setSvgContent('<div style="color:red">Failed to render diagram</div>')
        }
      } else {
        setSvgContent('')
      }
    }

    if (open && currentCard) {
      renderDiagram()
    }
  }, [currentIndex, currentCard, open])

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setIsFlipped(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsFlipped(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === 'Space') setIsFlipped((prev) => !prev)
  }

  if (!currentCard && cards.length > 0) {
    // Fallback if index is out of bounds
    return null
  }

  return (
    <Modal open={open} onClose={onClose} onKeyDown={handleKeyDown}>
      <ModalDialog
        layout='center'
        sx={{
          width: '100%',
          maxWidth: 800, // Increased width for diagrams
          minHeight: 500,
          p: 3,
          borderRadius: 'lg',
          outline: 'none'
        }}
      >
        <ModalClose />

        {/* Header */}
        <Box sx={{ mb: 2, pr: 4 }}>
          <Typography level='h4' fontWeight='lg'>
            {title || 'Card Preview'}
          </Typography>
          <Typography level='body-sm' textColor='text.tertiary'>
            Card {currentIndex + 1} of {cards.length} • {currentCard?.card_type || 'flashcard'}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Content Area */}
        {cards.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <Typography textColor='text.tertiary'>No cards in this deck yet.</Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card
              variant='outlined'
              onClick={() => setIsFlipped(!isFlipped)}
              sx={{
                flex: 1,
                minHeight: 300,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                bgcolor: 'background.surface',
                transition: 'all 0.3s ease',
                transformStyle: 'preserve-3d',
                borderColor: isFlipped ? 'primary.outlinedBorder' : 'neutral.outlinedBorder',
                '&:hover': {
                  boxShadow: 'md',
                  borderColor: 'primary.outlinedBorder'
                },
                overflow: 'hidden'
              }}
            >
              <CardContent sx={{ textAlign: 'center', maxWidth: '100%', width: '100%', p: 3 }}>
                {currentCard.card_type === 'visual' ? (
                  // Visual Card Logic
                  isFlipped ? (
                    <Box>
                      <Typography level='h4' sx={{ mb: 2 }}>
                        Description
                      </Typography>
                      <Typography level='body-lg'>{currentCard.content || 'No description available.'}</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography level='title-lg' sx={{ mb: 2 }}>
                        {currentCard.title}
                      </Typography>
                      {svgContent ? (
                        <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ maxWidth: '100%', overflow: 'auto' }} />
                      ) : (
                        <Typography>Loading diagram...</Typography>
                      )}
                    </Box>
                  )
                ) : (
                  // Standard Flashcard Logic
                  <Typography
                    level='h4'
                    sx={{
                      color: isFlipped && currentCard.card_type !== 'image' ? 'primary.plainColor' : 'text.primary',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {isFlipped
                      ? currentCard.answer || currentCard.content || 'No Content'
                      : currentCard.question || currentCard.title || 'No Title'}
                  </Typography>
                )}

                <Stack direction='row' alignItems='center' justifyContent='center' spacing={1} sx={{ mt: 3, color: 'text.tertiary' }}>
                  <Flip fontSize='small' />
                  <Typography level='body-xs'>{isFlipped ? 'Back' : 'Front'} • Click to flip</Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mt: 2 }}>
              <Button variant='plain' startDecorator={<ArrowBack />} onClick={handlePrev} disabled={currentIndex === 0}>
                Previous
              </Button>

              <Typography level='body-sm' fontWeight='lg'>
                {currentIndex + 1} / {cards.length}
              </Typography>

              <Button variant='plain' endDecorator={<ArrowForward />} onClick={handleNext} disabled={currentIndex === cards.length - 1}>
                Next
              </Button>
            </Stack>
          </Box>
        )}
      </ModalDialog>
    </Modal>
  )
}
