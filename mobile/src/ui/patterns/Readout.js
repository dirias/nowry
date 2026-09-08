/**
 * Readout — a count, as text (ADR-021 §3).
 *
 * Never a Chip and never a semantic colour. A chip is the shape of a control,
 * so a count in one asks to be pressed; a red count tells the user they did
 * something wrong when all that happened is that three cards are due.
 *
 * Tabular figures, so a column of numbers does not shimmer as it updates.
 * The one load-bearing number on a surface lifts to `text.primary`; every other
 * readout stays `text.tertiary`.
 */
import { Typography } from '../Typography'

export function Readout({ children, leading = false, style, ...rest }) {
  return (
    <Typography
      level='body-sm'
      color={leading ? 'text.primary' : 'text.tertiary'}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
      {...rest}
    >
      {children}
    </Typography>
  )
}

export default Readout
