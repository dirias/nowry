import React, { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { Box, Typography } from '@mui/joy'

function countWordsAndCharacters(text) {
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const characters = trimmed.length
  return { words, characters }
}

export default function WordCountPlugin() {
  const [editor] = useLexicalComposerContext()
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    const updateCounts = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const textContent = root.getTextContent()
        const { words, characters } = countWordsAndCharacters(textContent)
        setWordCount(words)
        setCharCount(characters)
      })
    }

    // Initial count
    updateCounts()

    // Register listener for all updates
    const unregister = editor.registerUpdateListener(() => {
      updateCounts()
    })

    return unregister
  }, [editor])

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
