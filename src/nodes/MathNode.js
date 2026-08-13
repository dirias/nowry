import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DecoratorNode,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
  KEY_BACKSPACE_COMMAND
} from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { mergeRegister } from '@lexical/utils'
import { useTranslation } from 'react-i18next'
import { Box, IconButton, Input, Tooltip } from '@mui/joy'
import { Trash2 } from 'lucide-react'
import katex from 'katex'
import DOMPurify from 'dompurify'

// KaTeX emits MathML alongside its HTML output (output: 'htmlAndMathml') so
// screen readers and copy/paste get real math semantics. DOMPurify's default
// profile strips MathML tags as an XSS precaution, so we explicitly allow the
// small set KaTeX actually produces — mirrors the allowance MermaidRenderer.js
// makes for Mermaid's own generated <style> block.
const KATEX_SANITIZE_OPTIONS = {
  ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'mfrac', 'msup', 'msub', 'annotation'],
  ADD_ATTR: ['xmlns']
}

// With throwOnError:false, KaTeX almost never throws for a parse error (e.g.
// "\notarealcommand", unbalanced "\left(") — instead it renders the offending
// span inline using its hardcoded default errorColor ('#cc0000') rather than
// raising. That's how we detect a parse error in practice; we then show our
// own themed danger chip instead of injecting KaTeX's non-theme-aware red
// text (which would also violate the no-hardcoded-hex design rule). Note this
// is a heuristic: a deliberate `\color{#cc0000}{...}` would false-positive,
// an acceptable tradeoff for book content that doesn't hand-pick equation colors.
const KATEX_ERROR_COLOR_MARKER = '#cc0000'

/**
 * Renders LaTeX to sanitized HTML. Shared by MathComponent (live editing) and
 * MathNode.exportDOM (headless export via $generateHtmlFromNodes) so both
 * paths render identically — mirrors MermaidRenderer.js's
 * render -> sanitize -> inject flow. KaTeX render is synchronous CPU work,
 * so there is never a loading state here.
 *
 * Note: syntactically valid-but-empty input like "\frac{}{}" is not an error
 * to KaTeX (empty groups are legal) — it renders as a visually blank
 * fraction, which is correct, non-crashing behavior, not a bug.
 */
export function renderMathHtml(latex) {
  try {
    const raw = katex.renderToString(latex, { throwOnError: false, output: 'htmlAndMathml' })
    if (raw.includes(KATEX_ERROR_COLOR_MARKER)) {
      return { html: '', error: true }
    }
    return { html: DOMPurify.sanitize(raw, KATEX_SANITIZE_OPTIONS), error: false }
  } catch (e) {
    return { html: '', error: true }
  }
}

function MathComponent({ latex, nodeKey }) {
  const { t } = useTranslation()
  const [editor] = useLexicalComposerContext()
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)
  // A freshly inserted node (via slash command) starts empty and should open
  // straight into edit mode, autofocused.
  const [isEditing, setIsEditing] = useState(latex === '')
  const [draft, setDraft] = useState(latex)
  const wrapperRef = useRef(null)
  const isEditable = editor.isEditable()
  const { html, error } = useMemo(() => renderMathHtml(latex), [latex])

  useEffect(() => {
    setDraft(latex)
  }, [latex])

  const commit = useCallback(
    (value) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isMathNode(node)) {
          node.setLatex(value)
        }
      })
      setIsEditing(false)
    },
    [editor, nodeKey]
  )

  const onDelete = useCallback(
    (payload) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        payload.preventDefault()
        const node = $getNodeByKey(nodeKey)
        if ($isMathNode(node)) {
          node.remove()
          return true
        }
      }
      return false
    },
    [isSelected, nodeKey]
  )

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          if (!editor.isEditable()) return false
          if (wrapperRef.current && (event.target === wrapperRef.current || wrapperRef.current.contains(event.target))) {
            clearSelection()
            setSelected(true)
            setIsEditing(true)
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW)
    )
  }, [clearSelection, editor, onDelete, setSelected])

  const handleDelete = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isMathNode(node)) {
        node.remove()
      }
    })
  }

  // Empty or Editing state — same inline Input, difference is only whether
  // it starts prefilled with the existing latex source.
  if (isEditing || latex === '') {
    return (
      <Input
        size='sm'
        variant='soft'
        autoFocus
        value={draft}
        placeholder={t('editor.math.sourcePlaceholder')}
        aria-label={t('editor.math.editAriaLabel')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(latex)
            setIsEditing(false)
          }
        }}
        onBlur={() => commit(draft)}
        sx={{
          display: 'inline-flex',
          minWidth: 80,
          fontFamily: 'monospace',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.outlinedBorder',
            outlineOffset: '2px'
          }
        }}
      />
    )
  }

  return (
    <Box component='span' sx={{ position: 'relative', display: 'inline-block' }}>
      {error ? (
        <Tooltip title={t('editor.math.invalidLatex')} variant='soft' color='danger'>
          <Box
            ref={wrapperRef}
            component='span'
            sx={{
              px: 0.5,
              borderRadius: 'sm',
              border: '1px dashed',
              borderColor: 'danger.outlinedBorder',
              bgcolor: 'danger.softBg',
              color: 'danger.plainColor',
              fontFamily: 'monospace',
              fontSize: 'sm',
              cursor: isEditable ? 'pointer' : 'default',
              outline: isSelected ? '2px solid' : 'none',
              outlineColor: 'primary.outlinedBorder',
              outlineOffset: '2px'
            }}
          >{`$${latex}$`}</Box>
        </Tooltip>
      ) : (
        <Box
          ref={wrapperRef}
          component='span'
          dangerouslySetInnerHTML={{ __html: html }}
          sx={{
            display: 'inline-block',
            px: 0.25,
            verticalAlign: 'middle',
            cursor: isEditable ? 'pointer' : 'default',
            borderRadius: 'sm',
            '&:hover': isEditable ? { bgcolor: 'background.level1' } : undefined,
            outline: isSelected ? '2px solid' : 'none',
            outlineColor: 'primary.outlinedBorder',
            outlineOffset: '2px'
          }}
        />
      )}
      {isSelected && isEditable && (
        <Tooltip title={t('editor.math.deleteAriaLabel')} variant='soft' color='danger'>
          <IconButton
            size='sm'
            variant='soft'
            color='danger'
            aria-label={t('editor.math.deleteAriaLabel')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDelete}
            sx={{
              position: 'absolute',
              top: -28,
              right: 0,
              zIndex: 10,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.outlinedBorder',
                outlineOffset: '2px'
              }
            }}
          >
            <Trash2 size={12} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export class MathNode extends DecoratorNode {
  constructor(latex, key) {
    super(key)
    this.__latex = latex ?? ''
  }

  static getType() {
    return 'math'
  }

  static clone(node) {
    return new MathNode(node.__latex, node.__key)
  }

  createDOM(config) {
    const span = document.createElement('span')
    span.style.display = 'inline-block'
    const theme = config.theme
    const className = theme.math
    if (className !== undefined) {
      span.className = className
    }
    return span
  }

  updateDOM() {
    return false
  }

  // Preserves math on export (Book export / TTS-safe HTML) so
  // $generateHtmlFromNodes produces a real rendered formula rather than the
  // raw "$...$" source.
  exportDOM() {
    const element = document.createElement('span')
    element.setAttribute('data-lexical-math', 'true')
    element.setAttribute('data-latex', this.__latex)
    const { html } = renderMathHtml(this.__latex)
    element.innerHTML = html
    return { element }
  }

  // Required so paste / fork / import round-trips preserve the LaTeX source
  // instead of dropping it (the rendered KaTeX markup alone can't be parsed
  // back into a latex string).
  static importDOM() {
    return {
      span: (domNode) => {
        if (!(domNode instanceof HTMLElement) || domNode.getAttribute('data-lexical-math') !== 'true') {
          return null
        }
        return {
          conversion: (element) => {
            const latex = element.getAttribute('data-latex') || ''
            return { node: $createMathNode(latex) }
          },
          priority: 1
        }
      }
    }
  }

  static importJSON(serializedNode) {
    return $createMathNode(serializedNode.latex)
  }

  exportJSON() {
    return {
      type: 'math',
      version: 1,
      latex: this.__latex
    }
  }

  decorate() {
    return <MathComponent latex={this.__latex} nodeKey={this.getKey()} />
  }

  setLatex(latex) {
    const writable = this.getWritable()
    writable.__latex = latex
  }

  getLatex() {
    return this.__latex
  }

  isInline() {
    return true
  }
}

export function $createMathNode(latex) {
  return new MathNode(latex)
}

export function $isMathNode(node) {
  return node instanceof MathNode
}
