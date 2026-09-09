/** `mm:ss` for a whole number of seconds. Shared by the widget, the chip and the header. */
export const formatClock = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default formatClock
