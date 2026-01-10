import React, { forwardRef } from 'react'

import { Sheet, List, ListItem, ListItemDecorator, ListItemContent, Typography, Divider } from '@mui/joy'
import {
  StickyNote, // Create study card
  ScrollText, // Create questionnaire
  Wand2, // Generate related text (Magic)
  Copy, // Reproduce text
  Image as ImageIcon // Create visual support
} from 'lucide-react'

const TextMenu = forwardRef(({ onOptionClick, style }, ref) => {
  const options = [
    { label: 'Create Study Card', value: 'create_study_card', icon: <StickyNote size={18} /> },
    { label: 'Create Questionnaire', value: 'create_questionnaire', icon: <ScrollText size={18} /> },
    { label: 'Imagine Scene', value: 'create_visual_content', icon: <ImageIcon size={18} /> },
    { label: 'Extract Vocabulary (Pro)', value: 'extract_vocabulary', icon: <Wand2 size={18} /> }
    // { label: 'Reproduce text', value: 'reproduce_text', icon: <Copy size={18} /> },
  ]

  return (
    <Sheet
      ref={ref}
      variant='outlined'
      sx={{
        position: 'fixed', // Use fixed to avoid clipping by parent containers
        zIndex: 9999,
        minWidth: 220,
        boxShadow: 'lg',
        borderRadius: 'md',
        p: 0.5,
        ...style // Receives top/left from parent
      }}
    >
      <List size='sm' sx={{ '--ListItem-radius': '6px' }}>
        <ListItem>
          <Typography level='body-xs' fontWeight='lg' textColor='text.tertiary' sx={{ px: 1, py: 0.5 }}>
            AI ACTIONS
          </Typography>
        </ListItem>
        {options.map((option) => (
          <ListItem
            key={option.value}
            onClick={() => onOptionClick(option.value)}
            sx={{
              cursor: 'pointer',
              '&:hover': { bgcolor: 'background.level1' }
            }}
          >
            <ListItemDecorator>{option.icon}</ListItemDecorator>
            <ListItemContent>{option.label}</ListItemContent>
          </ListItem>
        ))}
      </List>
    </Sheet>
  )
})

// Explicitly set the display name for the component
TextMenu.displayName = 'TextMenu'

export default TextMenu
