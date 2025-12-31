import React from 'react'
import FlashcardModal from './FlashcardModal'
import QuizCardModal from './QuizCardModal'
import VisualCardModal from './VisualCardModal'

export default function CreateCardModal({ open, onClose, onCardSaved, decks = [], card = null }) {
  // Determine card type
  const cardType = card?.card_type || 'flashcard'

  // Show the appropriate modal based on card type
  if (cardType === 'quiz') {
    return <QuizCardModal open={open} onClose={onClose} onSaved={onCardSaved} decks={decks} initialData={card} />
  }

  if (cardType === 'visual') {
    return <VisualCardModal open={open} onClose={onClose} onSaved={onCardSaved} decks={decks} initialData={card} />
  }

  // Default to flashcard
  return <FlashcardModal open={open} onClose={onClose} onSaved={onCardSaved} decks={decks} initialData={card} />
}
