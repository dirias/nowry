/**
 * A companion reply as prose and example rows (CHAT-004, ADR-055 §5).
 *
 * The same blocks the phone draws: example sentences arrive tagged
 * (`[[EX|sentence|reading|translation]]`), `parseReply` in @nowry/core reads
 * them, and each becomes a row with its reading, its translation and Listen.
 * Prose keeps the web's markdown.
 */
import React from 'react'
import { Box, Typography } from '@mui/joy'
import { parseReply } from '@nowry/core/domain/agentChat'
import PetMarkdown from './PetMarkdown'
import TTSControls from '../TTS/TTSControls'

export function ExampleRow({ example, hint = null, action = null }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography level='body-md' sx={{ color: 'text.primary' }}>
          {example.sentence}
        </Typography>
        {example.reading ? (
          <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
            {example.reading}
          </Typography>
        ) : null}
        {example.translation ? (
          <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
            {example.translation}
          </Typography>
        ) : null}
        {action}
      </Box>
      <TTSControls text={example.sentence} compact langHint={hint} />
    </Box>
  )
}

export default function ReplyBlocks({ content, hint = null, renderAction = null }) {
  return parseReply(content).map((block, index) =>
    block.type === 'example' ? (
      <ExampleRow key={index} example={block} hint={hint} action={renderAction ? renderAction(block) : null} />
    ) : (
      <PetMarkdown key={index} content={block.text} />
    )
  )
}
