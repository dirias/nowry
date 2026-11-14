/**
 * The companion's six forms on the phone, in each stage's colour (EVO-018).
 *
 * The web recolours the painted forms in a canvas; the phone has none, so it
 * decodes the PNG itself and hands the pixels to the same shared rule
 * (`recolorArt`). What is checked here is that pure part: the colour each form
 * wears, the file it is kept in, and that the recolouring moves the body to
 * the accent and leaves everything else as painted.
 */
const fs = require('fs')
const path = require('path')
const UPNG = require('upng-js')
import { resolveColor } from '@nowry/core/utils/petColor'
import { stageConfig } from '@nowry/core/domain/petStages'
import { hexToOklch } from '@nowry/core/tokens/oklch'
import { artColor, artFileName, artShare, recolorPng, drawsAsDisc, DISC_FILL, COMPANION_ART_VERSION } from '../companionArt'

const ASSETS = path.join(__dirname, '..', '..', '..', '..', 'assets', 'companion')
const png = (stage) => new Uint8Array(fs.readFileSync(path.join(ASSETS, `stage-${stage}.png`)))
const pixels = (bytes) => {
  const image = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  return { width: image.width, height: image.height, data: new Uint8Array(UPNG.toRGBA8(image)[0]) }
}

describe('the forms the phone draws', () => {
  it('ships all six, square, with transparency', () => {
    for (const stage of [1, 2, 3, 4, 5, 6]) {
      const { width, height, data } = pixels(png(stage))
      expect([width, height]).toEqual([256, 256])
      expect(data[3]).toBe(0) // the corner is the transparent ground
    }
  })

  it("wears the stage's colour, shaded from the accent as the web shades it", () => {
    for (const stage of [1, 2, 3, 4, 5, 6]) expect(artColor('#3d8a94', stage)).toBe(resolveColor('#3d8a94', stage))
    expect(artColor('#3d8a94', 1)).not.toBe(artColor('#3d8a94', 6))
  })

  it("fills the stage's own share of its frame, as on the web", () => {
    for (const stage of [1, 2, 3, 4, 5, 6]) expect(artShare(stage)).toBe(stageConfig(stage).artFill)
  })

  it('keeps one file per stage and colour, renamed when the recolouring changes', () => {
    expect(artFileName(3, '#3D8A94')).toBe(`companion-v${COMPANION_ART_VERSION}-3-3d8a94.png`)
    expect(artFileName(3, '#3d8a94')).toBe(artFileName(3, '#3D8A94'))
    expect(artFileName(4, '#3d8a94')).not.toBe(artFileName(3, '#3d8a94'))
  })
})

describe('the smallest companion is a disc, not an orb (EVO-018, decided 2026-11-14)', () => {
  it("draws 24 px and under as the web's chat disc; every larger size keeps the orb and its rings", () => {
    expect(drawsAsDisc(24)).toBe(true)
    expect(drawsAsDisc(16)).toBe(true)
    for (const size of [25, 40, 44, 56, 132, 200]) expect(drawsAsDisc(size)).toBe(false)
    // No size given means the stage's own size, which is never that small.
    expect(drawsAsDisc(null)).toBe(false)
  })

  it("fills 90 % of the disc, as the web's CompanionArtDisc", () => {
    expect(DISC_FILL).toBe(0.9)
  })
})

describe('recolouring a form', () => {
  const hueOf = (r, g, b) => hexToOklch(`#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`).h

  it('moves the body to the accent and keeps the size, the ground and the painted details', () => {
    const before = pixels(png(4))
    const after = pixels(recolorPng(png(4), '#c0447a')) // a rose: far from the painted teal
    expect([after.width, after.height]).toEqual([before.width, before.height])

    let moved = 0
    let kept = 0
    for (let i = 0; i < before.data.length; i += 4) {
      expect(after.data[i + 3]).toBe(before.data[i + 3]) // transparency is never touched
      if (before.data[i + 3] < 40) continue
      const same = before.data[i] === after.data[i] && before.data[i + 1] === after.data[i + 1] && before.data[i + 2] === after.data[i + 2]
      if (same) kept++
      else moved++
    }
    expect(moved).toBeGreaterThan(1000) // the body
    expect(kept).toBeGreaterThan(1000) // the belly, the eyes, the gold

    // The most common moved pixel now sits near the rose's hue, not the teal's.
    const target = hexToOklch('#c0447a').h
    let near = 0
    let total = 0
    for (let i = 0; i < before.data.length; i += 4) {
      if (after.data[i + 3] < 40 || after.data[i] === before.data[i]) continue
      total++
      const h = hueOf(after.data[i], after.data[i + 1], after.data[i + 2])
      if (Math.abs(((h - target + 540) % 360) - 180) < 40) near++
    }
    expect(near / total).toBeGreaterThan(0.6)
  })

  it('returns a PNG', () => {
    const out = recolorPng(png(1), '#3d8a94')
    expect(Array.from(out.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
  })
})
