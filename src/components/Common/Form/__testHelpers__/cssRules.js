/**
 * Reading `sx` back out in jsdom.
 *
 * Emotion inserts rules through the CSSOM rather than as style-tag text, so
 * `style.textContent` is empty and `getComputedStyle` silently drops anything
 * jsdom cannot parse — which includes the two units this form system depends
 * on, `dvh` and `env()`. document.styleSheets is the only place they survive.
 *
 * Lives outside `__tests__/` on purpose: CRA treats every file under that
 * directory as a suite, and a helper with no tests in it fails the run.
 */

/** Every inserted rule, with whitespace after the colon normalised away. */
export const injectedCss = () => {
  let css = ''
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      css += `${Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n')}\n`
    } catch (error) {
      /* a cross-origin sheet cannot be read; there are none in jsdom */
    }
  })
  return css.replace(/:\s+/g, ':')
}

/**
 * Rules matching the classes actually on `node`.
 *
 * Emotion's rules accumulate for the whole file, so a global search can pass on
 * a rule an earlier test left behind. Every style assertion should scope.
 */
export const cssFor = (node) => {
  const selectors = Array.from(node.classList).map((name) => `.${name}`)
  return injectedCss()
    .split('\n')
    .filter((rule) => selectors.some((selector) => rule.includes(selector)))
    .join('\n')
}
