import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

/**
 * Renders Mermaid source to sanitized SVG, and reports which of three states
 * the diagram is in (CARDS.md §7.4, §9).
 *
 * Lives in a hook rather than inside the preview pane because at `xs` the
 * preview is a tab, and the tab *label* has to show whether the diagram
 * renders while the user is looking at the code. A status that only exists
 * while the pane is mounted could not do that.
 *
 * The syntax channel is separate from the save channel by construction:
 * nothing here can produce the sheet's error banner, and a draft that does not
 * yet render stays savable. `VisualCardModal` held both in one `error` string,
 * which is why a Mermaid mistake and a failed POST looked identical.
 */

const DEBOUNCE_MS = 300

let renderCount = 0

/** mermaid keeps a global config, so the theme is re-applied per render pass. */
const configure = (dark) => {
  mermaid.initialize({
    startOnLoad: false,
    // 'neutral' on a dark page is near-black ink on a near-black surface. The
    // shipped modal used it unconditionally.
    theme: dark ? 'dark' : 'neutral',
    securityLevel: 'loose'
  })
}

/**
 * Joy stamps the resolved scheme on <html>. Read from there rather than from
 * `useColorScheme`, which throws outside a CssVarsProvider — the preview would
 * otherwise be the one card body that cannot be rendered on its own.
 */
const readDark = () => document.documentElement.getAttribute('data-joy-color-scheme') === 'dark'

const useIsDarkTheme = () => {
  const [dark, setDark] = useState(readDark)

  useEffect(() => {
    if (typeof MutationObserver !== 'function') return undefined
    const observer = new MutationObserver(() => setDark(readDark()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-joy-color-scheme'] })
    return () => observer.disconnect()
  }, [])

  return dark
}

const useMermaidPreview = (code) => {
  const dark = useIsDarkTheme()
  const [state, setState] = useState({ svg: '', message: '', status: 'idle' })
  // A render in flight must not overwrite the result of a later keystroke.
  const generation = useRef(0)

  useEffect(() => {
    const source = String(code || '').trim()
    generation.current += 1
    const mine = generation.current

    if (!source) {
      setState({ svg: '', message: '', status: 'idle' })
      return undefined
    }

    const timer = setTimeout(async () => {
      const id = `mermaid-card-preview-${(renderCount += 1)}`
      try {
        configure(dark)
        const { svg } = await mermaid.render(id, source)
        if (generation.current !== mine) return
        setState({ svg: DOMPurify.sanitize(svg), message: '', status: 'ok' })
      } catch (error) {
        // mermaid leaves its scratch node behind when parsing throws.
        document.getElementById(id)?.remove()
        document.getElementById(`d${id}`)?.remove()
        if (generation.current !== mine) return
        // The previous SVG is kept, not shown: the pane never flashes empty
        // mid-keystroke, and a fixed diagram replaces it without a gap.
        setState((previous) => ({ svg: previous.svg, message: error?.message || '', status: 'error' }))
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [code, dark])

  return state
}

export default useMermaidPreview
