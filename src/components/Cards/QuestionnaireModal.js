import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  Button,
  Stack,
  Card,
  Divider,
  List,
  ListItem,
  Chip,
  AccordionGroup,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  ListItemButton,
  ListItemDecorator,
  ListDivider,
  Checkbox,
  FormControl,
  FormLabel,
  Select,
  Option,
  Input,
  Switch
} from '@mui/joy'
import { CheckCircle, AlertCircle, HelpCircle, ChevronDown, Circle, XCircle, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { decksService, cardsService } from '../../api/services'
import { useDeckData } from '../../hooks/useDeckData'

/**
 * Normalise one API question onto the shape this modal renders.
 * The backend guarantees `question` / `options` / `answer` / `explanation`,
 * but a partial or legacy payload must never render a bare empty option list.
 */
const getOptions = (question) =>
  Array.isArray(question?.options) ? question.options.filter((opt) => typeof opt === 'string' && opt.trim().length > 0) : []

export default function QuestionnaireModal({ questions = [], onCancel }) {
  const { t } = useTranslation()
  const [step, setStep] = useState('select_questions') // 'select_questions' | 'select_deck'
  // Store user selection for each question index: { 0: "Option A", 1: "Option C" }
  const [userAnswers, setUserAnswers] = useState({})
  const [selectedQuestions, setSelectedQuestions] = useState([]) // Indices of selected questions to save

  // Deck State
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingDecks, setLoadingDecks] = useState(false)
  const [error, setError] = useState(null)

  const { decks: cacheDecks, loading: hookDecksLoading, reload: reloadDecks } = useDeckData()

  const safeQuestions = Array.isArray(questions) ? questions : []

  // Hydrate the quiz-deck list from the shared deck cache. Without this the
  // "Save to deck" step renders an empty Select and saving is impossible.
  useEffect(() => {
    if (hookDecksLoading) {
      setLoadingDecks(true)
      return
    }
    setLoadingDecks(false)
    const quizDecks = (cacheDecks || []).filter((d) => d.deck_type === 'quiz')
    setDecks(quizDecks)
    setSelectedDeckId((current) => current || (quizDecks.length > 0 ? quizDecks[0]._id : ''))
  }, [cacheDecks, hookDecksLoading])

  const handleSelectOption = (questionIndex, option) => {
    // Prevent changing answer after selection (optional, but good for "quiz" mode)
    if (userAnswers[questionIndex]) return

    setUserAnswers((prev) => ({ ...prev, [questionIndex]: option }))
  }

  const toggleQuestionSelection = (idx) => {
    setSelectedQuestions((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]))
  }

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    try {
      setLoadingDecks(true)
      setError(null)
      const newDeck = await decksService.create({
        name: newDeckName,
        description: 'Created from Quiz',
        deck_type: 'quiz' // Set explicit type
      })
      setDecks([...decks, newDeck])
      setSelectedDeckId(newDeck._id)
      setNewDeckName('')
      setIsCreatingDeck(false)
      reloadDecks()
    } catch (err) {
      console.error('Error creating deck:', err)
      setError(t('aiMagic.questionnaireModal.createDeckError', "Couldn't create the deck. Please try again."))
    } finally {
      setLoadingDecks(false)
    }
  }

  const handleSaveToDeck = async () => {
    if (!selectedDeckId) return
    try {
      setSaving(true)
      setError(null)
      const questionsToSave = selectedQuestions.map((idx) => safeQuestions[idx])

      await Promise.all(
        questionsToSave.map((q) =>
          cardsService.create({
            title: q.question,
            content: q.explanation || t('aiMagic.questionnaireModal.noExplanation', 'No explanation provided.'),
            deck_id: selectedDeckId,
            tags: ['quiz'],
            card_type: 'quiz', // New Type
            options: getOptions(q),
            correct_answer: q.answer,
            explanation: q.explanation
          })
        )
      )
      onCancel()
    } catch (err) {
      console.error('Error saving quiz cards:', err)
      setError(t('aiMagic.questionnaireModal.saveError', "Couldn't save these questions. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  const isQuestionAnswered = (idx) => !!userAnswers[idx]

  return (
    <Modal open onClose={onCancel}>
      <ModalDialog
        layout='center'
        size='lg'
        sx={{
          maxWidth: 800,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          p: 3,
          borderRadius: 'xl',
          minWidth: 600
        }}
      >
        <ModalClose />
        <Typography level='h4' fontWeight='bold' sx={{ mb: 1 }}>
          {step === 'select_questions'
            ? t('aiMagic.questionnaireModal.title', 'Generated Questionnaire')
            : t('aiMagic.questionnaireModal.saveTitle', 'Save Quiz to Deck')}
        </Typography>
        <Typography level='body-sm' sx={{ mb: 3, color: 'text.secondary' }}>
          {step === 'select_questions'
            ? t('aiMagic.questionnaireModal.subtitle', 'Select questions to save.')
            : t('aiMagic.questionnaireModal.saveSubtitle', 'Choose a deck to store these interactive questions.')}
        </Typography>

        {error && (
          <Typography level='body-sm' startDecorator={<AlertCircle size={16} />} sx={{ mb: 2, color: 'danger.plainColor' }} role='alert'>
            {error}
          </Typography>
        )}

        {step === 'select_questions' && safeQuestions.length === 0 && (
          <Typography level='body-sm' sx={{ py: 4, textAlign: 'center', color: 'text.tertiary' }}>
            {t('aiMagic.questionnaireModal.emptyQuestions', 'No questions were generated. Try again with more content.')}
          </Typography>
        )}

        {step === 'select_questions' && safeQuestions.length > 0 && (
          <Stack spacing={3}>
            {safeQuestions.map((q, idx) => {
              const userAnswer = userAnswers[idx]
              const isAnswered = !!userAnswer
              const isCorrect = isAnswered && userAnswer === q.answer
              const isSelectedForSave = selectedQuestions.includes(idx)
              const options = getOptions(q)

              return (
                <Card
                  key={idx}
                  variant='outlined'
                  sx={{
                    p: 2,
                    boxShadow: 'sm',
                    opacity: isSelectedForSave ? 1 : 0.6,
                    transition: 'opacity 0.2s',
                    borderColor: isSelectedForSave ? 'primary.outlinedBorder' : 'neutral.outlinedBorder'
                  }}
                >
                  <Stack direction='row' gap={2} alignItems='center' sx={{ mb: 1.5, justifyContent: 'space-between' }}>
                    <Stack direction='row' gap={2} alignItems='center'>
                      <Chip size='sm' color={isAnswered ? (isCorrect ? 'success' : 'danger') : 'primary'} variant='solid'>
                        {idx + 1}
                      </Chip>
                      <Typography level='title-lg' sx={{ flexGrow: 1 }}>
                        {q.question}
                      </Typography>
                    </Stack>
                    <Switch
                      label={t('aiMagic.questionnaireModal.includeInDeck', 'Include in Deck')}
                      slotProps={{ input: { 'aria-label': t('aiMagic.questionnaireModal.includeInDeck', 'Include in Deck') } }}
                      variant='soft'
                      color='primary'
                      checked={isSelectedForSave}
                      onChange={() => toggleQuestionSelection(idx)}
                    />
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  {options.length === 0 ? (
                    <Typography level='body-sm' startDecorator={<AlertCircle size={14} />} sx={{ py: 1, color: 'text.tertiary' }}>
                      {t('aiMagic.questionnaireModal.emptyOptions', 'No answer options were generated for this question.')}
                    </Typography>
                  ) : (
                    <List size='sm' sx={{ gap: 1 }}>
                      {options.map((opt, i) => {
                        const isSelected = userAnswer === opt
                        const isTheCorrectAnswer = opt === q.answer

                        let color = 'neutral'
                        let variant = 'plain'
                        let icon = <Circle size={14} />

                        if (isAnswered) {
                          if (isTheCorrectAnswer) {
                            color = 'success'
                            variant = 'soft'
                            icon = <CheckCircle size={14} />
                          } else if (isSelected) {
                            color = 'danger'
                            variant = 'soft'
                            icon = <XCircle size={14} />
                          } else {
                            icon = <Circle size={14} style={{ opacity: 0.3 }} />
                          }
                        }

                        return (
                          <ListItem key={i}>
                            <ListItemButton
                              role={undefined}
                              selected={isSelected}
                              color={color}
                              variant={variant}
                              onClick={() => handleSelectOption(idx, opt)}
                              sx={{
                                borderRadius: 'sm',
                                border: isSelected || (isAnswered && isTheCorrectAnswer) ? '1px solid' : 'none'
                              }}
                            >
                              <ListItemDecorator>{icon}</ListItemDecorator>
                              {opt}
                            </ListItemButton>
                          </ListItem>
                        )
                      })}
                    </List>
                  )}

                  {isAnswered && q.explanation && (
                    <Box sx={{ mt: 2, animation: 'fadeIn 0.3s ease-in' }}>
                      <Typography
                        level='body-xs'
                        fontWeight='bold'
                        sx={{ mb: 0.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <HelpCircle size={14} /> {t('aiMagic.questionnaireModal.explanation', 'Explanation')}
                      </Typography>
                      <Typography
                        level='body-sm'
                        sx={{
                          bgcolor: 'background.level1',
                          p: 1.5,
                          borderRadius: 'md',
                          borderLeft: '3px solid',
                          borderColor: 'primary.solidBg'
                        }}
                      >
                        {q.explanation}
                      </Typography>
                    </Box>
                  )}
                </Card>
              )
            })}
          </Stack>
        )}

        {step === 'select_deck' && (
          <Stack spacing={3} sx={{ mt: 2, minHeight: 200, px: 2 }}>
            <FormControl>
              <FormLabel>{t('aiMagic.questionnaireModal.selectDeck', 'Select Deck')}</FormLabel>
              <Select
                value={selectedDeckId}
                onChange={(_, val) => setSelectedDeckId(val)}
                disabled={loadingDecks}
                placeholder={
                  loadingDecks
                    ? t('aiMagic.questionnaireModal.loadingDecks', 'Loading decks...')
                    : t('aiMagic.questionnaireModal.selectDeckPlaceholder', 'Choose a deck...')
                }
                slotProps={{ button: { 'aria-label': t('aiMagic.questionnaireModal.selectDeck', 'Select Deck') } }}
              >
                {decks.map((deck) => (
                  <Option key={deck._id} value={deck._id}>
                    {deck.name}
                  </Option>
                ))}
              </Select>
              {!loadingDecks && decks.length === 0 && (
                <Typography level='body-xs' sx={{ mt: 1, color: 'text.tertiary' }}>
                  {t('aiMagic.questionnaireModal.noQuizDecks', 'No quiz decks yet — create one below.')}
                </Typography>
              )}
            </FormControl>

            <Divider>{t('aiMagic.questionnaireModal.or', 'OR')}</Divider>

            <Box
              sx={{ p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'md', bgcolor: 'background.level1' }}
            >
              {!isCreatingDeck ? (
                <Button
                  variant='plain'
                  startDecorator={<Plus />}
                  onClick={() => setIsCreatingDeck(true)}
                  fullWidth
                  aria-label={t('aiMagic.questionnaireModal.createDeck', 'Create New Deck')}
                >
                  {t('aiMagic.questionnaireModal.createDeck', 'Create New Deck')}
                </Button>
              ) : (
                <Stack spacing={2} direction='row'>
                  <Input
                    placeholder={t('aiMagic.questionnaireModal.newDeckName', 'New Deck Name')}
                    aria-label={t('aiMagic.questionnaireModal.newDeckName', 'New Deck Name')}
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    fullWidth
                  />
                  <Button onClick={handleCreateDeck} loading={loadingDecks} disabled={!newDeckName.trim()}>
                    {t('aiMagic.questionnaireModal.create', 'Create')}
                  </Button>
                  <Button variant='plain' color='neutral' onClick={() => setIsCreatingDeck(false)}>
                    {t('aiMagic.questionnaireModal.cancel', 'Cancel')}
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant='soft' color='neutral' onClick={onCancel}>
            {t('aiMagic.questionnaireModal.cancel', 'Cancel')}
          </Button>
          {step === 'select_questions' ? (
            <Button onClick={() => setStep('select_deck')} disabled={selectedQuestions.length === 0}>
              {t('aiMagic.questionnaireModal.proceed', 'Proceed to Save ({{n}})', { n: selectedQuestions.length })}
            </Button>
          ) : (
            <Button color='success' onClick={handleSaveToDeck} loading={saving} disabled={!selectedDeckId}>
              {t('aiMagic.questionnaireModal.confirmSave', 'Confirm & Save')}
            </Button>
          )}
        </Box>
      </ModalDialog>
    </Modal>
  )
}
