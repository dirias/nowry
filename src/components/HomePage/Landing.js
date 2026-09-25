import React from 'react'
import { Box, Container } from '@mui/joy'
import Hero from './landing/Hero'
import Loop from './landing/Loop'
import Ledger from './landing/Ledger'
import Note from './landing/Note'

/**
 * The public landing (docs/prd-public-site.md, ADR-035).
 *
 * One column on the shared Container, one left edge, sections in the product's
 * own order: the hero, the loop, the ledger (`#library`), the note. Pricing
 * (`#pricing`) arrives with SITE-003 and the drawn product frames with SITE-002;
 * until then the frame slots hold a quiet ground of the right proportion.
 */
const FramePlaceholder = ({ ratio = '16 / 10' }) => (
  <Box aria-hidden sx={{ width: '100%', aspectRatio: ratio, borderRadius: 'lg', bgcolor: 'background.level1' }} />
)

const Landing = () => (
  <Box sx={{ bgcolor: 'background.body' }}>
    <Container maxWidth='lg'>
      <Hero frame={<FramePlaceholder />} />
      <Loop
        frames={{
          read: <FramePlaceholder ratio='4 / 3' />,
          cards: <FramePlaceholder ratio='4 / 3' />,
          study: <FramePlaceholder ratio='4 / 3' />,
          plan: <FramePlaceholder ratio='4 / 3' />
        }}
      />
      <Ledger />
      <Note />
    </Container>
  </Box>
)

export default Landing
