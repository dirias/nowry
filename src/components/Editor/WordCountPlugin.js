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
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const textContent = root.getTextContent()
        const { words, characters } = countWordsAndCharacters(textContent)
        setWordCount(words)
        setCharCount(characters)
      })
    })
  }, [editor])

  return (
    <Box sx={{ mt: 2, textAlign: 'right', color: 'text.tertiary' }}>
      <Typography level='body-sm'>
        Palabras: {wordCount} | Caracteres: {charCount}
      </Typography>
    </Box>
  )
}
