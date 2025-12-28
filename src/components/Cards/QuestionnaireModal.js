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
import { decksService, cardsService } from '../../api/services'

export default function QuestionnaireModal({ questions = [], onCancel }) {
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

  const loadDecks = async () => {
    try {
      setLoadingDecks(true)
      const data = await decksService.getAll()
      // Filter for QUIZ decks
      const quizDecks = data.filter((d) => d.deck_type === 'quiz')
      setDecks(quizDecks)
      if (quizDecks.length > 0) setSelectedDeckId(quizDecks[0]._id)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDecks(false)
    }
  }

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
      const newDeck = await decksService.create({
        name: newDeckName,
        description: 'Created from Quiz',
        deck_type: 'quiz' // Set explicit type
      })
      setDecks([...decks, newDeck])
      setSelectedDeckId(newDeck._id)
      setNewDeckName('')
      setIsCreatingDeck(false)
    } catch (error) {
      console.error('Error creating deck:', error)
    } finally {
      setLoadingDecks(false)
    }
  }

  const handleSaveToDeck = async () => {
    if (!selectedDeckId) return
    try {
      setSaving(true)
      const questionsToSave = selectedQuestions.map((idx) => questions[idx])

      await Promise.all(
        questionsToSave.map((q) =>
          cardsService.create({
            title: q.question,
            content: q.explanation || 'No explanation provided.', // Fallback content
            deck_id: selectedDeckId,
            tags: ['quiz'],
            card_type: 'quiz', // New Type
            options: q.options,
            correct_answer: q.answer,
            explanation: q.explanation
          })
        )
      )
      onCancel()
    } catch (error) {
      console.error('Error saving quiz cards:', error)
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
          {step === 'select_questions' ? 'Generated Questionnaire' : 'Save Quiz to Deck'}
        </Typography>
        <Typography level='body-sm' color='neutral' sx={{ mb: 3 }}>
          {step === 'select_questions' ? 'Select questions to save.' : 'Choose a deck to store these interactive questions.'}
        </Typography>

        {step === 'select_questions' && (
          <Stack spacing={3}>
            {questions.map((q, idx) => {
              const userAnswer = userAnswers[idx]
              const isAnswered = !!userAnswer
              const isCorrect = isAnswered && userAnswer === q.answer
              const isSelectedForSave = selectedQuestions.includes(idx)

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
                      label='Include in Deck'
                      variant='soft'
                      color='primary'
                      checked={isSelectedForSave}
                      onChange={() => toggleQuestionSelection(idx)}
                    />
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  <List size='sm' sx={{ gap: 1 }}>
                    {q.options?.map((opt, i) => {
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

                  {isAnswered && q.explanation && (
                    <Box sx={{ mt: 2, animation: 'fadeIn 0.3s ease-in' }}>
                      <Typography
                        level='body-xs'
                        fontWeight='bold'
                        sx={{ mb: 0.5, color: 'neutral.500', display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <HelpCircle size={14} /> Explanation
                      </Typography>
                      <Typography
                        level='body-sm'
                        sx={{
                          bgcolor: 'background.level1',
                          p: 1.5,
                          borderRadius: 'md',
                          borderLeft: '3px solid',
                          borderColor: 'primary.500'
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
              <FormLabel>Select Deck</FormLabel>
              <Select value={selectedDeckId} onChange={(_, val) => setSelectedDeckId(val)} placeholder='Choose a deck...'>
                {decks.map((deck) => (
                  <Option key={deck._id} value={deck._id}>
                    {deck.name}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <Divider>OR</Divider>

            <Box
              sx={{ p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'md', bgcolor: 'background.level1' }}
            >
              {!isCreatingDeck ? (
                <Button variant='plain' startDecorator={<Plus />} onClick={() => setIsCreatingDeck(true)} fullWidth>
                  Create New Deck
                </Button>
              ) : (
                <Stack spacing={2} direction='row'>
                  <Input placeholder='New Deck Name' value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} fullWidth />
                  <Button onClick={handleCreateDeck} loading={loadingDecks}>
                    Create
                  </Button>
                  <Button variant='plain' color='neutral' onClick={() => setIsCreatingDeck(false)}>
                    Cancel
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant='soft' color='neutral' onClick={onCancel}>
            Cancel
          </Button>
          {step === 'select_questions' ? (
            <Button onClick={() => setStep('select_deck')} disabled={selectedQuestions.length === 0}>
              Proceed to Save ({selectedQuestions.length})
            </Button>
          ) : (
            <Button color='success' onClick={handleSaveToDeck} loading={saving} disabled={!selectedDeckId}>
              Confirm & Save
            </Button>
          )}
        </Box>
      </ModalDialog>
    </Modal>
  )
}
