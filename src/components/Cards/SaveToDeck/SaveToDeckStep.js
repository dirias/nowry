import React from 'react'
import {
  Box,
  Stack,
  Typography,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Select,
  Option,
  Input,
  Chip,
  ChipDelete,
  Alert,
  Skeleton,
  IconButton
} from '@mui/joy'
import { Plus, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// One skeleton row shared by the deck-picker (rectangular) and tag pills (chip-shaped) loading states
const TAG_SKELETON_KEYS = [1, 2, 3]

const EMPTY_STATE_COPY = {
  flashcard: { title: 'emptyFlashcard', body: 'emptyFlashcardBody' },
  quiz: { title: 'emptyQuiz', body: 'emptyQuizBody' },
  visual: { title: 'emptyVisual', body: 'emptyVisualBody' }
}

/**
 * Deck picker + tag picker step shared by GeneratedCards, QuestionnaireModal,
 * and VisualizerModal. Reads/writes exclusively through the `saveToDeck` object
 * returned by useSaveToDeck(deckType) — it never calls a card-save API itself;
 * the parent modal reads saveToDeck.selectedDeckId / saveToDeck.allTags at its
 * own save time.
 */
export default function SaveToDeckStep({ deckType, saveToDeck, createDeckDescriptionDefault }) {
  const { t } = useTranslation()
  const {
    decks,
    decksLoading,
    selectedDeckId,
    setSelectedDeckId,
    isCreatingDeck,
    setIsCreatingDeck,
    newDeckName,
    setNewDeckName,
    createDeck,
    createLoading,
    availableTags,
    tagsLoading,
    tagsError,
    selectedTags,
    customTags,
    toggleTag,
    addCustomTag,
    removeCustomTag
  } = saveToDeck

  const [tagDraft, setTagDraft] = React.useState('')

  // Pre-fill the create-deck name once, the first time the inline form opens
  React.useEffect(() => {
    if (isCreatingDeck && !newDeckName && createDeckDescriptionDefault) {
      setNewDeckName(createDeckDescriptionDefault)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreatingDeck])

  const commitTagDraft = () => {
    const trimmed = tagDraft.trim()
    if (!trimmed) return
    addCustomTag(trimmed)
    setTagDraft('')
  }

  const handleTagDraftKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTagDraft()
    }
  }

  // createDeck() rejects on API failure (e.g. plan-limit 403) — the parent
  // modal is responsible for its own error UI around card/deck creation, so
  // this just prevents an unhandled rejection from a bare button onClick.
  const handleCreateDeck = () => {
    createDeck().catch((error) => {
      console.error('[SaveToDeckStep] Error creating deck:', error)
    })
  }

  const emptyCopy = EMPTY_STATE_COPY[deckType] || EMPTY_STATE_COPY.flashcard
  const showEmptyState = !decksLoading && decks.length === 0 && !isCreatingDeck

  return (
    <Stack spacing={3} sx={{ minHeight: 200, px: 2 }}>
      {decksLoading ? (
        <Skeleton variant='rectangular' height={64} sx={{ borderRadius: 'md' }} />
      ) : showEmptyState ? (
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'neutral.outlinedBorder',
            borderRadius: 'md',
            bgcolor: 'background.level1'
          }}
        >
          <Layers size={32} style={{ opacity: 0.5 }} />
          <Typography level='title-md' sx={{ mt: 1.5, mb: 0.5, color: 'text.secondary' }}>
            {t(`cards.saveToDeck.${emptyCopy.title}`)}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 2 }}>
            {t(`cards.saveToDeck.${emptyCopy.body}`)}
          </Typography>
          <Button size='sm' variant='solid' color='primary' startDecorator={<Plus size={16} />} onClick={() => setIsCreatingDeck(true)}>
            {t('cards.saveToDeck.createNewDeck')}
          </Button>
        </Box>
      ) : (
        <FormControl>
          <FormLabel>{t('cards.saveToDeck.selectDeckLabel')}</FormLabel>
          <Select
            value={selectedDeckId}
            onChange={(_, val) => setSelectedDeckId(val)}
            placeholder={t('cards.saveToDeck.chooseDeckPlaceholder')}
            slotProps={{ button: { 'aria-label': t('cards.saveToDeck.selectDeckLabel') } }}
          >
            {decks.map((deck) => (
              <Option key={deck._id} value={deck._id}>
                {deck.name}
              </Option>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl>
        <FormLabel>{t('cards.saveToDeck.batchTagsLabel')}</FormLabel>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
          {t('cards.saveToDeck.tagsHelperText')}
        </Typography>

        {tagsLoading && (
          <Stack direction='row' gap={1} flexWrap='wrap'>
            {TAG_SKELETON_KEYS.map((i) => (
              <Skeleton key={i} variant='rectangular' width={64} height={26} sx={{ borderRadius: 'sm' }} />
            ))}
          </Stack>
        )}

        {tagsError && !tagsLoading && (
          <Alert color='warning' variant='soft' size='sm' sx={{ mb: 1 }}>
            {t('cards.saveToDeck.tagsLoadError')}
          </Alert>
        )}

        {!tagsLoading && availableTags.length > 0 && (
          <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mb: 1 }}>
            {availableTags.map(({ tag, count }) => (
              <Chip
                key={tag}
                size='sm'
                variant={selectedTags.includes(tag) ? 'solid' : 'soft'}
                color={selectedTags.includes(tag) ? 'primary' : 'neutral'}
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
                endDecorator={
                  <Typography level='body-xs' sx={{ color: 'inherit', opacity: 0.7 }}>
                    {count}
                  </Typography>
                }
                sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.outlinedBorder' } }}
              >
                {tag}
              </Chip>
            ))}
          </Stack>
        )}

        {!tagsLoading && !tagsError && availableTags.length === 0 && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', mb: 1 }}>
            {t('cards.saveToDeck.noExistingTags')}
          </Typography>
        )}

        {customTags.length > 0 && (
          <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mb: 1 }}>
            {customTags.map((tag) => (
              <Chip
                key={tag}
                size='sm'
                variant='soft'
                color='primary'
                endDecorator={<ChipDelete onDelete={() => removeCustomTag(tag)} aria-label={t('filters.remove.tag', { tag })} />}
              >
                {tag}
              </Chip>
            ))}
          </Stack>
        )}

        <Input
          size='sm'
          placeholder={t('cards.saveToDeck.addTagPlaceholder')}
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={handleTagDraftKeyDown}
          endDecorator={
            <IconButton size='sm' onClick={commitTagDraft} disabled={!tagDraft.trim()} aria-label={t('cards.saveToDeck.addTagAria')}>
              <Plus size={14} />
            </IconButton>
          }
        />
      </FormControl>

      {!showEmptyState && (
        <>
          <Divider>{t('cards.saveToDeck.orDivider')}</Divider>

          <Box sx={{ p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'md', bgcolor: 'background.level1' }}>
            {!isCreatingDeck ? (
              <Button variant='plain' startDecorator={<Plus />} onClick={() => setIsCreatingDeck(true)} fullWidth>
                {t('cards.saveToDeck.createNewDeck')}
              </Button>
            ) : (
              <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                <Input
                  placeholder={t('cards.saveToDeck.namePlaceholder')}
                  aria-label={t('cards.saveToDeck.namePlaceholder')}
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  fullWidth
                />
                <Button onClick={handleCreateDeck} loading={createLoading} disabled={!newDeckName.trim()}>
                  {t('cards.saveToDeck.createButton')}
                </Button>
                <Button variant='plain' color='neutral' onClick={() => setIsCreatingDeck(false)}>
                  {t('cards.saveToDeck.cancelButton')}
                </Button>
              </Stack>
            )}
          </Box>
        </>
      )}
    </Stack>
  )
}
