import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND } from 'lexical'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  Sheet,
  IconButton,
  Divider,
  ListDivider,
  Stack,
  Box,
  Chip,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Tooltip,
  Input,
  Typography,
  CircularProgress
} from '@mui/joy'
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded'
import LockIcon from '@mui/icons-material/Lock'
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Sparkles,
  StickyNote,
  ScrollText,
  Image as ImageIcon,
  Wand2,
  Check,
  X,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  Quote as QuoteIcon,
  Code2,
  Info,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  Square,
  Volume2,
  Copy,
  MessageSquarePlus
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'
import { useAuth } from '../../context/AuthContext'

/**
 * Reading Mode action classification.
 *
 * An action is available in Reading Mode **iff its handler never writes to the
 * open Lexical document**. Output into the document → Editing only. Output
 * anywhere else (a deck, a modal, an audio stream, the clipboard) → available
 * in Reading too.
 *
 * Fail-closed: any action missing from this map resolves to 'document' via
 * `writesToDocument()` and is hidden in reading mode.
 *
 * Exported so `Editor.handleOptionClick` can apply the same rule as a second
 * line of defense behind the render guard.
 */
export const ACTION_WRITES = {
  // Overflow ("More") AI actions
  expand_with_ai: 'document', // uses selection.insertText
  generate_diagram: 'document', // inserts a mermaid code node into the document
  create_questionnaire: 'external',
  create_visual_content: 'external', // opens VisualizerModal → cardsService.create({ card_type: 'visual' })
  extract_vocabulary: 'external',
  add_comment: 'external', // opens CommentComposer → commentsService.create(), never touches the document
  // Toolbar controls (sibling const to the aiOptions `writes` fields)
  create_study_card: 'external',
  tts: 'external',
  copy: 'external'
}

/** Fail-closed classification helper. Unknown action → treated as document-writing. */
export const writesToDocument = (action) => ACTION_WRITES[action] !== 'external'

// Backend clips TTS input at 5000 UTF-8 bytes (Nowry-API/app/routers/tts.py).
// Warn a little before that so multi-byte scripts are covered too.
const TTS_TRUNCATION_HINT_CHARS = 4500

// How long the Copy control shows its "Copied" confirmation before reverting.
const COPY_FEEDBACK_MS = 1500

const focusRingSx = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.outlinedBorder',
    outlineOffset: '2px'
  }
}

const TextMenu = forwardRef(
  (
    {
      onOptionClick,
      style,
      activeFormats = {},
      onLinkEdit,
      currentBlockType = 'paragraph',
      onBlockTypeChange,
      illustrationCount = 0, // from EditorHome → Editor → FloatingToolbarPlugin (book-specific data)
      ttsState = 'idle',
      onMicClick,
      mode = 'edit',
      layout = 'floating',
      selectedText = '',
      onError
    },
    ref
  ) => {
    const [editor] = useLexicalComposerContext()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { tier } = useSubscription()
    const { openUpgradeModal } = useSubscriptionContext()
    const { isAuthenticated } = useAuth()
    const [isEditingLink, setIsEditingLink] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const [copied, setCopied] = useState(false)
    const copyTimeoutRef = useRef(null)
    const inputRef = useRef(null)

    const isReading = mode !== 'edit'
    const isBar = layout === 'bar'
    // Anonymous visitor on a public book: Card advertises the feature but routes
    // to the existing sign-up flow instead of generating.
    const isAnonymousGuest = mode === 'read-guest' && !isAuthenticated

    useEffect(() => {
      return () => clearTimeout(copyTimeoutRef.current)
    }, [])

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(selectedText)
        setCopied(true)
        clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
      } catch {
        onError?.(t('editor.actions.copyFailed'))
      }
    }, [selectedText, onError, t])

    // Left/right arrow navigation across the reading toolbar's controls.
    const handleToolbarKeyDown = useCallback((event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const items = Array.from(event.currentTarget.querySelectorAll('button:not([disabled])'))
      if (items.length === 0) return
      event.preventDefault()
      const current = items.indexOf(document.activeElement)
      if (current === -1) {
        items[0].focus()
        return
      }
      const delta = event.key === 'ArrowRight' ? 1 : -1
      items[(current + delta + items.length) % items.length].focus()
    }, [])

    // Taps/clicks on a control must not blur the document and collapse the
    // selection before onClick runs — the handler would receive empty text.
    //
    // This is NOT reading-mode-only. Most actions read the `selectedText` prop
    // (a React snapshot taken from the *Lexical* selection, which survives a
    // DOM blur), so they tolerate a collapsed native selection. But two actions
    // re-read `window.getSelection()` live inside their click handler — Copy,
    // and `add_comment` (CommentAnchorPlugin.openComposerForSelection captures
    // the DOM Range there to build the comment anchor). For those, a pointerdown
    // that reaches the browser collapses the selection before onClick fires and
    // the action silently no-ops. Hence the AI menu keeps this guard in every
    // mode. Verified: without it `getSelection().isCollapsed === true` by the
    // time the MenuItem's onClick runs; with it the Range survives intact.
    const keepSelection = (event) => event.preventDefault()

    // Mobile bar sticks above the soft keyboard / collapsing browser chrome.
    // Same visualViewport approach as MobileBottomActionStrip.
    const [bottomOffset, setBottomOffset] = useState(0)
    useEffect(() => {
      if (!isBar || !window.visualViewport) return undefined
      const handleViewportResize = () => {
        const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
        setBottomOffset(Math.max(0, offset))
      }
      handleViewportResize()
      window.visualViewport.addEventListener('resize', handleViewportResize)
      window.visualViewport.addEventListener('scroll', handleViewportResize)
      return () => {
        window.visualViewport.removeEventListener('resize', handleViewportResize)
        window.visualViewport.removeEventListener('scroll', handleViewportResize)
      }
    }, [isBar])

    const toggleFormat = (format) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
    }

    const toggleLink = () => {
      setIsEditingLink(true)
      onLinkEdit?.(true)
    }

    const confirmLink = () => {
      if (linkUrl) {
        // Basic URL validation/prefixing
        let finalUrl = linkUrl.trim()
        if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl
        }
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: finalUrl })
      }
      setIsEditingLink(false)
      setLinkUrl('')
      onLinkEdit?.(false)
    }

    const cancelLink = () => {
      setIsEditingLink(false)
      setLinkUrl('')
      onLinkEdit?.(false)
    }

    const isDiagramLocked = tier === 'free' && illustrationCount >= 2

    const aiOptions = [
      {
        label: t('comments.addNote'),
        value: 'add_comment',
        icon: <MessageSquarePlus size={15} />,
        writes: ACTION_WRITES.add_comment
      },
      {
        label: t('editor.ai.expand', 'Expand with AI'),
        value: 'expand_with_ai',
        icon: <Sparkles size={15} />,
        writes: ACTION_WRITES.expand_with_ai
      },
      {
        label: t('editor.ai.generateDiagram'),
        value: 'generate_diagram',
        icon: <AccountTreeRoundedIcon sx={{ fontSize: 15 }} />,
        locked: isDiagramLocked,
        writes: ACTION_WRITES.generate_diagram
      },
      {
        label: t('editor.ai.questionnaire', 'Questionnaire'),
        value: 'create_questionnaire',
        icon: <ScrollText size={15} />,
        writes: ACTION_WRITES.create_questionnaire
      },
      {
        label: t('editor.ai.visual', 'Imagine scene'),
        value: 'create_visual_content',
        icon: <ImageIcon size={15} />,
        writes: ACTION_WRITES.create_visual_content
      },
      {
        label: t('editor.ai.vocabulary', 'Extract vocabulary'),
        value: 'extract_vocabulary',
        icon: <Wand2 size={15} />,
        writes: ACTION_WRITES.extract_vocabulary
      }
    ]

    // Fail-closed: an entry without `writes: 'external'` never reaches reading mode.
    const visibleAiOptions = isReading ? aiOptions.filter((option) => option.writes === 'external') : aiOptions

    const BLOCK_TYPES = [
      { key: 'paragraph', label: t('editor.blockTypes.paragraph', 'Text'), icon: Type, shortLabel: 'Text' },
      { key: 'h1', label: t('editor.blockTypes.h1', 'Heading 1'), icon: Heading1, shortLabel: 'H1' },
      { key: 'h2', label: t('editor.blockTypes.h2', 'Heading 2'), icon: Heading2, shortLabel: 'H2' },
      { key: 'h3', label: t('editor.blockTypes.h3', 'Heading 3'), icon: Heading3, shortLabel: 'H3' },
      { key: 'bullet', label: t('editor.blockTypes.bullet', 'Bullet list'), icon: ListIcon, shortLabel: 'List' },
      { key: 'number', label: t('editor.blockTypes.number', 'Numbered list'), icon: ListOrdered, shortLabel: '1. List' },
      { key: 'quote', label: t('editor.blockTypes.quote', 'Quote'), icon: QuoteIcon, shortLabel: 'Quote' },
      { key: 'code', label: t('editor.blockTypes.code', 'Code block'), icon: Code2, shortLabel: 'Code' },
      { key: 'note', label: t('editor.blockTypes.note', 'Note callout'), icon: Info, shortLabel: 'Note' },
      { key: 'tip', label: t('editor.blockTypes.tip', 'Tip callout'), icon: Lightbulb, shortLabel: 'Tip' },
      { key: 'warning', label: t('editor.blockTypes.warning', 'Warning callout'), icon: AlertTriangle, shortLabel: 'Warning' }
    ]

    const currentBlockConfig = BLOCK_TYPES.find((b) => b.key === currentBlockType) ?? {
      icon: Type,
      shortLabel: currentBlockType === 'mixed' ? t('editor.blockTypes.mixed', 'Mixed') : 'Text'
    }
    const CurrentBlockIcon = currentBlockConfig.icon

    // ── Listen (TTS) ────────────────────────────────────────────────────────
    // State table shared verbatim by both modes:
    //   idle    → Volume2 16 / plain+neutral / enabled
    //   loading → CircularProgress 16 / plain+neutral / disabled
    //   playing → Square 16 / soft+primary  / enabled
    const isTtsLocked = tier === 'free'
    const ttsTooltip = isTtsLocked
      ? t('aiMagic.tts.lockedTooltip')
      : ttsState === 'idle'
        ? selectedText.length > TTS_TRUNCATION_HINT_CHARS
          ? `${t('aiMagic.tts.playSelectionTooltip')} — ${t('aiMagic.tts.truncatedHint')}`
          : t('aiMagic.tts.playSelectionTooltip')
        : t('aiMagic.tts.stopSelectionTooltip')
    const ttsAriaLabel = isTtsLocked
      ? t('aiMagic.tts.lockedAriaLabel')
      : ttsState === 'idle'
        ? t('aiMagic.tts.playSelectionAriaLabel')
        : ttsState === 'loading'
          ? t('aiMagic.tts.loadingAriaLabel')
          : t('aiMagic.tts.stopSelectionAriaLabel')

    const renderListenControl = () => (
      <Tooltip title={ttsTooltip} variant='soft' size='sm'>
        <IconButton
          size='sm'
          variant={ttsState === 'playing' ? 'soft' : 'plain'}
          color={ttsState === 'playing' ? 'primary' : 'neutral'}
          disabled={ttsState === 'loading'}
          onPointerDown={isReading ? keepSelection : undefined}
          onClick={() => {
            // A disabled control teaches nothing — stay enabled and sell the upgrade.
            if (isTtsLocked) {
              openUpgradeModal(t('upgrade.headlines.tts'))
              return
            }
            onMicClick?.()
          }}
          aria-label={ttsAriaLabel}
          sx={focusRingSx}
        >
          {ttsState === 'loading' ? (
            <CircularProgress size='sm' sx={{ '--CircularProgress-size': '16px' }} />
          ) : ttsState === 'playing' ? (
            <Square size={16} />
          ) : (
            <Volume2 size={16} />
          )}
        </IconButton>
      </Tooltip>
    )

    // ── Card ────────────────────────────────────────────────────────────────
    // The only emphasized control: free-tier-capable and the onboarding moment.
    const renderCardControl = () => (
      <Tooltip
        title={isAnonymousGuest ? t('editor.mode.signInToUse') : t('editor.ai.createCardHint', 'Generate study cards from this selection')}
        variant='soft'
        size='sm'
      >
        <IconButton
          size='sm'
          variant='soft'
          color='primary'
          onPointerDown={isReading ? keepSelection : undefined}
          onClick={() => {
            if (isAnonymousGuest) {
              navigate('/register')
              return
            }
            onOptionClick('create_study_card')
          }}
          aria-label={t('editor.ai.card', 'Card')}
          sx={{
            borderRadius: 'sm',
            gap: 0.5,
            px: 1,
            fontWeight: 600,
            fontSize: '0.75rem',
            minWidth: 'auto',
            ...(isReading ? focusRingSx : {})
          }}
        >
          <StickyNote size={14} />
          <Typography level='body-xs' sx={{ fontWeight: 600, color: 'inherit' }}>
            {t('editor.ai.card', 'Card')}
          </Typography>
        </IconButton>
      </Tooltip>
    )

    // ── More (secondary AI actions) ─────────────────────────────────────────
    const renderMoreDropdown = () => (
      <Dropdown>
        <Tooltip title={t('editor.ai.more', 'More AI actions')} variant='soft' size='sm'>
          <MenuButton
            size='sm'
            variant='plain'
            color='neutral'
            aria-label={t('editor.ai.more', 'More AI actions')}
            onPointerDown={keepSelection}
            sx={{ minWidth: 28, px: 0.5, ...(isReading ? focusRingSx : {}) }}
          >
            <Sparkles size={15} />
          </MenuButton>
        </Tooltip>
        <Menu
          placement={isBar ? 'top-start' : 'bottom-start'}
          size='sm'
          sx={{
            zIndex: 10000,
            borderRadius: 'md',
            boxShadow: 'md',
            '--ListItem-radius': '4px',
            minWidth: 180
          }}
        >
          {visibleAiOptions.map((option) => (
            <MenuItem
              key={option.value}
              onPointerDown={keepSelection}
              onClick={() => (option.locked ? openUpgradeModal(t('upgrade.headlines.illustrations')) : onOptionClick(option.value))}
            >
              <Box component='span' sx={{ display: 'flex', color: option.locked ? 'text.secondary' : 'primary.plainColor' }}>
                {option.locked ? <LockIcon style={{ width: 15 }} /> : option.icon}
              </Box>
              <Box sx={{ ml: 1 }}>{option.label}</Box>
              {option.locked && (
                <Chip size='sm' color='warning' variant='soft' sx={{ ml: 'auto', fontSize: '0.65rem' }}>
                  {t('plans.plus')}
                </Chip>
              )}
            </MenuItem>
          ))}
        </Menu>
      </Dropdown>
    )

    // ── Copy ────────────────────────────────────────────────────────────────
    // Fallback for the native context-menu copy that Editor.handleRightClick
    // suppresses via preventDefault() on a non-empty selection.
    const renderCopyControl = () => (
      <Tooltip title={copied ? t('editor.actions.copied') : t('editor.actions.copy')} variant='soft' size='sm'>
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          onPointerDown={keepSelection}
          onClick={handleCopy}
          aria-label={t('editor.actions.copyAriaLabel')}
          sx={focusRingSx}
        >
          <Copy size={16} />
        </IconButton>
      </Tooltip>
    )

    // ── Reading Mode surface ────────────────────────────────────────────────
    // Only `writes: 'external'` controls: Listen · Card · More · Copy. The
    // B/I/U/Link cluster and "Turn into" are omitted entirely (not disabled) —
    // their absence is the mode signal, so no badge/chip/tint is needed.
    if (isReading) {
      // Listen stays hidden for public readers for now. The backend restriction
      // has since been lifted — POST /book/{book_id}/tts (Nowry-API/app/routers/tts.py)
      // now accepts public books for non-owners — but shipping the guest surface
      // without its own quota/abuse story is the riskier half. Deleting this one
      // gate is all that's needed to turn it on.
      const showListen = mode !== 'read-guest'

      return (
        <Sheet
          ref={ref}
          variant={isBar ? 'outlined' : 'elevated'}
          role='toolbar'
          aria-label={t('editor.mode.toolbarAriaLabel')}
          onKeyDown={handleToolbarKeyDown}
          sx={
            isBar
              ? {
                  // Mobile: a fixed bottom bar, never anchored to the selection rect —
                  // the OS callout (Copy / Look Up / Share) owns the space above it.
                  position: 'fixed',
                  bottom: bottomOffset,
                  left: 0,
                  right: 0,
                  zIndex: 150,
                  display: { xs: 'flex', md: 'none' },
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.75,
                  pb: 'calc(0.75 * var(--joy-spacing) + env(safe-area-inset-bottom))',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderRadius: 0,
                  bgcolor: 'background.surface',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }
              : {
                  // Desktop: identical geometry to the editing toolbar.
                  position: 'fixed',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  p: 0.5,
                  borderRadius: 'xl',
                  boxShadow: 'xl',
                  border: '1px solid',
                  borderColor: 'neutral.outlinedBorder',
                  bgcolor: 'background.surface',
                  backdropFilter: 'blur(8px)',
                  height: 38,
                  userSelect: 'none',
                  touchAction: 'manipulation',
                  ...style
                }
          }
        >
          <Stack direction='row' spacing={0.5} sx={{ flex: isBar ? 1 : 'none', alignItems: 'center', maxHeight: 56, px: isBar ? 0 : 0.5 }}>
            {showListen && renderListenControl()}
            {/* A vertical Joy Divider has no intrinsic height; in the bar the row
                is not height-constrained, so give it one — as MobileBottomActionStrip does. */}
            {showListen && <Divider orientation='vertical' sx={{ mx: 0.5, ...(isBar ? { height: 20 } : {}) }} />}
            {renderCardControl()}
            <Divider orientation='vertical' sx={{ mx: 0.5, ...(isBar ? { height: 20 } : {}) }} />
            {renderMoreDropdown()}
            {renderCopyControl()}
          </Stack>
        </Sheet>
      )
    }

    return (
      <Sheet
        ref={ref}
        variant='elevated'
        sx={{
          position: 'fixed',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 0.5,
          borderRadius: 'xl',
          boxShadow: 'xl',
          border: '1px solid',
          borderColor: 'neutral.outlinedBorder',
          bgcolor: 'background.surface',
          backdropFilter: 'blur(8px)',
          height: 38,
          ...style
        }}
      >
        {isEditingLink ? (
          <Stack direction='row' spacing={0.5} sx={{ px: 1, width: '100%', alignItems: 'center' }}>
            <Input
              autoFocus
              size='sm'
              variant='plain'
              placeholder={t('editor.format.linkPlaceholder', 'Paste or type a link…')}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmLink()
                if (e.key === 'Escape') cancelLink()
              }}
              sx={{
                minWidth: 180,
                '--Input-focusedHighlight': 'transparent',
                '&:hover': { bgcolor: 'transparent' },
                fontSize: 'xs'
              }}
            />
            <IconButton size='sm' variant='soft' color='primary' onClick={confirmLink}>
              <Check size={16} />
            </IconButton>
            <IconButton size='sm' variant='plain' color='neutral' onClick={cancelLink}>
              <X size={16} />
            </IconButton>
          </Stack>
        ) : (
          <>
            <Dropdown>
              <Tooltip title={t('editor.format.turnInto', 'Turn into')} variant='soft' size='sm'>
                <MenuButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t('editor.format.turnInto', 'Turn into')}
                  sx={{
                    fontSize: 'xs',
                    fontWeight: 500,
                    px: 1,
                    height: 28,
                    gap: 0.25,
                    borderRadius: 'sm',
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': { bgcolor: 'background.level1', color: 'text.primary' }
                  }}
                >
                  <CurrentBlockIcon size={13} />
                  <span style={{ marginLeft: 3 }}>{currentBlockConfig.shortLabel}</span>
                  <ChevronDown size={11} style={{ marginLeft: 1 }} />
                </MenuButton>
              </Tooltip>
              <Menu
                placement='bottom-start'
                size='sm'
                sx={{ zIndex: 10000, minWidth: 180, borderRadius: 'md', boxShadow: 'md', '--ListItem-radius': '4px' }}
              >
                {BLOCK_TYPES.map((type, idx) => {
                  const Icon = type.icon
                  const showDivider = idx === 8 // before 'note'
                  return (
                    <React.Fragment key={type.key}>
                      {showDivider && <ListDivider />}
                      <MenuItem selected={type.key === currentBlockType} onClick={() => onBlockTypeChange?.(type.key)} sx={{ gap: 1 }}>
                        <Icon size={14} />
                        {type.label}
                      </MenuItem>
                    </React.Fragment>
                  )
                })}
              </Menu>
            </Dropdown>
            <Divider orientation='vertical' sx={{ mx: 0.5 }} />
            <Stack direction='row' spacing={0.5} sx={{ px: 0.5 }}>
              <Tooltip title={t('editor.format.bold', 'Bold')} variant='soft' size='sm'>
                <IconButton
                  size='sm'
                  variant={activeFormats.bold ? 'soft' : 'plain'}
                  color={activeFormats.bold ? 'primary' : 'neutral'}
                  onClick={() => toggleFormat('bold')}
                >
                  <Bold size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('editor.format.italic', 'Italic')} variant='soft' size='sm'>
                <IconButton
                  size='sm'
                  variant={activeFormats.italic ? 'soft' : 'plain'}
                  color={activeFormats.italic ? 'primary' : 'neutral'}
                  onClick={() => toggleFormat('italic')}
                >
                  <Italic size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('editor.format.underline', 'Underline')} variant='soft' size='sm'>
                <IconButton
                  size='sm'
                  variant={activeFormats.underline ? 'soft' : 'plain'}
                  color={activeFormats.underline ? 'primary' : 'neutral'}
                  onClick={() => toggleFormat('underline')}
                >
                  <Underline size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('editor.format.link', 'Link')} variant='soft' size='sm'>
                <IconButton size='sm' variant='plain' color='neutral' onClick={toggleLink}>
                  <LinkIcon size={16} />
                </IconButton>
              </Tooltip>

              {renderListenControl()}
            </Stack>

            <Divider orientation='vertical' sx={{ mx: 0.5 }} />

            {/* Create Card — primary action, always visible */}
            {renderCardControl()}

            <Divider orientation='vertical' sx={{ mx: 0.5 }} />

            {/* Secondary AI actions — icon-only overflow */}
            {renderMoreDropdown()}
          </>
        )}
      </Sheet>
    )
  }
)

TextMenu.displayName = 'TextMenu'

export default TextMenu
