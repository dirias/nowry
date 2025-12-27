import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Stack,
  Typography,
  Box,
  Input,
  Chip,
  Divider,
  LinearProgress,
  Skeleton,
  Button,
  Select,
  Option,
  IconButton
} from '@mui/joy'
import { Plus, Search, Filter, X } from 'lucide-react'
import DecksView from './DecksView'
import LastCardsAdded from './LastCardsAdded'
import CreateDeckModal from './CreateDeckModal'
import CreateCardModal from './CreateCardModal'
import { decksService, cardsService } from '../../api/services'

const CardHome = () => {
  const [loading, setLoading] = useState(true)
  const [decks, setDecks] = useState([])
  const [cards, setCards] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedTags, setSelectedTags] = useState([])

  // Modal states
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)

  // Edit data states
  const [editingDeck, setEditingDeck] = useState(null)
  const [editingCard, setEditingCard] = useState(null)

  const navigate = useNavigate()

  const handleStudy = (deck) => {
    navigate(`/study/${deck._id || deck.id}`)
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [decksData, cardsData] = await Promise.all([decksService.getAll(), cardsService.getAll()])
      setDecks(decksData || [])
      setCards(cardsData || [])
    } catch (error) {
      console.error('Error fetching cards data:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Extract all unique tags
  const allTags = Array.from(new Set([...decks.flatMap((d) => d.tags || []), ...cards.flatMap((c) => c.tags || [])])).sort()

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleDeckSaved = (savedDeck) => {
    fetchData(true)
    setEditingDeck(null)
  }

  const handleCardSaved = (savedCard) => {
    fetchData(true)
    setEditingCard(null)
  }

  const handleEditDeck = (deck) => {
    setEditingDeck(deck)
    setIsDeckModalOpen(true)
  }

  const handleDeleteDeck = async (deck) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el mazo "${deck.name}"?`)) {
      try {
        await decksService.delete(deck._id || deck.id)
        fetchData(true)
      } catch (error) {
        console.error('Error deleting deck:', error)
      }
    }
  }

  const handleEditCard = (card) => {
    setEditingCard(card)
    setIsCardModalOpen(true)
  }

  const handleDeleteCard = async (card) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la tarjeta "${card.title}"?`)) {
      try {
        await cardsService.delete(card._id || card.id)
        fetchData(true)
      } catch (error) {
        console.error('Error deleting card:', error)
      }
    }
  }

  const filteredDecks = decks.filter((deck) => {
    const matchesSearch = deck.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTags = selectedTags.length === 0 || (deck.tags && selectedTags.every((tag) => deck.tags.includes(tag)))
    return matchesSearch && matchesTags
  })

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.title?.toLowerCase().includes(searchTerm.toLowerCase()) || card.content?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTags = selectedTags.length === 0 || (card.tags && selectedTags.every((tag) => card.tags.includes(tag)))
    return matchesSearch && matchesTags
  })

  return (
    <Container maxWidth='lg' sx={{ py: 4, transition: 'background-color 0.3s ease' }}>
      <Stack spacing={4} direction='column'>
        {/* Header Title */}
        {loading ? (
          <Skeleton variant='text' width={300} sx={{ mx: 'auto', height: 40 }} />
        ) : (
          <Typography level='h2' sx={{ fontWeight: 'bold', color: 'primary.700', textAlign: 'center', transition: 'color 0.3s ease' }}>
            ¡Sigue aprendiendo!
          </Typography>
        )}

        {/* Search and Filters */}
        <Box sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
          {loading ? (
            <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'lg' }} />
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='center'>
              <Input
                placeholder='Buscar mazos o tarjetas...'
                startDecorator={<Search size={18} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant='outlined'
                fullWidth
                sx={{
                  borderRadius: 'lg',
                  transition: 'all 0.3s ease',
                  flex: 1
                }}
              />

              {allTags.length > 0 && (
                <Select
                  multiple
                  placeholder='Filtrar por etiquetas'
                  value={selectedTags}
                  onChange={(_, newValue) => setSelectedTags(newValue)}
                  startDecorator={<Filter size={18} />}
                  slotProps={{
                    listbox: {
                      sx: {
                        borderRadius: 'md',
                        boxShadow: 'md',
                        border: '1px solid',
                        borderColor: 'neutral.outlinedBorder',
                        padding: '4px',
                        gap: '2px'
                      }
                    }
                  }}
                  sx={{
                    minWidth: 200,
                    borderRadius: 'lg',
                    backgroundColor: 'background.surface'
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', gap: '0.25rem' }}>
                      {selected.length === 0 ? (
                        <Typography level='body-sm' textColor='neutral.400'>
                          Etiquetas
                        </Typography>
                      ) : (
                        <Chip variant='soft' color='primary' size='sm'>
                          {selected.length} {selected.length === 1 ? 'etiqueta' : 'etiquetas'}
                        </Chip>
                      )}
                    </Box>
                  )}
                >
                  {allTags.map((tag) => (
                    <Option
                      key={tag}
                      value={tag}
                      sx={{
                        minHeight: '40px',
                        px: 1.5,
                        py: 1,
                        borderRadius: 'sm',
                        cursor: 'pointer',
                        backgroundColor: 'background.surface',
                        color: 'text.primary',

                        // Explicitly override ALL focus states to prevent "sticky" first item
                        '&:focus': {
                          backgroundColor: 'background.surface !important'
                        },
                        '&.Mui-focusVisible': {
                          backgroundColor: 'background.surface !important',
                          outline: 'none'
                        },
                        '&:focus-visible': {
                          backgroundColor: 'background.surface !important'
                        },

                        // ONLY show blue background on actual mouse hover
                        '&:hover': {
                          backgroundColor: 'primary.softBg !important',
                          color: 'primary.700'
                        },

                        // Selected items: no background change, just checkmark
                        '&[aria-selected="true"]': {
                          backgroundColor: 'background.surface !important',
                          color: 'primary.700',
                          fontWeight: 'bold',
                          '&::after': {
                            content: '"✓"',
                            color: 'primary.500',
                            fontSize: '1.1rem',
                            marginLeft: 'auto'
                          },
                          // Even selected items only show blue on hover
                          '&:hover': {
                            backgroundColor: 'primary.softBg !important'
                          },
                          // But NOT on focus
                          '&:focus': {
                            backgroundColor: 'background.surface !important'
                          }
                        }
                      }}
                    >
                      {tag}
                    </Option>
                  ))}
                </Select>
              )}

              {selectedTags.length > 0 && (
                <IconButton size='sm' variant='plain' color='neutral' onClick={() => setSelectedTags([])} title='Limpiar filtros'>
                  <X size={18} />
                </IconButton>
              )}
            </Stack>
          )}
        </Box>

        {/* Learning Summary */}
        {loading ? (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Skeleton variant='rectangular' width={100} height={60} sx={{ borderRadius: 'md' }} />
            <Skeleton variant='rectangular' width={100} height={60} sx={{ borderRadius: 'md' }} />
            <Skeleton variant='rectangular' width={120} height={60} sx={{ borderRadius: 'md' }} />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: 'center',
              alignItems: 'center',
              p: 3,
              borderRadius: 'lg',
              backgroundColor: 'background.level1',
              boxShadow: 'sm',
              transition: 'all 0.3s ease'
            }}
          >
            <Box textAlign='center'>
              <Typography level='h4' fontWeight='lg'>
                {cards.length}
              </Typography>
              <Typography level='body-sm' color='neutral'>
                tarjetas en total
              </Typography>
            </Box>
            <Divider orientation='vertical' sx={{ height: 40 }} />
            <Box textAlign='center'>
              <Typography level='h4' fontWeight='lg'>
                Mazos: {decks.length}
              </Typography>
              <Chip size='sm' variant='soft' color={decks.length > 0 ? 'success' : 'neutral'}>
                {decks.length > 0 ? 'Activo' : 'Sin mazos'}
              </Chip>
            </Box>
            <Divider orientation='vertical' sx={{ height: 40 }} />
            <Box textAlign='center'>
              <Typography level='body-sm'>Progreso general</Typography>
              <LinearProgress determinate value={75} sx={{ width: 120, borderRadius: 'md' }} />
            </Box>
          </Box>
        )}

        {/* Decks Section */}
        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
            <Typography level='h3' sx={{ fontWeight: 'bold', color: 'primary.700', transition: 'color 0.3s ease' }}>
              Tus mazos
            </Typography>
            <Button
              variant='soft'
              startDecorator={<Plus size={18} />}
              onClick={() => {
                setEditingDeck(null)
                setIsDeckModalOpen(true)
              }}
            >
              Nuevo Mazo
            </Button>
          </Stack>
          {loading ? (
            <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'lg' }} />
          ) : (
            <DecksView decks={filteredDecks} onStudy={handleStudy} onEdit={handleEditDeck} onDelete={handleDeleteDeck} />
          )}
        </Box>

        {/* Recently Added Cards Section */}
        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
            <Typography level='h3' sx={{ fontWeight: 'bold', color: 'primary.700', transition: 'color 0.3s ease' }}>
              Tarjetas añadidas recientemente
            </Typography>
            <Button
              variant='soft'
              color='neutral'
              startDecorator={<Plus size={18} />}
              onClick={() => {
                setEditingCard(null)
                setIsCardModalOpen(true)
              }}
            >
              Añadir Tarjeta
            </Button>
          </Stack>
          {loading ? (
            <Skeleton variant='rectangular' height={150} sx={{ borderRadius: 'lg' }} />
          ) : (
            <LastCardsAdded cards={filteredCards.slice(0, 10)} onEdit={handleEditCard} onDelete={handleDeleteCard} />
          )}
        </Box>
      </Stack>

      {/* Modals */}
      <CreateDeckModal
        open={isDeckModalOpen}
        onClose={() => {
          setIsDeckModalOpen(false)
          setEditingDeck(null)
        }}
        onSaved={handleDeckSaved}
        initialData={editingDeck}
      />
      <CreateCardModal
        open={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false)
          setEditingCard(null)
        }}
        onSaved={handleCardSaved}
        decks={decks}
        initialData={editingCard}
      />
    </Container>
  )
}

export default CardHome
