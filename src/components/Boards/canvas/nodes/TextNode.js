import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/joy'
import PlusHandles from '../PlusHandles'
import NodeTextEditor from './NodeTextEditor'
import { appear, selectedRing, wrapText } from './nodeStyles'

/** The three sizes a text block has (PRD D2), on the type scale. */
export const TEXT_LEVELS = { md: 'body-lg', lg: 'h3', xl: 'h2' }

/** A text block (T): a heading with no box (canvas board 2). */
function TextNode({ id, data, selected }) {
  const { t } = useTranslation()
  const { node, editing, fresh } = data
  const level = TEXT_LEVELS[node.size] ?? TEXT_LEVELS.lg

  return (
    <>
      <PlusHandles id={id} />
      <Box
        data-testid={`board-text-${id}`}
        sx={{
          width: node.w != null ? '100%' : 'max-content',
          minWidth: 120,
          maxWidth: node.w != null ? 'none' : 640,
          px: 0.5,
          borderRadius: 'sm',
          ...selectedRing(selected),
          ...(fresh ? appear : {})
        }}
      >
        <Typography level={level} component='div' sx={{ ...wrapText, color: node.text || editing ? 'text.primary' : 'text.tertiary' }}>
          {editing ? (
            <NodeTextEditor id={id} value={node.text} placeholder={t('boards.text.placeholder')} ariaLabel={t('boards.text.editAria')} />
          ) : (
            node.text || t('boards.text.placeholder')
          )}
        </Typography>
      </Box>
    </>
  )
}

export default memo(TextNode)
