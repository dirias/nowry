// src/plugins/RegisterListPlugin.js
import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { registerList } from '@lexical/list'

export default function RegisterListPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return registerList(editor)
  }, [editor])

  return null
}
