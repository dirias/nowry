import React, { forwardRef, useState, useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
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
  Typography
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
  ChevronDown
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '../../hooks/useSubscription'
import { useSubscriptionContext } from '../../context/SubscriptionContext'

const TextMenu = forwardRef(
  (
    {
      onOptionClick,
      style,
      activeFormats = {},
      onLinkEdit,
      currentBlockType = 'paragraph',
      onBlockTypeChange,
      illustrationCount = 0 // from EditorHome → Editor → FloatingToolbarPlugin (book-specific data)
    },
    ref
  ) => {
    const [editor] = useLexicalComposerContext()
    const { t } = useTranslation()
    const { tier } = useSubscription()
    const { openUpgradeModal } = useSubscriptionContext()
    const [isEditingLink, setIsEditingLink] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const inputRef = useRef(null)

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
      { label: t('editor.ai.expand', 'Expand with AI'), value: 'expand_with_ai', icon: <Sparkles size={15} /> },
      {
        label: t('editor.ai.generateDiagram'),
        value: 'generate_diagram',
        icon: <AccountTreeRoundedIcon sx={{ fontSize: 15 }} />,
        locked: isDiagramLocked
      },
      { label: t('editor.ai.questionnaire', 'Questionnaire'), value: 'create_questionnaire', icon: <ScrollText size={15} /> },
      { label: t('editor.ai.visual', 'Imagine scene'), value: 'create_visual_content', icon: <ImageIcon size={15} /> },
      { label: t('editor.ai.vocabulary', 'Extract vocabulary'), value: 'extract_vocabulary', icon: <Wand2 size={15} /> }
    ]

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
            </Stack>

            <Divider orientation='vertical' sx={{ mx: 0.5 }} />

            {/* Create Card — primary action, always visible */}
            <Tooltip title={t('editor.ai.createCardHint', 'Generate a study card from this selection')} variant='soft' size='sm'>
              <IconButton
                size='sm'
                variant='soft'
                color='primary'
                onClick={() => onOptionClick('create_study_card')}
                aria-label={t('editor.ai.card', 'Card')}
                sx={{
                  borderRadius: 'sm',
                  gap: 0.5,
                  px: 1,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  minWidth: 'auto'
                }}
              >
                <StickyNote size={14} />
                <Typography level='body-xs' sx={{ fontWeight: 600, color: 'inherit' }}>
                  {t('editor.ai.card', 'Card')}
                </Typography>
              </IconButton>
            </Tooltip>

            <Divider orientation='vertical' sx={{ mx: 0.5 }} />

            {/* Secondary AI actions — icon-only overflow */}
            <Dropdown>
              <Tooltip title={t('editor.ai.more', 'More AI actions')} variant='soft' size='sm'>
                <MenuButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  aria-label={t('editor.ai.more', 'More AI actions')}
                  sx={{ minWidth: 28, px: 0.5 }}
                >
                  <Sparkles size={15} />
                </MenuButton>
              </Tooltip>
              <Menu
                placement='bottom-start'
                size='sm'
                sx={{
                  zIndex: 10000,
                  borderRadius: 'md',
                  boxShadow: 'md',
                  '--ListItem-radius': '4px',
                  minWidth: 180
                }}
              >
                {aiOptions.map((option) => (
                  <MenuItem
                    key={option.value}
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
          </>
        )}
      </Sheet>
    )
  }
)

TextMenu.displayName = 'TextMenu'

export default TextMenu
