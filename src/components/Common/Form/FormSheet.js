import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Drawer, IconButton, Modal, ModalDialog, Tooltip, Typography } from '@mui/joy'
import { Close as CloseIcon } from '@mui/icons-material'

import useIsMobile from '../../../hooks/useIsMobile'
import { focusRing, sheetInlinePadding } from './formStyles'

/**
 * FormSheet — the one shell every creation and edit surface renders inside.
 *
 * A bottom sheet at `xs`, a centred dialog from `sm` up (UX-CONTRACT §4.2).
 * Seven surfaces hand-rolled this and got it wrong in the same three ways: the
 * dialog was centred and padded at the breakpoint with the least horizontal
 * space, its height was tied to `vh` — which does not shrink when the on-screen
 * keyboard opens — and the primary action was the last child of a scrolling
 * body, so a user had to scroll past every field to reach Save and then scroll
 * again once the keyboard appeared.
 *
 * The fix is layout, not JavaScript. The content is a flex column; the body is
 * `flex: 1; minHeight: 0; overflowY: auto`; the footer is a flex *sibling* of
 * the body rather than its last child, so it cannot scroll away. `100dvh`
 * tracks the visual viewport, so the sheet shrinks with the keyboard and the
 * footer rides up with it. VisualViewport listeners, scroll-on-focus handlers
 * and `position: fixed` footers are all explicitly rejected (§4.3): they are
 * fragile across iOS and Android and unnecessary once the layout is right.
 *
 * Owns no form state. Joy's Drawer and Modal own the focus trap, Escape, and
 * focus restoration — none of the three is hand-rolled (§8.6).
 */

/** §4.6 — three widths keyed to variant, replacing the five that shipped. */
const WIDTHS = { simple: 560, standard: 700, wide: 900 }

const FormSheet = ({
  open,
  onClose,
  titleKey,
  titleValues,
  // For a sheet whose heading is the object's own name rather than copy —
  // deck settings is titled by the deck. A node, not a string, so a surface
  // that fetches on open can put its Skeleton where the name will land.
  titleText = null,
  subtitleKey = null,
  width = 'standard',
  footer = null,
  banner = null,
  headerAccessory = null,
  ariaLabelledBy,
  children
}) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const generatedId = useId()
  const titleId = ariaLabelledBy || `form-sheet-title-${generatedId}`
  const maxWidth = WIDTHS[width] || WIDTHS.standard

  const content = (
    <>
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          px: sheetInlinePadding,
          py: { xs: 2, md: 3 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.level1'
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} level='h4' sx={{ m: 0 }}>
            {titleText || (titleKey ? t(titleKey, titleValues) : null)}
          </Typography>
          {subtitleKey && (
            <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
              {t(subtitleKey)}
            </Typography>
          )}
        </Box>

        {headerAccessory}

        {/* A visible Close control, never a grab handle alone — NN/g's swipe
            ambiguity. It sits in the header's flex row rather than floating as
            a ModalClose so it cannot overlap the title at 375px, and the header
            never scrolls, so it can never become unreachable. */}
        <Tooltip title={t('common.close')}>
          <IconButton
            aria-label={t('common.close')}
            onClick={onClose}
            variant='plain'
            color='neutral'
            sx={{ flexShrink: 0, minWidth: 44, minHeight: 44, ...focusRing }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: sheetInlinePadding, py: { xs: 2, md: 3 } }}>{children}</Box>

      {/* Between body and footer: an error the user must act on belongs inside
          the sheet, not behind its scrim in a Snackbar that hides after 4s. */}
      {banner && <Box sx={{ flexShrink: 0, px: sheetInlinePadding, pb: 2 }}>{banner}</Box>}

      {footer && (
        <Box
          sx={{
            flexShrink: 0,
            px: sheetInlinePadding,
            pt: { xs: 2, md: 3 },
            // env() resolves to 0 without a home indicator, so one rule covers
            // both device classes and the footer never sits under the bar.
            pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', md: 'calc(24px + env(safe-area-inset-bottom))' },
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface'
          }}
        >
          {footer}
        </Box>
      )}
    </>
  )

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        anchor='bottom'
        size='lg'
        slotProps={{
          content: {
            'aria-labelledby': titleId,
            sx: {
              // dvh, never vh: vh keeps its pre-keyboard height and pushes the
              // primary action underneath the keyboard (§4.2).
              height: '100dvh',
              width: '100vw',
              borderRadius: 0,
              border: 'none',
              bgcolor: 'background.surface',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        {content}
      </Drawer>
    )
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        aria-labelledby={titleId}
        sx={{
          width: { sm: '90%', md: '85%', lg: maxWidth },
          maxWidth,
          // `auto` lets the shell shrink to a collapsed form instead of
          // reserving space for a state it is usually not in.
          height: 'auto',
          maxHeight: '90vh',
          p: 0,
          m: 'auto',
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'lg',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {content}
      </ModalDialog>
    </Modal>
  )
}

export default FormSheet
