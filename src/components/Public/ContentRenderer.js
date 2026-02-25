import React from 'react'
import { Box, Typography } from '@mui/joy'

/**
 * Renders Lexical editor JSON content as readable HTML
 * Respects design guidelines: NO background colors on text elements
 */
const ContentRenderer = ({ content, maxHeight = 'none' }) => {
  // Parse content if it's a string
  let parsedContent
  try {
    parsedContent = typeof content === 'string' ? JSON.parse(content) : content
    console.log('ContentRenderer - parsed content:', parsedContent)
  } catch (error) {
    console.error('Failed to parse content:', error)
    return (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        Content preview not available
      </Typography>
    )
  }

  // Handle different content structures
  if (!parsedContent) {
    return (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        No content available
      </Typography>
    )
  }

  // Check if content has root.children structure (Lexical format)
  if (!parsedContent.root || !parsedContent.root.children || parsedContent.root.children.length === 0) {
    console.warn('Content does not have root.children structure:', parsedContent)

    // Try to render as plain text if it's just a string
    if (typeof parsedContent === 'string') {
      return (
        <Typography level='body-md' sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
          {parsedContent}
        </Typography>
      )
    }

    return (
      <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
        Content structure not recognized
      </Typography>
    )
  }

  const renderNode = (node, index = 0) => {
    if (!node) return null

    // Text node
    if (node.type === 'text') {
      let text = node.text || ''
      let sx = {}

      // Apply formatting (WITHOUT background colors)
      if (node.format) {
        if (node.format & 1) sx.fontWeight = 'bold' // Bold
        if (node.format & 2) sx.fontStyle = 'italic' // Italic
        if (node.format & 8) sx.textDecoration = 'underline' // Underline
        if (node.format & 16) sx.textDecoration = 'line-through' // Strikethrough
        if (node.format & 32) sx.fontFamily = 'monospace' // Code
      }

      return (
        <Box key={index} component='span' sx={sx}>
          {text}
        </Box>
      )
    }

    // Paragraph
    if (node.type === 'paragraph') {
      return (
        <Typography key={index} level='body-md' sx={{ mb: 2, color: 'text.primary' }}>
          {node.children?.map((child, i) => renderNode(child, i))}
        </Typography>
      )
    }

    // Headings
    if (node.type === 'heading') {
      const levelMap = {
        h1: 'h2',
        h2: 'h3',
        h3: 'h4',
        h4: 'title-lg',
        h5: 'title-md',
        h6: 'title-sm'
      }
      const level = levelMap[node.tag] || 'h4'

      return (
        <Typography key={index} level={level} sx={{ mb: 2, mt: 3, fontWeight: 600, color: 'text.primary' }}>
          {node.children?.map((child, i) => renderNode(child, i))}
        </Typography>
      )
    }

    // List (ordered/unordered)
    if (node.type === 'list') {
      const Component = node.listType === 'number' ? 'ol' : 'ul'
      return (
        <Box
          key={index}
          component={Component}
          sx={{
            mb: 2,
            pl: 3,
            '& li': {
              mb: 0.5,
              color: 'text.primary'
            }
          }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // List item
    if (node.type === 'listitem') {
      return (
        <Box key={index} component='li'>
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // Quote
    if (node.type === 'quote') {
      return (
        <Box
          key={index}
          sx={{
            borderLeft: '4px solid',
            borderColor: 'primary.outlinedBorder',
            pl: 2,
            py: 1,
            mb: 2,
            fontStyle: 'italic',
            color: 'text.secondary'
          }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // Code block
    if (node.type === 'code') {
      return (
        <Box
          key={index}
          component='pre'
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 'sm',
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: 'text.primary'
          }}
        >
          <Box component='code'>{node.children?.map((child, i) => (child.text ? child.text : ''))}</Box>
        </Box>
      )
    }

    // Link
    if (node.type === 'link') {
      return (
        <Box
          key={index}
          component='a'
          href={node.url}
          target='_blank'
          rel='noopener noreferrer'
          sx={{
            color: 'primary.solidBg',
            textDecoration: 'underline',
            '&:hover': {
              color: 'primary.solidHoverBg'
            }
          }}
        >
          {node.children?.map((child, i) => renderNode(child, i))}
        </Box>
      )
    }

    // Horizontal rule
    if (node.type === 'horizontalrule') {
      return <Box key={index} component='hr' sx={{ my: 3, border: 'none', borderTop: '1px solid', borderColor: 'divider' }} />
    }

    // Fallback: render children if they exist
    if (node.children) {
      return <React.Fragment key={index}>{node.children.map((child, i) => renderNode(child, i))}</React.Fragment>
    }

    return null
  }

  return (
    <Box
      sx={{
        maxHeight,
        overflow: 'auto',
        '& > *:first-of-type': {
          mt: 0
        },
        '& > *:last-child': {
          mb: 0
        }
      }}
    >
      {parsedContent?.root?.children?.map((node, index) => renderNode(node, index))}
    </Box>
  )
}

export default ContentRenderer
