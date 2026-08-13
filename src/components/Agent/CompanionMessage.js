/**
 * CompanionMessage
 *
 * A compact floating card rendered above the companion orb
 * when a proactive intervention is triggered during a study session.
 *
 * States handled:
 *   Loading  — two skeleton rows, no action row
 *   Success  — message text + "Tell me more" / dismiss actions
 *   Error    — handled upstream; this component never renders on error
 *   Empty    — AnimatePresence exit handles unmount animation
 */
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Box, Button, IconButton, Sheet, Skeleton, Stack, Typography } from '@mui/joy'
import { CloseRounded } from '@mui/icons-material'

const CompanionMessage = ({ message, isLoading, onDismiss, onTellMeMore }) => {
  const { t } = useTranslation()

  const isVisible = isLoading || !!message

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key='companion-message'
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
        >
          <Sheet
            variant='outlined'
            sx={{
              width: { xs: 240, sm: 280 },
              // Second-layer clamp — the StudyPet.js wrapper already limits this to
              // calc(100vw - 48px), but guard here too in case CompanionMessage is
              // ever rendered outside that wrapper.
              maxWidth: 'calc(100vw - 48px)',
              borderRadius: 'xl',
              boxShadow: 'lg',
              bgcolor: 'background.surface',
              border: '1px solid',
              borderColor: 'divider',
              p: 0,
              overflow: 'hidden'
            }}
          >
            {/* Message area */}
            <Box sx={{ p: 2 }}>
              <Skeleton loading={isLoading} variant='text' sx={{ width: '90%', mb: 0.5, animationDuration: '1.8s' }}>
                <Typography level='body-sm' sx={{ color: 'text.primary', lineHeight: 1.55 }}>
                  {message}
                </Typography>
              </Skeleton>
              <Skeleton loading={isLoading} variant='text' sx={{ width: '60%', animationDuration: '1.8s' }} />
            </Box>

            {/* Action row — only when not loading */}
            {!isLoading && (
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                sx={{
                  px: 1.5,
                  py: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.level1'
                }}
              >
                <Button
                  variant='plain'
                  color='neutral'
                  size='sm'
                  onClick={onTellMeMore}
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.outlinedBorder',
                      outlineOffset: '2px'
                    }
                  }}
                >
                  {t('agent.companion.tellMeMore')}
                </Button>
                <IconButton
                  aria-label={t('agent.companion.dismiss')}
                  variant='plain'
                  color='neutral'
                  size='sm'
                  onClick={onDismiss}
                  sx={{
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.outlinedBorder',
                      outlineOffset: '2px'
                    }
                  }}
                >
                  <CloseRounded sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )}
          </Sheet>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CompanionMessage
