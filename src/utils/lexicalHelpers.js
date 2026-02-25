/**
 * Lexical Content Utilities
 * Shared functions for parsing and extracting data from Lexical editor JSON
 */

/**
 * Extract table of contents from Lexical JSON content
 * @param {string|object} content - Lexical editor state (JSON string or object)
 * @returns {Array} Array of heading objects with { id, text, level, tag }
 */
export const extractTableOfContents = (content) => {
  try {
    // Parse content if it's a string
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content

    if (!parsedContent?.root?.children) {
      return []
    }

    const headings = []
    let headingCounter = 0

    const extractHeadings = (nodes) => {
      nodes.forEach((node) => {
        if (node.type === 'heading') {
          const text = node.children?.map((child) => child.text || '').join('') || 'Untitled'
          const level = parseInt(node.tag?.replace('h', '') || '1')
          headingCounter++

          headings.push({
            id: `heading-${headingCounter}`,
            text: text.trim(),
            level,
            tag: node.tag,
            indent: level === 1 ? 0 : level === 2 ? 1 : 2
          })
        }

        // Recursively check children
        if (node.children) {
          extractHeadings(node.children)
        }
      })
    }

    extractHeadings(parsedContent.root.children)
    return headings
  } catch (error) {
    console.error('Error extracting table of contents:', error)
    return []
  }
}

/**
 * Calculate reading statistics from Lexical JSON content
 * @param {string|object} content - Lexical editor state (JSON string or object)
 * @returns {Object} Reading stats with { wordCount, readingTime, characterCount }
 */
export const calculateReadingStats = (content) => {
  try {
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content

    if (!parsedContent?.root?.children) {
      return { wordCount: 0, readingTime: 0, characterCount: 0 }
    }

    // Extract all text content recursively
    const extractText = (nodes) => {
      let text = ''
      nodes.forEach((node) => {
        if (node.type === 'text' && node.text) {
          text += node.text + ' '
        }
        if (node.children) {
          text += extractText(node.children)
        }
      })
      return text
    }

    const totalContent = extractText(parsedContent.root.children)
    const wordCount = totalContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
    const readingTime = Math.ceil(wordCount / 200) // 200 words per minute

    return {
      wordCount,
      readingTime,
      characterCount: totalContent.length
    }
  } catch (error) {
    console.error('Error calculating reading stats:', error)
    return { wordCount: 0, readingTime: 0, characterCount: 0 }
  }
}

/**
 * Check if Lexical content is empty
 * @param {string|object} content - Lexical editor state
 * @returns {boolean} True if content is empty or only contains empty paragraphs
 */
export const isContentEmpty = (content) => {
  try {
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content

    if (!parsedContent?.root?.children || parsedContent.root.children.length === 0) {
      return true
    }

    // Check if all nodes are empty paragraphs
    const hasContent = parsedContent.root.children.some((node) => {
      if (node.type === 'paragraph') {
        return node.children?.some((child) => child.text && child.text.trim().length > 0)
      }
      return true // Non-paragraph nodes count as content
    })

    return !hasContent
  } catch (error) {
    return true
  }
}
