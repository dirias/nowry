import { useEffect, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND, DROP_COMMAND, $getSelection, $getRoot } from 'lexical'
import { $createPageNode, $isPageNode } from '../../../nodes/PageNode'
import imageCompression from 'browser-image-compression'
import { $createImageNode } from '../../../nodes/ImageNode'
import { imageService } from '../../../api/services/image.service'

const MAX_UPLOAD_MB = 8
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Image Upload Plugin
 * Handles drag & drop and paste image upload
 */
export default function ImageUploadPlugin({ bookId, onUploadStart, onUploadComplete, onUploadError }) {
  const [editor] = useLexicalComposerContext()

  const handleImageUpload = useCallback(
    async (file) => {
      try {
        if (!file) {
          if (onUploadError) onUploadError('No file provided')
          return
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          if (onUploadError) onUploadError('Unsupported file type')
          return
        }

        const fileSizeMb = file.size / 1024 / 1024
        if (fileSizeMb > MAX_UPLOAD_MB) {
          if (onUploadError) onUploadError(`Image too large (${fileSizeMb.toFixed(2)} MB). Max ${MAX_UPLOAD_MB} MB.`)
          return
        }

        // Notify upload start
        if (onUploadStart) {
          onUploadStart(file.name)
        }

        // Compress image before upload
        console.log('Original size:', file.size / 1024 / 1024, 'MB')
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true
        }
        const compressedBlob = await imageCompression(file, options)

        // Create a new File object to preserve the original name and type
        const compressedFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type,
          lastModified: Date.now()
        })

        console.log('Compressed size:', compressedFile.size / 1024 / 1024, 'MB')

        const uploadWithRetry = async (attempt = 0) => {
          try {
            return await imageService.upload(compressedFile, bookId, (percent) => {
              console.log(`Upload progress: ${percent}%`)
            })
          } catch (err) {
            const shouldRetry = attempt < 1
            if (shouldRetry) {
              const backoff = 500 * (attempt + 1)
              await new Promise((res) => setTimeout(res, backoff))
              return uploadWithRetry(attempt + 1)
            }
            throw err
          }
        }

        // Upload to backend with progress tracking and retry
        const result = await uploadWithRetry()

        // Calculate smart display dimensions based on the natural dimensions
        // This prevents huge images from breaking pagination or layout
        const naturalWidth = result.width
        const naturalHeight = result.height
        const MAX_WIDTH = 500
        const MAX_HEIGHT = 400
        const MAX_SQUARE = 300

        let displayWidth = naturalWidth
        let displayHeight = naturalHeight
        const aspectRatio = naturalWidth / naturalHeight

        // 1. Resize based on Max Width
        if (displayWidth > MAX_WIDTH) {
          displayWidth = MAX_WIDTH
          displayHeight = Math.round(displayWidth / aspectRatio)
        }

        // 2. Resize based on Max Height
        if (displayHeight > MAX_HEIGHT) {
          displayHeight = MAX_HEIGHT
          displayWidth = Math.round(displayHeight * aspectRatio)
        }

        // 3. Special case for Square-ish images
        if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
          if (displayWidth > MAX_SQUARE) {
            displayWidth = MAX_SQUARE
            displayHeight = MAX_SQUARE
          }
        }

        // Insert image node into editor
        editor.update(() => {
          const imageNode = $createImageNode({
            src: result.url,
            altText: file.name,
            width: displayWidth,
            height: displayHeight
          })

          const root = $getRoot()
          const selection = $getSelection()

          // Helper: find the nearest PageNode for the current selection anchor
          const findPageForSelection = () => {
            if (!selection) return null
            let node = selection.anchor.getNode()
            while (node) {
              if ($isPageNode(node)) return node
              node = node.getParent()
            }
            return null
          }

          const pageFromSelection = findPageForSelection()

          if (selection && pageFromSelection) {
            // Normal path: selection is inside a page, so just insert there
            selection.insertNodes([imageNode])
            return
          }

          // Fallback: ensure we always insert inside a page, even if there is no selection
          let targetPage = root.getChildren().find($isPageNode) || null
          if (!targetPage) {
            targetPage = $createPageNode()
            root.append(targetPage)
          } else if (root.getChildren().filter($isPageNode).length > 0) {
            // Prefer the last page if there are multiple
            const pages = root.getChildren().filter($isPageNode)
            targetPage = pages[pages.length - 1]
          }

          const lastChild = targetPage.getLastChild()
          if (lastChild) {
            lastChild.insertAfter(imageNode)
          } else {
            targetPage.append(imageNode)
          }
          targetPage.selectEnd()
        })

        // Notify success
        if (onUploadComplete) {
          onUploadComplete(result)
        }
      } catch (error) {
        console.error('Image upload failed:', error)
        if (onUploadError) {
          onUploadError(error.response?.data?.detail || 'Upload failed')
        }
      }
    },
    [editor, bookId]
  )

  useEffect(() => {
    // Handle paste events
    // Handle paste events
    const removePasteListener = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items
        let hasImage = false

        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            hasImage = true
            const file = item.getAsFile()
            if (file) {
              event.preventDefault()
              // Fire and forget upload (async)
              handleImageUpload(file).catch(console.error)
              return true
            }
          }
        }
        // Return false intentionally to let other handlers (text) process the event
        return false
      },
      COMMAND_PRIORITY_LOW
    )

    // Handle drop events
    // Handle drop events
    const removeDropListener = editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        const files = event.dataTransfer?.files
        if (files && files.length > 0) {
          const file = files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            handleImageUpload(file).catch(console.error)
            return true
          }
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

  // Public method for toolbar button
  const triggerUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (file) {
        await handleImageUpload(file)
      }
    }
    input.click()
  }, [handleImageUpload])

  // Expose triggerUpload method
  useEffect(() => {
    editor.triggerImageUpload = triggerUpload
  }, [editor, triggerUpload])

  return null
}
