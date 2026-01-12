import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getNodeByKey, $isElementNode } from 'lexical'
import { $createPageNode, $isPageNode, PageNode } from '../../../nodes/PageNode'

const PAGE_HEIGHT_PX = 1123 // A4 at 96 DPI
const OVERFLOW_BUFFER = 8 // px – move content as soon as it crosses the boundary
const UNDERFLOW_BUFFER = 96 // px – keep margin to avoid ping-pong
const MOVE_COOLDOWN_MS = 600 // minimum time before the same node can be moved back
const MAX_CHILD_RATIO = 0.8 // do not move if child is too large for the page
const PAGE_PADDING = 96 // matches CSS page padding

export default function ContinuousPaginationPlugin({ pageHeight = 1123 }) {
  const [editor] = useLexicalComposerContext()
  const isProcessing = useRef(false)
  const debounceTimer = useRef(null)
  const lastMoveTracker = useRef(new Map()) // Track recent moves to prevent ping-pong
  const iterationCount = useRef(0)
  const MAX_ITERATIONS = 50 // Prevent infinite loops
  const isPaginating = useRef(false) // Track if we are actively paginating
  const moveTimestamps = useRef(new Map()) // childKey -> timestamp of last move
  const lastHeightsRef = useRef([])
  const frameRef = useRef(null)

  // Trigger immediate repagination when pageHeight changes
  useEffect(() => {
    const triggerRepagination = () => {
      iterationCount.current = 0 // Reset counter on manual trigger
      lastMoveTracker.current.clear()
      isPaginating.current = true // Force fast pagination match

      editor.update(() => {
        const root = $getRoot()
        const pages = root.getChildren().filter($isPageNode)
        pages.forEach((page) => {
          page.markDirty()
        })
      })
    }

    const timer1 = setTimeout(triggerRepagination, 50)
    const timer2 = setTimeout(triggerRepagination, 150)
    const timer3 = setTimeout(triggerRepagination, 300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [editor, pageHeight])

  useEffect(() => {
    if (!editor.hasNodes([PageNode])) {
      throw new Error('ContinuousPaginationPlugin: PageNode not registered on editor')
    }

    return editor.registerUpdateListener(() => {
      const schedule = () => {
        if (frameRef.current) return
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null
          runPagination()
        })
      }

      const runPagination = () => {
        if (isProcessing.current) return

        const rootElement = editor.getRootElement()
        if (!rootElement) {
          console.warn('ContinuousPaginationPlugin: rootElement is null, skipping pagination')
          return
        }

        if (iterationCount.current >= MAX_ITERATIONS) {
          console.warn('ContinuousPaginationPlugin: Max iterations reached, stopping pagination to prevent freeze')
          iterationCount.current = 0
          lastMoveTracker.current.clear()
          isPaginating.current = false
          return
        }

        editor.update(() => {
          isProcessing.current = true
          try {
            const root = $getRoot()
            const pages = root.getChildren().filter($isPageNode)
            if (pages.length === 0) return

            const heightSnapshot = pages.map((p) => {
              const el = editor.getElementByKey(p.getKey())
              return { key: p.getKey(), h: el ? el.scrollHeight : 0 }
            })
            const unchanged =
              !isPaginating.current &&
              heightSnapshot.length === lastHeightsRef.current.length &&
              heightSnapshot.every((h, idx) => h.h === lastHeightsRef.current[idx]?.h && h.key === lastHeightsRef.current[idx]?.key)
            if (unchanged) {
              return
            }

            iterationCount.current++
            let madeChange = false

            for (let i = 0; i < pages.length; i++) {
              const page = pages[i]
              const pageKey = page.getKey()
              const pageElement = editor.getElementByKey(pageKey)
              if (!pageElement) continue

              const pageHeightDelta = pageElement.scrollHeight - pageHeight

              if (pageHeightDelta > OVERFLOW_BUFFER) {
                const children = page.getChildren()
                if (children.length === 0) continue

                let overflowChild = null
                for (let c = 0; c < children.length; c++) {
                  const childNode = children[c]
                  const childKey = childNode.getKey()
                  const childEl = editor.getElementByKey(childKey)
                  if (!childEl) continue
                  const childBottom = childEl.offsetTop + childEl.offsetHeight
                  const overflows = childBottom > pageHeight - PAGE_PADDING + OVERFLOW_BUFFER
                  if (overflows) {
                    overflowChild = childNode
                    break
                  }
                }

                const targetChild = overflowChild || children[children.length - 1]
                const childKey = targetChild.getKey()
                const lastMoveTs = moveTimestamps.current.get(childKey) || 0
                if (Date.now() - lastMoveTs < MOVE_COOLDOWN_MS) {
                  continue
                }

                const moveSignature = `${childKey}-forward`
                const reverseSignature = `${childKey}-backward`
                if (lastMoveTracker.current.get(reverseSignature) === i + 1) {
                  console.warn('ContinuousPaginationPlugin: Detected potential ping-pong, skipping element')
                  continue
                }

                const childElement = editor.getElementByKey(childKey)
                if (!childElement) continue

                const childHeight = childElement.offsetHeight
                const pageFitLimit = pageHeight * MAX_CHILD_RATIO
                if (childHeight > pageFitLimit) {
                  console.warn('ContinuousPaginationPlugin: Element too large for page, allowing overflow')
                  continue
                }

                let nextPage = i + 1 < pages.length ? pages[i + 1] : null
                if (!nextPage) {
                  nextPage = $createPageNode()
                  root.append(nextPage)
                }

                const firstChild = nextPage.getFirstChild()
                if (firstChild) {
                  firstChild.insertBefore(targetChild)
                } else {
                  nextPage.append(targetChild)
                }

                lastMoveTracker.current.set(moveSignature, i + 1)
                moveTimestamps.current.set(childKey, Date.now())
                madeChange = true
                break
              } else if (i + 1 < pages.length) {
                const nextPage = pages[i + 1]
                const nextChildren = nextPage.getChildren()

                if (nextChildren.length > 0) {
                  const firstChild = nextChildren[0]
                  const childKey = firstChild.getKey()
                  const childElement = editor.getElementByKey(childKey)

                  if (childElement) {
                    const pageChildren = pageElement.children
                    let usedHeight = PAGE_PADDING

                    if (pageChildren.length > 0) {
                      const lastPageChild = pageChildren[pageChildren.length - 1]
                      const pageRect = pageElement.getBoundingClientRect()
                      const lastChildRect = lastPageChild.getBoundingClientRect()
                      usedHeight = lastChildRect.bottom - pageRect.top
                    }

                    const childHeight = childElement.offsetHeight
                    const availableHeight = pageHeight - PAGE_PADDING - 20

                    const moveSignature = `${childKey}-backward`
                    const reverseSignature = `${childKey}-forward`

                    if (lastMoveTracker.current.get(reverseSignature) === i) {
                      continue
                    }

                    const freeSpace = availableHeight - usedHeight - childHeight
                    const lastMoveTs = moveTimestamps.current.get(childKey) || 0
                    if (freeSpace > UNDERFLOW_BUFFER && Date.now() - lastMoveTs >= MOVE_COOLDOWN_MS) {
                      page.append(firstChild)
                      moveTimestamps.current.set(childKey, Date.now())
                      lastMoveTracker.current.set(moveSignature, i)
                      madeChange = true
                      break
                    }
                  }
                } else if (pages.length > 1) {
                  nextPage.remove()
                  madeChange = true
                  break
                }
              }
            }

            isPaginating.current = madeChange

            if (!madeChange) {
              iterationCount.current = 0
              if (lastMoveTracker.current.size > 100) {
                lastMoveTracker.current.clear()
              }
            }

            lastHeightsRef.current = heightSnapshot
          } finally {
            isProcessing.current = false
          }
        })
      }

      schedule()
    })
  }, [editor, pageHeight])

  return null
}
