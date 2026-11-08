/**
 * MEDIA-002: the upload's rules, without an editor (docs/prd-editor-media.md FR-002).
 */
import { displaySize, failureKeyFor, refusalFor, MAX_UPLOAD_MB } from '../imageUploadRules'

const file = (type = 'image/png', mb = 0.5, name = 'cell.png') => ({ type, size: mb * 1024 * 1024, name })

describe('refusalFor', () => {
  it('refuses before the document exists, so an image always has a home', () => {
    expect(refusalFor(file(), null)).toEqual({ key: 'notSaved' })
  })

  it('refuses nothing, a type the API would refuse, and a file past the cap', () => {
    expect(refusalFor(null, 'b1')).toEqual({ key: 'noFile' })
    expect(refusalFor(file('image/heic'), 'b1')).toEqual({ key: 'unsupported' })
    expect(refusalFor(file('image/png', MAX_UPLOAD_MB + 1), 'b1')).toEqual({
      key: 'tooLarge',
      values: { size: (MAX_UPLOAD_MB + 1).toFixed(2), limit: MAX_UPLOAD_MB }
    })
  })

  it('accepts the four types under the cap', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
      expect(refusalFor(file(type), 'b1')).toBeNull()
    }
  })
})

describe('displaySize', () => {
  it('caps a wide image by width and keeps its ratio', () => {
    expect(displaySize(1200, 600)).toEqual({ width: 500, height: 250 })
  })

  it('caps a tall image by height and keeps its ratio', () => {
    expect(displaySize(600, 1200)).toEqual({ width: 200, height: 400 })
  })

  it('holds a square-ish image to the smaller square', () => {
    expect(displaySize(1000, 1000)).toEqual({ width: 300, height: 300 })
    expect(displaySize(1000, 950)).toEqual({ width: 300, height: 300 })
  })

  it('leaves a small image alone', () => {
    expect(displaySize(320, 200)).toEqual({ width: 320, height: 200 })
  })
})

describe('failureKeyFor', () => {
  const withStatus = (status, detail) => ({ response: { status, data: { detail } } })

  it("names the plan's limit so the editor can offer the upgrade", () => {
    expect(failureKeyFor(withStatus(402, { code: 'image_limit_reached' }))).toEqual({ key: 'limitReached', limit: true })
    expect(failureKeyFor(withStatus(400, 'image_limit_reached'))).toEqual({ key: 'limitReached', limit: true })
  })

  it("reads the API's size and type refusals", () => {
    expect(failureKeyFor(withStatus(413), 2.5)).toEqual({ key: 'tooLarge', values: { size: '2.50', limit: MAX_UPLOAD_MB } })
    expect(failureKeyFor(withStatus(415))).toEqual({ key: 'unsupported' })
  })

  it('reads anything else, including no response at all, as a plain failure', () => {
    expect(failureKeyFor(withStatus(500, 'Upload failed: boom'))).toEqual({ key: 'failed' })
    expect(failureKeyFor(new Error('network'))).toEqual({ key: 'failed' })
  })
})
