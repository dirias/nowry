import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Box, Container } from '@mui/joy'
import Hero from './landing/Hero'
import Loop from './landing/Loop'
import Ledger from './landing/Ledger'
import Pricing from './landing/Pricing'
import Note from './landing/Note'
import StudyCenterFrame from './frames/StudyCenterFrame'
import PhoneFrame from './frames/PhoneFrame'
import SectionFrame from './frames/SectionFrame'
import MakeCardsFrame from './frames/MakeCardsFrame'
import CardFrame from './frames/CardFrame'
import YearFrame from './frames/YearFrame'

/**
 * The public landing (docs/prd-public-site.md, ADR-035).
 *
 * One column on the shared Container, one left edge, sections in the product's
 * own order: the hero, the loop, the ledger (`#library`), the note. The
 * pictures are the product drawn beside its own components (`./frames`,
 * ADR-035 §1 as amended), so they wear the visitor's mode and accent, match
 * the screens element for element, and never go stale. Pricing (`#pricing`)
 * reads the same tier table as `/plans`.
 */
const Landing = () => {
  const { hash } = useLocation()

  // "Pricing" in the header and footer is `/#pricing`. The browser scrolls to a
  // hash on a full load; a client-side navigation to the same route does not.
  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <Box sx={{ bgcolor: 'background.body' }}>
      <Container maxWidth='lg'>
        <Hero frame={<StudyCenterFrame />} phoneFrame={<PhoneFrame />} />
        <Loop
          frames={{
            read: <SectionFrame />,
            cards: <MakeCardsFrame />,
            study: <CardFrame />,
            plan: <YearFrame />
          }}
        />
        <Ledger />
        <Pricing />
        <Note />
      </Container>
    </Box>
  )
}

export default Landing
