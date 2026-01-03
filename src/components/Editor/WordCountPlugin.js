import React, { useEffect, useState, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { Box, Typography } from '@mui/joy'

export default function WordCountPlugin({ onUpdate }) {
  const [editor] = useLexicalComposerContext()
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const lastCountsRef = useRef({ words: 0, characters: 0 })

  useEffect(() => {
    const updateCounts = (editorState) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()

        const words = text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0)
        const newWordCount = words.length
        const newCharCount = text.length

        // Only update if values actually changed
        const lastCounts = lastCountsRef.current
        if (newWordCount !== lastCounts.words || newCharCount !== lastCounts.characters) {
          // Update ref immediately to prevent re-entry
          lastCountsRef.current = { words: newWordCount, characters: newCharCount }

          // Update state
          setWordCount(newWordCount)
          setCharCount(newCharCount)

          // Call optional callback
          if (onUpdate) {
            onUpdate({ words: newWordCount, characters: newCharCount })
          }
        }
      })
    }

    // Initial count
    updateCounts(editor.getEditorState())

    // Register listener
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      updateCounts(editorState)
    })

    return unregister
  }, [editor]) // Only editor in deps, not onUpdate or state

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 12,
        right: 24,
        px: 2,
        py: 1,
        fontSize: 'sm',
        color: 'text.secondary',
        bgcolor: 'background.level2',
        borderRadius: 'md',
        boxShadow: 'sm',
        zIndex: 1000
      }}
    >
      <Typography level='body-sm'>
        Words: {wordCount} | Characters: {charCount}
      </Typography>
    </Box>
  )
}
