/**
 * The reading pointer's write path (docs/prd-books-library.md D2 / FR-002).
 *
 * The editor learns where the reader is many times a second — every scroll
 * moves the active heading or the active page. The document needs to know it
 * about once, so changes coalesce into one patch that goes out `delay` ms after
 * the first change, and on `flush` (leaving the page). A patch identical to the
 * last one sent is not sent again.
 */
const same = (a, b) => a && b && Object.keys({ ...a, ...b }).every((k) => a[k] === b[k])

export function createPointerSaver(save, { delay = 5000 } = {}) {
  let pending = null
  let last = null
  let timer = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pending) return
    const patch = { ...(last || {}), ...pending }
    pending = null
    if (same(patch, last)) return
    last = patch
    save(patch)
  }

  const set = (patch) => {
    pending = { ...(pending || {}), ...patch }
    if (!timer) timer = setTimeout(flush, delay)
  }

  const dispose = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  return { set, flush, dispose }
}

export default createPointerSaver
