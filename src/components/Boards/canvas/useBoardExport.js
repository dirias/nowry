import { useCallback, useRef } from 'react'
import { toJsonCanvas, toOutline } from '@nowry/core/domain/board'
import { EXPORT_FORMATS, download, downloadText, fileName, renderImage } from '../exportBoard'

/** Two frames: the cleared selection is drawn before the picture is taken. */
const settle = () =>
  new Promise((resolve) => {
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16)
    raf(() => raf(resolve))
  })

/**
 * Export (BOARD-009, PRD D9): the selection when there is one, else the whole
 * board, as a PNG at 2×, an SVG, a Markdown outline or a JSON Canvas file.
 * An image is the board as drawn, light or dark as on screen; the selection's
 * ring, its bar and the "+" are cleared while the picture is taken and put
 * back after.
 *
 * @param {object} options
 * @param {object} options.wrapperRef the canvas container
 * @param {object} options.boardRef the board as it is now
 * @param {object} options.flow the library's instance (`getNodesBounds`)
 * @param {Function} options.getSelection `{ ids, edgeIds }` still on the board
 * @param {Function} options.setSelection `({ ids, edgeIds })` puts a selection back
 * @param {Function} options.itemTitle an item's words
 * @param {Function} options.onStatus `({ text })` a status line
 * @param {Function} options.onError `(text)` the page's error line
 * @param {Function} options.t
 */
export default function useBoardExport(options) {
  const latest = useRef(options)
  latest.current = options

  const exportImage = useCallback(async (format, chosen, name) => {
    const { wrapperRef, boardRef, flow, getSelection, setSelection, onError, t } = latest.current
    const wrapper = wrapperRef.current
    const element = wrapper?.querySelector('.react-flow__viewport')
    if (!element) return false
    const board = boardRef.current
    const ids = chosen ?? board.nodes.map((n) => n.id)
    const keep = chosen
      ? {
          nodeIds: new Set(chosen),
          edgeIds: new Set(board.links.filter((l) => chosen.includes(l.from) && chosen.includes(l.to)).map((l) => l.id))
        }
      : null
    const before = getSelection()
    const quiet = before.ids.length > 0 || before.edgeIds.length > 0
    if (quiet) {
      setSelection({ ids: [], edgeIds: [] })
      await settle()
    }
    try {
      const background = wrapper.ownerDocument.defaultView.getComputedStyle(wrapper).backgroundColor
      const blob = await renderImage({ element, bounds: flow.getNodesBounds(ids), format, background, keep })
      download(blob, name)
      return true
    } catch {
      onError?.(t('boards.inOut.exportFailed'))
      return false
    } finally {
      if (quiet) setSelection(before)
    }
  }, [])

  /** @param {'png'|'svg'|'outline'|'canvas'} format */
  return useCallback(
    async (format) => {
      const { boardRef, getSelection, itemTitle, onStatus, t } = latest.current
      const board = boardRef.current
      const spec = EXPORT_FORMATS[format]
      if (!board || !spec) return false
      if (!board.nodes.length) {
        onStatus?.({ text: t('boards.inOut.exportEmpty') })
        return false
      }
      const { ids } = getSelection()
      const chosen = ids.length ? ids : null
      const name = fileName(board.name || t('boards.untitled'), spec.extension)
      if (format === 'outline') {
        downloadText(toOutline(board, { selection: chosen, untitled: t('boards.frame.untitled'), itemTitle }), name, format)
        return true
      }
      if (format === 'canvas') {
        downloadText(toJsonCanvas(board, { selection: chosen, itemTitle }), name, format)
        return true
      }
      return exportImage(format, chosen, name)
    },
    [exportImage]
  )
}
