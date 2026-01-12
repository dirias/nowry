import React from 'react'
import FlashcardModal from './FlashcardModal'
import QuizCardModal from './QuizCardModal'
import VisualCardModal from './VisualCardModal'

export default function CreateCardModal({ open, onClose, onCardSaved, decks = [], card = null }) {
  // Determine card type
  const cardType = card?.card_type || 'flashcard'

  // Pass initialData if:
  // 1. Card has a valid ID (editing existing card), OR
  // 2. Card has a deck_id preset (creating new card in a specific deck)
  const initialData = card && (card._id || card.id || card.deck_id) ? card : null

  // Show the appropriate modal based on card type
  if (cardType === 'quiz') {
    return <QuizCardModal open={open} onClose={onClose} onSaved={onCardSaved} decks={decks} initialData={initialData} />
  }

  if (cardType === 'visual') {
    return <VisualCardModal open={open} onClose={onClose} onSaved={onCardSaved} decks={decks} initialData={initialData} />
  }

  // Default to flashcard
  return <FlashcardModal open={open} onClose={onClose} onSaved={onCardSaved} decks={decks} initialData={initialData} />
}
