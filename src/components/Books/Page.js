// Literata — the reading serif, loaded lazily and NOT on the critical path.
//
// Importing it here rather than globally means the ~90% of sessions that never
// open a reading surface never pay for it. The @font-face declarations carry
// unicode-range subsets, so the browser fetches a .woff2 only once a glyph is
// actually rendered in the face — which happens exactly when a surface opts in
// through the `readingSurface` fragment (Common/Form/formStyles.js).
//
// Scope is hard: long-form prose only, never below 1rem, and never UI chrome.
// A serif at 14px on a low-DPI Android reads worse than Inter, and that is the
// specific way this choice fails.
import '@fontsource-variable/literata'

import React, { useState, useEffect } from 'react'
import Editor from './Editor'

export default function Book() {
  return (
    <div>
      <div>Content</div>
      <div>Number</div>
    </div>
  )
}
