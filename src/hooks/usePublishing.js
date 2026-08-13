import { useState } from 'react'
import { publicContentService } from '../api/services'
import { useTranslation } from 'react-i18next'

export function usePublishing() {
  const { t } = useTranslation()
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const clearMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  const publishBook = async (bookId, metadata = {}) => {
    setIsPublishing(true)
    clearMessages()
    try {
      const response = await publicContentService.publishBook(bookId, metadata)
      setSuccessMessage(t('public.publishSuccess', { defaultValue: '✅ Published successfully!' }))
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to publish'
      setError(errorMessage)
      throw err
    } finally {
      setIsPublishing(false)
    }
  }

  const unpublishBook = async (bookId) => {
    setIsPublishing(true)
    clearMessages()
    try {
      const response = await publicContentService.unpublishBook(bookId)
      setSuccessMessage(t('public.unpublishSuccess', { defaultValue: '✅ Unpublished successfully!' }))
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to unpublish'
      setError(errorMessage)
      throw err
    } finally {
      setIsPublishing(false)
    }
  }

  const publishDeck = async (deckId, metadata = {}) => {
    setIsPublishing(true)
    clearMessages()
    try {
      const response = await publicContentService.publishDeck(deckId, metadata)
      setSuccessMessage(t('public.publishSuccess', { defaultValue: '✅ Published successfully!' }))
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to publish'
      setError(errorMessage)
      throw err
    } finally {
      setIsPublishing(false)
    }
  }

  const unpublishDeck = async (deckId) => {
    setIsPublishing(true)
    clearMessages()
    try {
      const response = await publicContentService.unpublishDeck(deckId)
      setSuccessMessage(t('public.unpublishSuccess', { defaultValue: '✅ Unpublished successfully!' }))
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to unpublish'
      setError(errorMessage)
      throw err
    } finally {
      setIsPublishing(false)
    }
  }

  return {
    publishBook,
    unpublishBook,
    publishDeck,
    unpublishDeck,
    isPublishing,
    error,
    successMessage,
    clearMessages
  }
}
