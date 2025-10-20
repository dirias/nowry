import React, { useState } from 'react'
import {
  Box,
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Button,
  Card,
  CardContent,
  CardOverflow,
  Stack,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/joy'
import { BookOpen, RefreshCw } from 'lucide-react'

export default function GeneratedCards({ cards = [], onCancel, onGenerateAgain, onAddToDeck }) {
  const [selectedCards, setSelectedCards] = useState([])
  const [loading, setLoading] = useState(false)

  const toggleCardSelection = (index) => {
    setSelectedCards((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const handleGenerateAgain = async () => {
    try {
      setLoading(true)
      await onGenerateAgain?.()
    } finally {
      setLoading(false)
    }
  }

  const handleAddToDeck = () => {
    const selected = selectedCards.map((i) => cards[i])
    onAddToDeck?.(selected)
  }

  return (
    <Modal open onClose={onCancel}>
      <ModalDialog
        size='lg'
        layout='center'
        sx={{
          borderRadius: 'xl',
          boxShadow: 'lg',
          maxHeight: '85vh',
          overflow: 'auto',
          p: 3
        }}
      >
        {/* Header */}
        <Box sx={{ position: 'relative' }}>
          {/* Close button (top right) */}
          <ModalClose sx={{ position: 'absolute', top: 8, right: 8 }} />

          {/* Refresh button (slightly to the left of close) */}
          <Tooltip title='Generate again'>
            <Button
              size='sm'
              variant='outlined'
              onClick={handleGenerateAgain}
              disabled={loading}
              sx={{
                position: 'absolute',
                top: 8,
                right: 48, // space between refresh and close button
                minWidth: 36,
                p: 0.8
              }}
            >
              {loading ? <CircularProgress size='sm' /> : <RefreshCw size={18} />}
            </Button>
          </Tooltip>

          {/* Title and subtitle */}
          <Typography level='h4' sx={{ fontWeight: 'bold', pr: 8 }}>
            New Study Cards
          </Typography>
          <Typography level='body-sm' sx={{ mt: 1 }}>
            Select the cards you want to add to your study deck.
          </Typography>
        </Box>

        <Typography level='body-sm' sx={{ mb: 2, mt: 1 }}>
          Select the cards you want to add to your study deck.
        </Typography>

        {cards.length === 0 ? (
          <Typography level='body-md' sx={{ textAlign: 'center', py: 4 }}>
            No cards generated.
          </Typography>
        ) : (
          <Stack direction='row' flexWrap='wrap' gap={2} justifyContent='center' sx={{ mt: 2 }}>
            {cards.map((card, index) => {
              const isSelected = selectedCards.includes(index)
              return (
                <Card
                  key={index}
                  onClick={() => toggleCardSelection(index)}
                  variant='outlined'
                  sx={{
                    width: 260,
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease-in-out',
                    borderColor: isSelected ? 'primary.solidBg' : 'neutral.outlinedBorder',
                    backgroundColor: isSelected ? 'primary.softBg' : 'background.body',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'md'
                    }
                  }}
                >
                  <CardOverflow sx={{ px: 2, pt: 2 }}>
                    <Typography level='title-md' startDecorator={<BookOpen size={16} />}>
                      {card.title}
                    </Typography>
                  </CardOverflow>

                  <Divider />

                  <CardContent>
                    <Typography level='body-sm' color='neutral'>
                      {card.content}
                    </Typography>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />
        <Stack direction='row' justifyContent='flex-end' spacing={1}>
          <Button variant='soft' color='neutral' onClick={onCancel}>
            Close
          </Button>
          <Button variant='solid' color='primary' onClick={handleAddToDeck} disabled={selectedCards.length === 0}>
            Add to Deck ({selectedCards.length})
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  )
}
