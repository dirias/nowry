import { useEffect, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND, DROP_COMMAND, $getSelection, $getRoot } from 'lexical'
import imageCompression from 'browser-image-compression'
import { useTranslation } from 'react-i18next'
import { $createImageNode } from '../../../nodes/ImageNode'
import { imageService } from '@nowry/core/api/services/image.service'
import { ALLOWED_TYPES, COMPRESSION, displaySize, failureKeyFor, refusalFor } from './imageUploadRules'

/**
 * Image upload — toolbar, paste and drop (docs/prd-editor-media.md FR-002,
 * ADR-062 point 4).
 *
 * The browser shrinks the picture, the API stores it under the document, and
 * the image node is inserted only once storage has answered: the document
 * never holds a placeholder. While that runs, the editor shows the upload
 * through `onUploadStart` / `onUploadProgress`, and a refusal reaches the
 * writer through `onUploadError` as a sentence in their language.
 */
export default function ImageUploadPlugin({ bookId, onUploadStart, onUploadProgress, onUploadComplete, onUploadError }) {
  const [editor] = useLexicalComposerContext()
  const { t } = useTranslation()

  const refuse = useCallback(
    ({ key, values, limit }) => {
      if (onUploadError) onUploadError(t(`books.editor.images.${key}`, values), { limit: !!limit })
    },
    [onUploadError, t]
  )

  const handleImageUpload = useCallback(
    async (file) => {
      const refusal = refusalFor(file, bookId)
      if (refusal) {
        refuse(refusal)
        return
      }

      if (onUploadStart) onUploadStart(file.name)
      try {
        const compressedBlob = await imageCompression(file, COMPRESSION)
        const compressedFile = new File([compressedBlob], file.name, { type: compressedBlob.type, lastModified: Date.now() })

        const uploadWithRetry = async (attempt = 0) => {
          try {
            return await imageService.upload(compressedFile, bookId, (percent) => {
              if (onUploadProgress) onUploadProgress(percent)
            })
          } catch (err) {
            // One retry covers a dropped connection; a refusal is final.
            const status = err?.response?.status
            if (attempt < 1 && (!status || status >= 500)) {
              await new Promise((resolve) => setTimeout(resolve, 500))
              return uploadWithRetry(attempt + 1)
            }
            throw err
          }
        }

        const result = await uploadWithRetry()
        const { width, height } = displaySize(result.width, result.height)

        editor.update(() => {
          const imageNode = $createImageNode({ src: result.url, altText: file.name, width, height })
          const root = $getRoot()
          const selection = $getSelection()
          if (selection) {
            selection.insertNodes([imageNode])
            return
          }
          const lastChild = root.getLastChild()
          if (lastChild) lastChild.insertAfter(imageNode)
          else root.append(imageNode)
        })

        if (onUploadComplete) onUploadComplete(result)
      } catch (error) {
        refuse(failureKeyFor(error, file.size / 1024 / 1024))
      }
    },
    [editor, bookId, onUploadStart, onUploadProgress, onUploadComplete, refuse]
  )

  useEffect(() => {
    const removePasteListener = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items || []
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile()
            if (file) {
              event.preventDefault()
              handleImageUpload(file)
              return true
            }
          }
        }
        // Text pastes belong to the other handlers.
        return false
      },
      COMMAND_PRIORITY_LOW
    )

    const removeDropListener = editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        const files = event.dataTransfer?.files
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
          event.preventDefault()
          handleImageUpload(files[0])
          return true
        }
        return false
      },
      COMMAND_PRIORITY_LOW
    )

    return () => {
      removePasteListener()
      removeDropListener()
    }
  }, [editor, handleImageUpload])

  // The toolbar's Insert image key opens the file picker through this.
  const triggerUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ALLOWED_TYPES.join(',')
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) handleImageUpload(file)
    }
    input.click()
  }, [handleImageUpload])

  useEffect(() => {
    editor.triggerImageUpload = triggerUpload
  }, [editor, triggerUpload])

  return null
}
