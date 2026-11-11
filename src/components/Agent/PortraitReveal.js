import React from 'react'
import { Box } from '@mui/joy'
import { resolveColor } from '@nowry/core/utils/petColor'
import { useThemePreferences } from '../../theme/DynamicThemeProvider'
import { CompanionArt } from './CompanionArt'
import EvolutionReveal, { FRAME_PX } from './EvolutionReveal'

/**
 * The reveal for a portrait (ADR-075 §4, EVO-013): the full sequence after a
 * new one is generated, the short one when one already made is put on.
 *
 * Both of its forms belong to one stage, so the two sides are told apart by
 * `side`. A side with no portrait — the first one a companion ever gets has
 * nothing before it — is the default line's form for that stage, in the
 * learner's accent.
 *
 * It is opened only with what the server answered: `reveal` carries the URLs
 * and the count from the response, and this component reads them and changes
 * nothing.
 */
const PortraitReveal = ({ reveal, onClose }) => {
  const { themeColor } = useThemePreferences()
  if (!reveal) return null
  const { kind, stage, fromUrl, toUrl, generationsRemaining } = reveal

  const renderForm = (formStage, side) => {
    const url = side === 'from' ? fromUrl : toUrl
    if (!url) return <CompanionArt stage={formStage} accent={resolveColor(themeColor, formStage)} size={FRAME_PX} />
    return (
      <Box
        component='img'
        src={url}
        alt=''
        data-portrait-side={side}
        sx={{ width: FRAME_PX, height: FRAME_PX, borderRadius: 'full', objectFit: 'cover', display: 'block' }}
      />
    )
  }

  return (
    <EvolutionReveal
      kind={kind}
      fromStage={stage}
      toStage={stage}
      generationsRemaining={generationsRemaining}
      renderForm={renderForm}
      onClose={onClose}
    />
  )
}

export default PortraitReveal
