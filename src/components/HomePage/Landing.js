import React from 'react'
import { Box, Container } from '@mui/joy'
import Hero from './landing/Hero'
import Loop from './landing/Loop'
import Ledger from './landing/Ledger'
import Note from './landing/Note'
import StudyCenterFrame from './frames/StudyCenterFrame'
import PhoneFrame from './frames/PhoneFrame'
import BookFrame from './frames/BookFrame'
import CardFrame from './frames/CardFrame'
import YearFrame from './frames/YearFrame'

/**
 * The public landing (docs/prd-public-site.md, ADR-035).
 *
 * One column on the shared Container, one left edge, sections in the product's
 * own order: the hero, the loop, the ledger (`#library`), the note. The
 * pictures are the product drawn from its own tokens (`./frames`), so they wear
 * the visitor's mode and accent and never go stale. Pricing (`#pricing`)
 * arrives with SITE-003.
 */
const Landing = () => (
  <Box sx={{ bgcolor: 'background.body' }}>
    <Container maxWidth='lg'>
      <Hero frame={<StudyCenterFrame />} phoneFrame={<PhoneFrame />} />
      <Loop
        frames={{
          read: <BookFrame />,
          cards: <CardFrame answered={false} />,
          study: <CardFrame />,
          plan: <YearFrame />
        }}
      />
      <Ledger />
      <Note />
    </Container>
  </Box>
)

export default Landing
